import { randomInt } from 'node:crypto';

/**
 * Passerelle SMS - NimbaSMS (https://api.nimbasms.com)
 *
 * Sert a deux choses dans Clean Guinee :
 *   1. les codes OTP d'inscription et de connexion ;
 *   2. les notifications de passage, pour les clients sans smartphone.
 *
 * Contrat verifie contre l'API (OPTIONS /v1/messages) :
 *   POST /v1/messages
 *   Authorization: Basic base64(SERVICE_ID:SECRET_TOKEN)
 *   { sender_name: string (obligatoire, SENSIBLE A LA CASSE, <= 100),
 *     to: string[] (obligatoire, 1 a 30 numeros),
 *     message: string (<= 1071 caracteres, soit 7 SMS) }
 *
 * Formats de numero acceptes : 623XXXXXX, 224623XXXXXX, +224623XXXXXX.
 */

const BASE_URL = process.env.SMS_BASE_URL || 'https://api.nimbasms.com';
const ENDPOINT_MESSAGES = process.env.SMS_ENDPOINT || '/v1/messages';
const ENDPOINT_COMPTE = '/v1/accounts';
const SENDER = process.env.SMS_SENDER_ID || 'CleanGuinee';

/** Limites imposees par l'API. */
const MAX_DESTINATAIRES = 30;
const MAX_CARACTERES = 1071;

/** true si la passerelle est configuree. Sinon, on bascule en mode journal. */
export function smsActif() {
  return Boolean(process.env.SMS_API_KEY && process.env.SMS_API_SECRET);
}

function enteteAuth() {
  const jeton = Buffer.from(
    `${process.env.SMS_API_KEY}:${process.env.SMS_API_SECRET}`,
  ).toString('base64');
  return `Basic ${jeton}`;
}

/** Normalise vers 224XXXXXXXXX, l'un des formats acceptes par NimbaSMS. */
function normaliser(numero) {
  const chiffres = String(numero).replace(/\D/g, '');
  if (chiffres.startsWith('224')) return chiffres;
  return `224${chiffres.replace(/^0+/, '')}`;
}

/** Decoupe la liste en lots de 30, la limite par requete. */
function parLots(liste, taille = MAX_DESTINATAIRES) {
  const lots = [];
  for (let i = 0; i < liste.length; i += taille) lots.push(liste.slice(i, i + taille));
  return lots;
}

async function envoyerLot(destinataires, message) {
  const reponse = await fetch(`${BASE_URL}${ENDPOINT_MESSAGES}`, {
    method: 'POST',
    headers: {
      Authorization: enteteAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_name: SENDER,
      to: destinataires,
      message,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const corps = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    console.error(`[SMS] echec ${reponse.status}`, corps);
    return { envoye: false, statut: reponse.status, corps };
  }

  return { envoye: true, corps };
}

/**
 * Envoie un SMS a un ou plusieurs destinataires, par lots de 30.
 * Ne leve jamais : un echec d'envoi ne doit pas faire echouer la requete metier.
 */
export async function envoyerSms(destinataires, message) {
  const liste = [...new Set(
    (Array.isArray(destinataires) ? destinataires : [destinataires]).map(normaliser),
  )];

  if (liste.length === 0) return { envoye: false, erreur: 'Aucun destinataire' };

  // Au-dela de 1071 caracteres l'API rejette le message : on tronque proprement
  // plutot que de perdre l'envoi entier.
  let texte = message;
  if (texte.length > MAX_CARACTERES) {
    console.warn(`[SMS] message tronque : ${texte.length} > ${MAX_CARACTERES} caracteres`);
    texte = `${texte.slice(0, MAX_CARACTERES - 1)}…`;
  }

  if (!smsActif()) {
    // En developpement, on affiche le message au lieu de l'envoyer.
    console.log(`[SMS simule] -> ${liste.join(', ')} : ${texte}`);
    return { simule: true, destinataires: liste };
  }

  try {
    const resultats = [];
    for (const lot of parLots(liste)) {
      resultats.push(await envoyerLot(lot, texte));
    }

    return {
      envoye: resultats.every((r) => r.envoye),
      lots: resultats.length,
      destinataires: liste.length,
      resultats,
    };
  } catch (err) {
    console.error('[SMS] erreur reseau', err.message);
    return { envoye: false, erreur: err.message };
  }
}

/**
 * Solde du compte NimbaSMS.
 * A surveiller : sans credit, les OTP ne partent plus et personne ne peut s'inscrire.
 */
export async function soldeSms() {
  if (!smsActif()) return { simule: true, sms_balance: null };

  try {
    const reponse = await fetch(`${BASE_URL}${ENDPOINT_COMPTE}`, {
      headers: { Authorization: enteteAuth(), Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!reponse.ok) return { erreur: `HTTP ${reponse.status}` };

    const { balance, sms_balance } = await reponse.json();
    return { balance, sms_balance };
  } catch (err) {
    return { erreur: err.message };
  }
}

/** Noms d'expediteur valides sur le compte (statut "accepted"). */
export async function expediteursAutorises() {
  if (!smsActif()) return [];

  try {
    const reponse = await fetch(`${BASE_URL}/v1/sendernames`, {
      headers: { Authorization: enteteAuth(), Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!reponse.ok) return [];

    const { results } = await reponse.json();
    return (results ?? []).filter((s) => s.status === 'accepted').map((s) => s.name);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Messages types
// ---------------------------------------------------------------------------

export const modeles = {
  otp: (code) =>
    `Clean Guinee : votre code de verification est ${code}. Il expire dans 10 minutes. Ne le partagez avec personne.`,

  bienvenue: (nom) =>
    `Bienvenue ${nom} ! Votre abonnement Clean Guinee est actif. Du dechet a la valeur.`,

  passagePrevu: (date, creneau) =>
    `Clean Guinee : votre collecte est prevue le ${date} entre ${creneau}. Merci de sortir vos bacs.`,

  collecteurEnRoute: (collecteur, minutes) =>
    `Clean Guinee : ${collecteur} arrive dans environ ${minutes} minutes pour votre collecte.`,

  collecteTerminee: (poidsKg, points) =>
    `Clean Guinee : collecte terminee (${poidsKg} kg). Vous gagnez ${points} points Clean. Merci !`,

  rappelPaiement: (montant, jours) =>
    `Clean Guinee : votre abonnement de ${montant} GNF est du depuis ${jours} jours. Payez via Orange Money ou MTN MoMo pour eviter la suspension.`,
};

/**
 * Code numerique a 6 chiffres.
 * randomInt (et non Math.random) : un OTP devinable est un OTP inutile.
 */
export function genererOtp() {
  return String(randomInt(100000, 1000000));
}
