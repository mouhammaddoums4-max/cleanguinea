/**
 * Referentiels de configuration.
 *
 * Toutes les valeurs metier de l'application vivent ici puis en base : libelles
 * bilingues, couleurs, taux, seuils et plafonds. Rien n'est code en dur dans le
 * code applicatif.
 *
 * Ce fichier est idempotent (upsert) : il peut etre relance sans perdre les
 * reglages du back-office qu'il ne concerne pas.
 *
 *   npm run seed:config     ne touche qu'a la configuration
 *   npm run seed            base de demonstration complete (appelle celui-ci)
 */

export const CATEGORIES = [
  { code: 'PLASTIQUE', libelleFr: 'Plastiques', libelleEn: 'Plastics', couleur: '#2563EB', couleurFond: '#DBEAFE', icone: 'trash', recyclable: true, ordre: 1 },
  { code: 'METAL_FER', libelleFr: 'Métaux / Fer', libelleEn: 'Metals / Iron', couleur: '#F59E0B', couleurFond: '#FEF3C7', icone: 'trash', recyclable: true, ordre: 2 },
  { code: 'AUTRES', libelleFr: 'Autres déchets', libelleEn: 'Other waste', couleur: '#4B5563', couleurFond: '#F3F4F6', icone: 'trash', recyclable: false, ordre: 3 },
  { code: 'CARTON', libelleFr: 'Carton', libelleEn: 'Cardboard', couleur: '#16A34A', couleurFond: '#DCFCE7', icone: 'file-tray-full', recyclable: true, ordre: 4 },
  { code: 'VERRE', libelleFr: 'Verre', libelleEn: 'Glass', couleur: '#7C3AED', couleurFond: '#EDE9FE', icone: 'wine', recyclable: true, ordre: 5 },
  { code: 'ORGANIQUE', libelleFr: 'Déchets organiques', libelleEn: 'Organic waste', couleur: '#DC2626', couleurFond: '#FEE2E2', icone: 'leaf', recyclable: false, ordre: 6 },
  { code: 'REFUS', libelleFr: 'Refus de tri', libelleEn: 'Sorting residue', couleur: '#9CA3AF', couleurFond: '#F3F4F6', icone: 'close-circle', recyclable: false, ordre: 7 },
];

export const NIVEAUX = [
  { code: 'BRONZE', libelleFr: 'Bronze', libelleEn: 'Bronze', seuil: 0, bonusPct: 0, ordre: 1 },
  { code: 'ARGENT', libelleFr: 'Argent', libelleEn: 'Silver', seuil: 1500, bonusPct: 10, ordre: 2 },
  { code: 'OR', libelleFr: 'Or', libelleEn: 'Gold', seuil: 4000, bonusPct: 20, ordre: 3 },
  { code: 'CHAMPION', libelleFr: 'Clean Champion', libelleEn: 'Clean Champion', seuil: 8000, bonusPct: 30, ordre: 4 },
];

export const CONVERSIONS = [
  {
    type: 'REDUCTION_ABONNEMENT',
    libelleFr: "Réduction sur l'abonnement", libelleEn: 'Subscription discount',
    pointsPour1000Gnf: 100, plafondMensuelGnf: null, soldeMinimumPoints: 0, ordre: 1,
  },
  {
    // Taux plus eleve : ce canal supporte la commission de l'operateur.
    type: 'CREDIT_MOBILE_MONEY',
    libelleFr: 'Crédit Orange Money / MTN MoMo', libelleEn: 'Orange Money / MTN MoMo credit',
    pointsPour1000Gnf: 110, plafondMensuelGnf: 150000, soldeMinimumPoints: 200, ordre: 2,
  },
  {
    type: 'BON_PARTENAIRE',
    libelleFr: "Bon d'achat partenaire", libelleEn: 'Partner voucher',
    pointsPour1000Gnf: 95, plafondMensuelGnf: null, soldeMinimumPoints: 100, ordre: 3,
  },
  {
    type: 'CADEAU_CATALOGUE',
    libelleFr: 'Cadeau du catalogue', libelleEn: 'Catalogue gift',
    pointsPour1000Gnf: 100, plafondMensuelGnf: null, soldeMinimumPoints: 300, ordre: 4,
  },
  {
    type: 'DON_ASSOCIATION',
    libelleFr: 'Don à une école ou une association', libelleEn: 'Donation to a school or charity',
    pointsPour1000Gnf: 90, plafondMensuelGnf: null, soldeMinimumPoints: 50, ordre: 5,
  },
];

