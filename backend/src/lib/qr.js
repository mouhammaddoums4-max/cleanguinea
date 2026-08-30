/**
 * Codes QR des bacs.
 *
 * Le QR colle sur un bac porte l'identifiant du client suivi du numero de bac :
 *
 *   CG-2026-000001-B1
 *   \____________/  \/
 *     code client    bac n°1
 *
 * Ce choix a une consequence pratique : le collecteur qui scanne SAIT chez qui
 * il se trouve, meme sans reseau. Un identifiant opaque l'aurait oblige a
 * interroger le serveur pour savoir a qui appartient le bac, ce qui rend la
 * collecte hors ligne impossible.
 *
 * Contrepartie assumee : le code est lisible. Il ne contient ni nom, ni
 * adresse, ni telephone — seulement une reference d'abonnement, qui ne sert a
 * rien sans le mot de passe du compte.
 */

const MOTIF = /^(CG-\d{4}-\d{6})-B(\d{1,2})$/i;

/** Construit le contenu du QR a imprimer. */
export function construireCodeQr(referenceAbonnement, numeroBac) {
  return `${referenceAbonnement.toUpperCase()}-B${numeroBac}`;
}

/**
 * Lit un code scanne.
 * Renvoie null si le format ne correspond pas : un QR etranger scanne par
 * erreur ne doit pas etre interprete comme un bac.
 */
export function lireCodeQr(brut) {
  const nettoye = String(brut ?? '').trim().toUpperCase();
  const trouve = MOTIF.exec(nettoye);
  if (!trouve) return null;

  return {
    codeQr: nettoye,
    referenceAbonnement: trouve[1],
    numeroBac: Number(trouve[2]),
  };
}

/** true si la chaine ressemble a un code de bac Senyi. */
export function estCodeQrValide(brut) {
  return lireCodeQr(brut) !== null;
}
