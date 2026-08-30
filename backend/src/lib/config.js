import { prisma } from './prisma.js';

/**
 * Configuration applicative, lue depuis la base.
 *
 * Rien de metier n'est code en dur ici : libelles, couleurs, taux, seuils et
 * plafonds vivent dans les tables CategorieConfig, TauxConversion, NiveauFidelite
 * et Parametre. Le back-office peut donc les modifier sans redeploiement.
 *
 * Les valeurs sont mises en cache quelques minutes : elles sont lues a chaque
 * collecte et a chaque calcul de points, mais changent tres rarement.
 */

const DUREE_CACHE_MS = 5 * 60 * 1000;

let cache = null;
let cacheExpireA = 0;

/** Force le rechargement au prochain acces. A appeler apres toute ecriture. */
export function inviderCacheConfig() {
  cache = null;
  cacheExpireA = 0;
}

function convertir(valeur, type) {
  switch (type) {
    case 'number':
      return Number(valeur);
    case 'boolean':
      return valeur === 'true' || valeur === '1';
    case 'json':
      try {
        return JSON.parse(valeur);
      } catch {
        return null;
      }
    default:
      return valeur;
  }
}

/**
 * Charge la configuration complete.
 * Si une table de referentiel est vide, on leve : c'est une base non initialisee,
 * et servir des valeurs implicites masquerait le probleme jusqu'en production.
 */
export async function chargerConfig() {
  if (cache && Date.now() < cacheExpireA) return cache;

  const [categories, taux, niveaux, parametres, offres, periodicites] = await Promise.all([
    prisma.categorieConfig.findMany({ where: { actif: true }, orderBy: { ordre: 'asc' } }),
    prisma.tauxConversion.findMany({ where: { actif: true }, orderBy: { ordre: 'asc' } }),
    prisma.niveauFidelite.findMany({ orderBy: { seuil: 'desc' } }),
    prisma.parametre.findMany(),
    prisma.offre.findMany({ where: { actif: true }, orderBy: { tarifMensuelGnf: 'asc' } }),
    prisma.tarifPeriodicite.findMany({ where: { actif: true }, orderBy: { ordre: 'asc' } }),
  ]);

  if (categories.length === 0 || niveaux.length === 0 || parametres.length === 0) {
    throw Object.assign(
      new Error(
        'Configuration absente en base. Lancez `npm run seed` (ou `npm run seed:config`).',
      ),
      { status: 503 },
    );
  }

  const params = {};
  for (const p of parametres) params[p.cle] = convertir(p.valeur, p.type);

  cache = { categories, taux, niveaux, parametres: params, offres, periodicites };
  cacheExpireA = Date.now() + DUREE_CACHE_MS;
  return cache;
}

/** Valeur d'un parametre scalaire. Leve si la cle est inconnue. */
export async function parametre(cle) {
  const { parametres } = await chargerConfig();
  if (!(cle in parametres)) {
    throw Object.assign(new Error(`Parametre inconnu : ${cle}`), { status: 500 });
  }
  return parametres[cle];
}

/** Configuration d'une categorie de dechet. */
export async function categorieConfig(code) {
  const { categories } = await chargerConfig();
  return categories.find((c) => c.code === code) ?? null;
}

/** Codes des categories comptees comme recyclables (quota et valorisation). */
export async function categoriesRecyclables() {
  const { categories } = await chargerConfig();
  return categories.filter((c) => c.recyclable).map((c) => c.code);
}

/** Niveau de fidelite correspondant a un cumul de points sur 12 mois. */
export async function niveauPour(cumule12Mois) {
  const { niveaux } = await chargerConfig();
  // niveaux est trie par seuil decroissant : le premier atteint est le bon.
  return niveaux.find((n) => cumule12Mois >= n.seuil) ?? niveaux[niveaux.length - 1];
}

/** Projette la configuration dans la langue demandee, pour les clients. */
export function traduire(config, langue = 'fr') {
  const l = langue === 'en' ? 'En' : 'Fr';

  return {
    categories: config.categories.map((c) => ({
      code: c.code,
      libelle: c[`libelle${l}`],
      couleur: c.couleur,
      couleurFond: c.couleurFond,
      icone: c.icone,
      recyclable: c.recyclable,
    })),
    conversions: config.taux.map((t) => ({
      type: t.type,
      libelle: t[`libelle${l}`],
      pointsPour1000Gnf: t.pointsPour1000Gnf,
      plafondMensuelGnf: t.plafondMensuelGnf,
      soldeMinimumPoints: t.soldeMinimumPoints,
    })),
    niveaux: config.niveaux.map((n) => ({
      code: n.code,
      libelle: n[`libelle${l}`],
      seuil: n.seuil,
      bonusPct: n.bonusPct,
    })),
    offres: config.offres.map((o) => ({
      id: o.id,
      type: o.type,
      libelle: o.libelle,
      tarifMensuelGnf: o.tarifMensuelGnf,
      passagesParSemaine: o.passagesParSemaine,
      nbBacsFournis: o.nbBacsFournis,
    })),
    periodicites: (config.periodicites ?? []).map((p) => ({
      code: p.periodicite,
      libelle: p[`libelle${l}`],
      mois: p.mois,
      remisePct: p.remisePct,
    })),
    parametres: config.parametres,
  };
}