export const PARAMETRES = [
  { cle: 'points.gnfParPoint', valeur: '10', type: 'number', groupe: 'points',
    libelleFr: "Valeur d'un point Clean (GNF)", libelleEn: 'Value of one Clean point (GNF)' },
  { cle: 'points.validiteMois', valeur: '18', type: 'number', groupe: 'points',
    libelleFr: 'Validité des points (mois)', libelleEn: 'Point validity (months)' },

  { cle: 'fraude.plafondKgMois', valeur: '25', type: 'number', groupe: 'fraude',
    libelleFr: 'Plafond mensuel de recyclables par client (kg)', libelleEn: 'Monthly recyclable cap per customer (kg)' },
  { cle: 'fraude.facteurDeclassement', valeur: '0.5', type: 'number', groupe: 'fraude',
    libelleFr: 'Part des points conservée sur un lot déclassé', libelleEn: 'Share of points kept on a downgraded batch' },

  { cle: 'qualite.seuilContaminationPct', valeur: '15', type: 'number', groupe: 'qualite',
    libelleFr: 'Seuil de contamination déclassant un lot (%)', libelleEn: 'Contamination threshold downgrading a batch (%)' },

  { cle: 'tri.capaciteParCategorieKg', valeur: '5000', type: 'number', groupe: 'tri',
    libelleFr: 'Capacité de stockage par catégorie (kg)', libelleEn: 'Storage capacity per category (kg)' },

  { cle: 'finance.tauxDepensesEstime', valeur: '0.26', type: 'number', groupe: 'finance',
    libelleFr: "Taux de dépenses estimé, tant que la comptabilité analytique n'est pas branchée",
    libelleEn: 'Estimated expense ratio, until cost accounting is connected' },

  { cle: 'abonnement.offreParDefaut', valeur: 'STANDARD', type: 'string', groupe: 'abonnement',
    libelleFr: "Offre attribuée à l'inscription", libelleEn: 'Offer assigned at signup' },
  { cle: 'abonnement.joursAvantSuspension', valeur: '45', type: 'number', groupe: 'abonnement',
    libelleFr: 'Jours d\'impayé avant suspension', libelleEn: 'Days overdue before suspension' },

  { cle: 'compte.retentionAnonymiseeMois', valeur: '60', type: 'number', groupe: 'compte',
    libelleFr: 'Conservation des données comptables anonymisées (mois)',
    libelleEn: 'Retention of anonymised accounting data (months)' },

  { cle: 'app.languesDisponibles', valeur: '["fr","en"]', type: 'json', groupe: 'app',
    libelleFr: "Langues proposées par l'application", libelleEn: 'Languages offered by the app', modifiable: false },
  { cle: 'app.langueParDefaut', valeur: 'fr', type: 'string', groupe: 'app',
    libelleFr: 'Langue par défaut', libelleEn: 'Default language' },
  { cle: 'app.deviseCode', valeur: 'GNF', type: 'string', groupe: 'app',
    libelleFr: 'Devise', libelleEn: 'Currency', modifiable: false },
  { cle: 'app.indicatifTelephonique', valeur: '+224', type: 'string', groupe: 'app',
    libelleFr: 'Indicatif téléphonique', libelleEn: 'Phone country code' },
  { cle: 'app.slogan', valeur: 'Du déchet à la valeur', type: 'string', groupe: 'app',
    libelleFr: 'Slogan (français)', libelleEn: 'Slogan (French)' },
  { cle: 'app.sloganEn', valeur: 'From waste to value', type: 'string', groupe: 'app',
    libelleFr: 'Slogan (anglais)', libelleEn: 'Slogan (English)' },

  { cle: 'bac.niveauMaxTiers', valeur: '3', type: 'number', groupe: 'bac',
    libelleFr: 'Nombre de crans du niveau de remplissage', libelleEn: 'Fill level steps' },
  { cle: 'bac.seuilAlerteTiers', valeur: '2', type: 'number', groupe: 'bac',
    libelleFr: 'Cran à partir duquel un bac est signalé presque plein',
    libelleEn: 'Step from which a bin is flagged nearly full' },

  { cle: 'collecte.etaDefautMinutes', valeur: '12', type: 'number', groupe: 'collecte',
    libelleFr: "Temps d'arrivée annoncé par défaut (minutes)", libelleEn: 'Default announced ETA (minutes)' },
  { cle: 'collecte.dureeCreneauHeures', valeur: '2', type: 'number', groupe: 'collecte',
    libelleFr: 'Durée du créneau annoncé au client (heures)', libelleEn: 'Announced time window (hours)' },
];

/** Insere ou met a jour tous les referentiels. Idempotent. */
export async function semerConfig(prisma) {
  for (const c of CATEGORIES) {
    await prisma.categorieConfig.upsert({
      where: { code: c.code },
      create: c,
      update: c,
    });
  }

  for (const n of NIVEAUX) {
    await prisma.niveauFidelite.upsert({ where: { code: n.code }, create: n, update: n });
  }

  for (const t of CONVERSIONS) {
    await prisma.tauxConversion.upsert({ where: { type: t.type }, create: t, update: t });
  }

  for (const p of PARAMETRES) {
    // Sur un parametre existant, on ne remplace que les libelles : la valeur
    // peut avoir ete reglee depuis le back-office, on ne l'ecrase pas.
    await prisma.parametre.upsert({
      where: { cle: p.cle },
      create: p,
      update: {
        libelleFr: p.libelleFr,
        libelleEn: p.libelleEn,
        groupe: p.groupe,
        type: p.type,
      },
    });
  }

  return {
    categories: CATEGORIES.length,
    niveaux: NIVEAUX.length,
    conversions: CONVERSIONS.length,
    parametres: PARAMETRES.length,
  };
}
