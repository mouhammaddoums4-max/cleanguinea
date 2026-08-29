import { randomInt } from 'node:crypto';

/**
 * Passerelle SMS - NimbaSMS (https://www.nimbasms.com/)
 *
 * Sert a deux choses dans Clean Guinee :
 *   1. les codes OTP d'inscription et de connexion ;
 *   2. les notifications de passage, pour les clients sans smartphone.
 *
 * A VERIFIER AVANT MISE EN PRODUCTION
 * L'URL, le schema d'authentification et le nom des champs ci-dessous suivent la
 * convention habituelle de NimbaSMS (Basic auth SERVICE_ID:SECRET_TOKEN, POST
 * /v1/messages avec { to, sender_name, message }). Ils sont tous surchargeables par
 * variable d'environnement : confirmez-les dans votre espace developpeur NimbaSMS
 * et ajustez SMS_BASE_URL / SMS_ENDPOINT si besoin, sans toucher au reste du code.
 */

const BASE_URL = process.env.SMS_BASE_URL || 'https://api.nimbasms.com';
const ENDPOINT = process.env.SMS_ENDPOINT || '/v1/messages';
const SENDER = process.env.SMS_SENDER_ID || 'CleanGuinee';

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

/** NimbaSMS attend des numeros au format international sans le "+". */
function normaliser(numero) {
  const chiffres = String(numero).replace(/\D/g, '');
  if (chiffres.startsWith('224')) return chiffres;
  return `224${chiffres.replace(/^0+/, '')}`;
}

/**
 * Envoie un SMS a un ou plusieurs destinataires.
 * Ne leve jamais : un echec d'envoi ne doit pas faire echouer la requete metier.
 */
export async function envoyerSms(destinataires, message) {
  const liste = (Array.isArray(destinataires) ? destinataires : [destinataires]).map(normaliser);

  if (!smsActif()) {
    // En developpement, on affiche le message au lieu de l'envoyer.
    console.log(`[SMS simule] -> ${liste.join(', ')} : ${message}`);
    return { simule: true, destinataires: liste };
  }

  try {
    const reponse = await fetch(`${BASE_URL}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        Authorization: enteteAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: liste,
        sender_name: SENDER,
        message,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const corps = await reponse.json().catch(() => ({}));

    if (!reponse.ok) {
      console.error(`[SMS] echec ${reponse.status}`, corps);
      return { envoye: false, statut: reponse.status, corps };
    }

    return { envoye: true, corps };
  } catch (err) {
    console.error('[SMS] erreur reseau', err.message);
    return { envoye: false, erreur: err.message };
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
