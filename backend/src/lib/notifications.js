import { prisma } from './prisma.js';
import { envoyerSms } from './sms.js';
import { parametre } from './config.js';

/**
 * Notifications : enregistrement, push Expo et SMS.
 *
 * Chaque notification est d'abord ECRITE en base, puis diffusee. L'ordre
 * compte : si le push echoue, l'utilisateur la retrouve quand meme dans
 * l'application. L'inverse laisserait un trou.
 *
 * Le SMS est reserve aux messages qui coutent cher a manquer : un impaye qui
 * suspend le service, un collecteur qui arrive. Le reste passe par le push,
 * gratuit. Le credit SMS est limite et doit servir a ce qui compte.
 */

const URL_EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

/** Expo refuse les lots de plus de 100 messages. */
const MAX_PAR_LOT = 100;

/**
 * Canal par defaut de chaque type.
 * Modifiable par utilisateur via PreferenceNotification.
 */
const CANAL_PAR_DEFAUT = {
  COLLECTE_PLANIFIEE: 'PUSH',
  COLLECTEUR_EN_ROUTE: 'PUSH',
  COLLECTE_TERMINEE: 'PUSH',
  POINTS_CREDITES: 'PUSH',
  // Un impaye suspend le service : il faut qu'il arrive, meme sans smartphone.
  PAIEMENT_DU: 'LES_DEUX',
  PAIEMENT_RECU: 'PUSH',
  ZONE_AFFECTEE: 'PUSH',
  INFORMATION: 'PUSH',
};

/** Types que l'utilisateur ne peut pas desactiver. */
const OBLIGATOIRES = new Set(['PAIEMENT_DU']);

function estJetonExpo(jeton) {
  return /^ExponentPushToken\[.+\]$/.test(jeton) || /^ExpoPushToken\[.+\]$/.test(jeton);
}

function parLots(liste, taille = MAX_PAR_LOT) {
  const lots = [];
  for (let i = 0; i < liste.length; i += taille) lots.push(liste.slice(i, i + taille));
  return lots;
}

/**
 * Envoie des messages au service push d'Expo.
 * Ne leve jamais : une notification perdue ne doit pas casser une collecte.
 */
async function envoyerPush(messages) {
  if (messages.length === 0) return { envoyes: 0 };

  let envoyes = 0;
  const jetonsInvalides = [];

  for (const lot of parLots(messages)) {
    try {
      const reponse = await fetch(URL_EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lot),
        signal: AbortSignal.timeout(15_000),
      });

      const { data } = await reponse.json().catch(() => ({ data: [] }));

      (data ?? []).forEach((resultat, i) => {
        if (resultat?.status === 'ok') {
          envoyes += 1;
          return;
        }
        // Expo signale les jetons revoques : on les desactive pour ne pas
        // reessayer indefiniment a chaque notification.
        if (resultat?.details?.error === 'DeviceNotRegistered') {
          jetonsInvalides.push(lot[i].to);
        }
      });
    } catch (err) {
      console.error('[push] envoi impossible', err.message);
    }
  }

  if (jetonsInvalides.length > 0) {
    await prisma.appareilPush
      .updateMany({ where: { jeton: { in: jetonsInvalides } }, data: { actif: false } })
      .catch(() => {});
  }

  return { envoyes, desactives: jetonsInvalides.length };
}

/** Canal effectif pour un utilisateur et un type, preferences comprises. */
async function canalPour(userId, type) {
  const defaut = CANAL_PAR_DEFAUT[type] ?? 'PUSH';
  if (OBLIGATOIRES.has(type)) return defaut;

  const pref = await prisma.preferenceNotification.findUnique({
    where: { userId_type: { userId, type } },
  });
  if (!pref) return defaut;

  if (!pref.push && !pref.sms) return null;
  if (pref.push && pref.sms) return 'LES_DEUX';
  return pref.push ? 'PUSH' : 'SMS';
}

/**
 * Notifie un utilisateur.
 *
 * @param {object} options
 * @param {string} options.userId
 * @param {string} options.type       Une valeur de TypeNotification
 * @param {string} options.titre
 * @param {string} options.message
 * @param {string} [options.lien]     Route de l'application a ouvrir
 * @param {object} [options.donnees]  Contexte libre
 * @param {string} [options.sms]      Texte du SMS, si different du message
 */
export async function notifier({ userId, type, titre, message, lien, donnees, sms }) {
  // 1. Toujours enregistrer : c'est la trace que l'utilisateur relira.
  const notification = await prisma.notification.create({
    data: { userId, type, titre, message, lien, donnees },
  });

  const canal = await canalPour(userId, type);
  if (!canal) return notification;

  const [utilisateur, appareils] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { telephone: true, langue: true, actif: true },
    }),
    canal === 'SMS'
      ? []
      : prisma.appareilPush.findMany({ where: { userId, actif: true }, select: { jeton: true } }),
  ]);

  if (!utilisateur?.actif) return notification;

  // 2. Push
  let envoyeePush = false;
  if (canal !== 'SMS' && appareils.length > 0) {
    const jetons = appareils.map((a) => a.jeton).filter(estJetonExpo);
    const { envoyes } = await envoyerPush(
      jetons.map((jeton) => ({
        to: jeton,
        title: titre,
        body: message,
        sound: 'default',
        data: { lien, type, ...donnees },
        channelId: 'default',
      })),
    );
    envoyeePush = envoyes > 0;
  }

  // 3. SMS, seulement si le canal le prevoit.
  let envoyeeSms = false;
  if (canal === 'SMS' || canal === 'LES_DEUX') {
    const resultat = await envoyerSms(utilisateur.telephone, sms ?? `${titre} : ${message}`);
    envoyeeSms = Boolean(resultat?.envoye);
  }

  return prisma.notification.update({
    where: { id: notification.id },
    data: { envoyeePush, envoyeeSms },
  });
}

/** Notifie plusieurs utilisateurs du meme message (campagne, information). */
export async function notifierPlusieurs(userIds, options) {
  const resultats = [];
  for (const userId of userIds) {
    resultats.push(await notifier({ ...options, userId }));
  }
  return resultats;
}

/**
 * Enregistre le jeton push d'un appareil.
 * Un jeton peut changer de proprietaire (telephone prete, revendu) : on le
 * rattache alors au nouvel utilisateur plutot que d'en creer un doublon.
 */
export async function enregistrerAppareil({ userId, jeton, plateforme, modele }) {
  if (!estJetonExpo(jeton)) {
    throw Object.assign(new Error('Jeton push invalide'), { status: 400 });
  }

  return prisma.appareilPush.upsert({
    where: { jeton },
    create: { userId, jeton, plateforme, modele },
    update: { userId, plateforme, modele, actif: true, vuLe: new Date() },
  });
}

/** Seuil, en jours, a partir duquel un impaye declenche un rappel. */
export const joursAvantSuspension = () => parametre('abonnement.joursAvantSuspension');
