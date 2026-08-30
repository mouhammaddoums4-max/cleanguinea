import { createHash } from 'node:crypto';

/**
 * Stockage des images - Cloudinary.
 *
 * L'application NE televerse PAS via notre serveur. Elle demande une signature,
 * puis envoie le fichier directement a Cloudinary. Deux raisons :
 *
 *   - les octets ne traversent pas Railway, dont la bande passante est limitee
 *     et facturee ; une photo de bac de 3 Mo par collecte y couterait cher ;
 *   - `api_secret` ne quitte jamais le serveur. Un televersement non signe
 *     depuis l'application exposerait le compte a n'importe qui decompilerait
 *     l'APK.
 *
 * La signature est valable quelques minutes et porte sur un dossier precis :
 * meme interceptee, elle ne permet pas de deposer n'importe ou.
 */

const BASE = 'https://api.cloudinary.com/v1_1';

/** Dossiers autorises. Un client ne choisit pas ou il ecrit. */
export const DOSSIERS = {
  profils: 'profils',
  collecteurs: 'collecteurs',
  collectes: 'collectes',
  bannieres: 'bannieres',
};

export function cloudinaryActif() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function racine() {
  return process.env.CLOUDINARY_DOSSIER || 'cleanguinea';
}

/**
 * Signature Cloudinary : SHA-1 des parametres tries, suivis du secret.
 * L'ordre alphabetique est impose par Cloudinary, pas par nous.
 */
function signer(parametres) {
  const chaine = Object.keys(parametres)
    .sort()
    .map((cle) => `${cle}=${parametres[cle]}`)
    .join('&');

  return createHash('sha1')
    .update(chaine + process.env.CLOUDINARY_API_SECRET)
    .digest('hex');
}

/**
 * Prepare un televersement direct.
 *
 * @param {string} dossier  Une cle de DOSSIERS
 * @param {string} prefixe  Identifiant metier, ex. l'id du collecteur
 */
export function preparerTeleversement(dossier, prefixe) {
  if (!cloudinaryActif()) {
    throw Object.assign(new Error('Stockage d images non configure'), { status: 503 });
  }
  if (!DOSSIERS[dossier]) {
    throw Object.assign(new Error(`Dossier inconnu : ${dossier}`), { status: 400 });
  }

  const horodatage = Math.floor(Date.now() / 1000);
  const chemin = `${racine()}/${DOSSIERS[dossier]}`;

  const parametres = {
    folder: chemin,
    timestamp: horodatage,
    // Nom stable : un nouveau televersement remplace l'ancien plutot que
    // d'accumuler des photos orphelines qu'on paierait indefiniment.
    public_id: `${prefixe}-${horodatage}`,
    // Redimensionnement a la reception : les telephones produisent des images
    // de 4 Mo dont l'application n'affiche jamais plus de 400 px.
    transformation: 'c_limit,w_1200,h_1200,q_auto:good',
  };

  return {
    url: `${BASE}/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    champs: {
      ...parametres,
      api_key: process.env.CLOUDINARY_API_KEY,
      signature: signer(parametres),
    },
    // Duree indicative pour l'appelant : Cloudinary refuse au-dela d'une heure.
    expireDansSecondes: 600,
  };
}

/**
 * Supprime une image.
 * Appele quand on remplace une photo : sans cela, chaque changement de photo
 * de profil laisserait un fichier facture derriere lui.
 */
export async function supprimerImage(publicId) {
  if (!cloudinaryActif() || !publicId) return { supprime: false };

  const horodatage = Math.floor(Date.now() / 1000);
  const signature = signer({ public_id: publicId, timestamp: horodatage });

  try {
    const reponse = await fetch(
      `${BASE}/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: publicId,
          timestamp: horodatage,
          api_key: process.env.CLOUDINARY_API_KEY,
          signature,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const corps = await reponse.json().catch(() => ({}));
    return { supprime: corps.result === 'ok', reponse: corps };
  } catch (err) {
    console.error('[cloudinary] suppression impossible', err.message);
    return { supprime: false, erreur: err.message };
  }
}

/**
 * Extrait le public_id d'une URL Cloudinary.
 * Sert a supprimer une image dont on ne connait que l'URL stockee en base.
 */
export function publicIdDepuisUrl(url) {
  if (!url) return null;
  // .../upload/v1234567890/cleanguinea/profils/abc-123.jpg
  const trouve = /\/upload\/(?:v\d+\/)?(.+)\.\w+$/.exec(url);
  return trouve ? trouve[1] : null;
}
