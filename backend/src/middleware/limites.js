import rateLimit from 'express-rate-limit';

/**
 * Limitation de debit.
 *
 * Sans elle, un mot de passe a six caracteres se trouve en quelques heures avec
 * un simple script : rien n'oblige un attaquant a passer par l'application, il
 * parle directement a l'API. C'est la premiere defense, avant toute mesure
 * prise du cote de l'APK — celui-ci est de toute facon entre les mains de qui
 * l'installe.
 *
 * Trois regimes, parce qu'un meme plafond ne peut pas convenir a tout :
 *
 *  - AUTH, tres serre. Personne ne se connecte vingt fois en un quart d'heure.
 *  - SYNC, large. Un collecteur qui retrouve le reseau apres une matinee hors
 *    couverture envoie une rafale legitime ; l'etrangler ferait perdre son
 *    travail.
 *  - GENERAL, moyen. Filet de securite sur le reste de l'API.
 *
 * Le comptage se fait par adresse IP. En Guinee, un quartier entier peut sortir
 * derriere la meme IP d'operateur : les plafonds sont donc calcules pour un
 * groupe, pas pour une personne seule. Le verrouillage de compte, lui, vise
 * l'individu — les deux sont complementaires.
 */

const reponse = (message) => ({
  handler: (_req, res) => res.status(429).json({ erreur: message }),
  standardHeaders: true,
  legacyHeaders: false,
});

/** Connexion, inscription, reinitialisation : les portes d'entree. */
export const limiteAuth = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  // Une tentative reussie ne compte pas : seuls les echecs consomment le quota,
  // pour ne pas punir un foyer nombreux qui partage une connexion.
  skipSuccessfulRequests: true,
  ...reponse('Trop de tentatives. Reessayez dans quinze minutes.'),
});

/** Envoi de SMS : chaque message coute, et le credit est limite. */
export const limiteSms = rateLimit({
  windowMs: 60 * 60_000,
  max: 10,
  ...reponse('Trop de demandes de code. Reessayez dans une heure.'),
});

/** Remontee des operations faites hors ligne. */
export const limiteSync = rateLimit({
  windowMs: 15 * 60_000,
  max: 300,
  ...reponse('Synchronisation trop frequente. Patientez quelques minutes.'),
});

/** Filet general sur le reste de l'API. */
export const limiteGenerale = rateLimit({
  windowMs: 15 * 60_000,
  max: 1000,
  ...reponse('Trop de requetes. Patientez quelques minutes.'),
});
