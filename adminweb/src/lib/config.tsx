'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from './api';

/**
 * Configuration et langue du back-office.
 *
 * Les libellés de catégories, couleurs, offres, taux et seuils viennent tous de
 * `GET /api/config`. Rien n'est écrit en dur : une modification faite dans
 * Paramètres se voit immédiatement, sans redéploiement.
 */

export type Langue = 'fr' | 'en';
export type Theme = 'clair' | 'sombre';

export type CategorieConfig = {
  code: string;
  libelle: string;
  couleur: string;
  couleurFond: string;
  icone: string;
  recyclable: boolean;
};

export type Config = {
  langue: string;
  categories: CategorieConfig[];
  conversions: {
    type: string;
    libelle: string;
    pointsPour1000Gnf: number;
    plafondMensuelGnf: number | null;
  }[];
  niveaux: { code: string; libelle: string; seuil: number; bonusPct: number }[];
  offres: {
    id: string;
    type: string;
    libelle: string;
    tarifMensuelGnf: number;
    passagesParSemaine: number;
  }[];
  parametres: Record<string, string | number | boolean | string[]>;
};

const CLE_LANGUE = 'cleanguinea.admin.langue';
export const CLE_THEME = 'cleanguinea.admin.theme';

/** Textes d'interface du back-office. */
const TEXTES = {
  fr: {
    tableauDeBord: 'Tableau de bord', clients: 'Clients', abonnements: 'Abonnements',
    collectes: 'Collectes', collecteurs: 'Collecteurs', dechets: 'Déchets',
    stock: 'Stock & Tri', ventes: 'Ventes', finance: 'Finance', rapports: 'Rapports',
    parametres: 'Paramètres',
    operations: 'Opérations', valorisation: 'Valorisation',
    annuaire: 'Annuaire', synthese: 'Synthèse',
    navigationPrincipale: 'Navigation principale',
    sousNavigation: 'Sections de la rubrique',
    vueEnsemble: "Vue d'ensemble de votre activité",
    clientsActifs: 'Clients actifs', abonnementsActifs: 'Abonnements actifs',
    collectesRealisees: 'Collectes réalisées', dechetsCollectes: 'Déchets collectés',
    chiffreAffaires: "Chiffre d'affaires",
    vsPeriodePrecedente: 'vs période précédente',
    collectesSurPeriode: 'Collectes sur la période',
    repartitionDechets: 'Répartition des déchets collectés',
    topZones: 'Top 5 des zones', parQuantite: 'Par quantité collectée',
    collectesEnCours: 'Collectes en cours', stockParCategorie: 'Stock par catégorie',
    quantiteEnStock: 'Quantité en stock', alertes: 'Alertes & notifications',
    resumeFinancier: 'Résumé financier', surPeriodeSelectionnee: 'Sur la période sélectionnée',
    revenusAbonnements: 'Revenus abonnements', revenusRecyclage: 'Revenus recyclage',
    depenses: 'Dépenses', beneficeNet: 'Bénéfice net',
    missionsAujourdhui: "Missions aujourd'hui",
    total: 'Total', enCours: 'En cours', terminees: 'Terminées', annulees: 'Annulées',
    mission: 'Mission', client: 'Client', zone: 'Zone', bacs: 'Bac(s)',
    collecteur: 'Collecteur', heure: 'Heure', statut: 'Statut',
    aucuneCollecte: 'Aucune collecte en cours',
    chargement: 'Chargement…', tonnes: 'Tonnes',
    deconnexion: 'Se déconnecter', administrateur: 'Administrateur', superviseur: 'Superviseur',
    monProfil: 'Mon profil', menuUtilisateur: 'Menu utilisateur',
    apparence: 'Apparence', modeSombre: 'Mode sombre', modeClair: 'Mode clair',
    langueLibelle: 'Langue',
    informationsCompte: 'Informations du compte',
    nom: 'Nom', role: 'Rôle', email: 'E-mail', identifiant: 'Identifiant',
    membreDepuis: 'Membre depuis', nonRenseigne: 'Non renseigné',
    preferences: 'Préférences',
    connexion: 'Se connecter', backOffice: 'Back-office',
    reserveA: 'Réservé aux administrateurs et superviseurs.',
    telephone: 'Téléphone', motDePasse: 'Mot de passe',
    accesRefuse: "Ce compte n'a pas accès au back-office.",
    verificationSession: 'Vérification de la session…',
    moduleAConstruire: 'Module à construire',
    annuaireClients: 'Annuaire des foyers et des professionnels abonnés.',
    rechercherClient: 'Nom, téléphone, adresse ou code client…',
    tousStatuts: 'Tous les statuts', toutesZones: 'Toutes les zones',
    inclureSupprimes: 'Comptes supprimés',
    aucunClient: 'Aucun client ne correspond à cette recherche',
    codeClient: 'Code client', offre: 'Offre', adresse: 'Adresse',
    inscritLe: 'Inscrit le', personnes: 'Personnes', foyer: 'Foyer',
    precedent: 'Précédent', suivant: 'Suivant',
    clientsTrouves: 'client(s)', pageSur: 'Page {p} sur {n}',
    ficheClient: 'Fiche client', fermer: 'Fermer',
    compteSupprime: 'Compte supprimé', aucunAbonnement: 'Aucun abonnement',
    dernieresCollectes: 'Dernières collectes', derniersPaiements: 'Derniers paiements',
    aucuneDonnee: 'Aucune donnée', localisation: 'Localisation', notes: 'Consignes',
    prochainPrelevement: 'Prochain prélèvement', abonnement: 'Abonnement',
    voirSurCarte: 'Voir sur la carte', historiqueAbonnements: 'Historique des abonnements',
    noteDepenses:
      "Les dépenses suivent le taux paramétrable finance.tauxDepensesEstime, en attendant la comptabilité analytique.",
  },
  en: {
    tableauDeBord: 'Dashboard', clients: 'Customers', abonnements: 'Subscriptions',
    collectes: 'Collections', collecteurs: 'Collectors', dechets: 'Waste',
    stock: 'Stock & Sorting', ventes: 'Sales', finance: 'Finance', rapports: 'Reports',
    parametres: 'Settings',
    operations: 'Operations', valorisation: 'Recycling',
    annuaire: 'Directory', synthese: 'Overview',
    navigationPrincipale: 'Main navigation',
    sousNavigation: 'Sections in this area',
    vueEnsemble: 'Overview of your activity',
    clientsActifs: 'Active customers', abonnementsActifs: 'Active subscriptions',
    collectesRealisees: 'Completed collections', dechetsCollectes: 'Waste collected',
    chiffreAffaires: 'Revenue',
    vsPeriodePrecedente: 'vs previous period',
    collectesSurPeriode: 'Collections over the period',
    repartitionDechets: 'Collected waste breakdown',
    topZones: 'Top 5 zones', parQuantite: 'By quantity collected',
    collectesEnCours: 'Collections in progress', stockParCategorie: 'Stock by category',
    quantiteEnStock: 'Quantity in stock', alertes: 'Alerts & notifications',
    resumeFinancier: 'Financial summary', surPeriodeSelectionnee: 'Over the selected period',
    revenusAbonnements: 'Subscription revenue', revenusRecyclage: 'Recycling revenue',
    depenses: 'Expenses', beneficeNet: 'Net profit',
    missionsAujourdhui: 'Jobs today',
    total: 'Total', enCours: 'In progress', terminees: 'Completed', annulees: 'Cancelled',
    mission: 'Job', client: 'Customer', zone: 'Zone', bacs: 'Bin(s)',
    collecteur: 'Collector', heure: 'Time', statut: 'Status',
    aucuneCollecte: 'No collection in progress',
    chargement: 'Loading…', tonnes: 'Tonnes',
    deconnexion: 'Sign out', administrateur: 'Administrator', superviseur: 'Supervisor',
    monProfil: 'My profile', menuUtilisateur: 'User menu',
    apparence: 'Appearance', modeSombre: 'Dark mode', modeClair: 'Light mode',
    langueLibelle: 'Language',
    informationsCompte: 'Account information',
    nom: 'Name', role: 'Role', email: 'Email', identifiant: 'Identifier',
    membreDepuis: 'Member since', nonRenseigne: 'Not provided',
    preferences: 'Preferences',
    connexion: 'Sign in', backOffice: 'Back office',
    reserveA: 'Restricted to administrators and supervisors.',
    telephone: 'Phone number', motDePasse: 'Password',
    accesRefuse: 'This account cannot access the back office.',
    verificationSession: 'Checking session…',
    moduleAConstruire: 'Module to build',
    annuaireClients: 'Directory of subscribed households and businesses.',
    rechercherClient: 'Name, phone, address or customer code…',
    tousStatuts: 'All statuses', toutesZones: 'All zones',
    inclureSupprimes: 'Deleted accounts',
    aucunClient: 'No customer matches this search',
    codeClient: 'Customer code', offre: 'Plan', adresse: 'Address',
    inscritLe: 'Joined on', personnes: 'People', foyer: 'Household',
    precedent: 'Previous', suivant: 'Next',
    clientsTrouves: 'customer(s)', pageSur: 'Page {p} of {n}',
    ficheClient: 'Customer record', fermer: 'Close',
    compteSupprime: 'Deleted account', aucunAbonnement: 'No subscription',
    dernieresCollectes: 'Latest collections', derniersPaiements: 'Latest payments',
    aucuneDonnee: 'No data', localisation: 'Location', notes: 'Instructions',
    prochainPrelevement: 'Next charge', abonnement: 'Subscription',
    voirSurCarte: 'View on map', historiqueAbonnements: 'Subscription history',
    noteDepenses:
      'Expenses follow the configurable finance.tauxDepensesEstime rate, pending cost accounting.',
  },
} as const;

export type CleTexte = keyof (typeof TEXTES)['fr'];

const CATEGORIE_INCONNUE: CategorieConfig = {
  code: '',
  libelle: '—',
  couleur: '#9CA3AF',
  couleurFond: '#F3F4F6',
  icone: 'trash',
  recyclable: false,
};

type ContexteConfig = {
  config: Config | null;
  chargement: boolean;
  langue: Langue;
  changerLangue: (l: Langue) => void;
  theme: Theme;
  changerTheme: (t: Theme) => void;
  basculerTheme: () => void;
  t: (cle: CleTexte) => string;
  categorie: (code: string) => CategorieConfig;
  statut: (code: string) => string;
};

const Contexte = createContext<ContexteConfig | null>(null);

const STATUTS: Record<Langue, Record<string, string>> = {
  fr: {
    EN_ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', EN_ROUTE: 'En route',
    ARRIVE: 'Arrivé', TERMINEE: 'Terminée', ANNULEE: 'Annulée', MANQUEE: 'Manquée',
    ACTIF: 'Actif', SUSPENDU: 'Suspendu', RESILIE: 'Résilié',
    PAYE: 'Payé', ECHOUE: 'Échoué', REMBOURSE: 'Remboursé',
    ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', VISA: 'Visa',
    MASTERCARD: 'Mastercard', ESPECES: 'Espèces',
  },
  en: {
    EN_ATTENTE: 'Pending', ACCEPTEE: 'Accepted', EN_ROUTE: 'On the way',
    ARRIVE: 'Arrived', TERMINEE: 'Completed', ANNULEE: 'Cancelled', MANQUEE: 'Missed',
    ACTIF: 'Active', SUSPENDU: 'Suspended', RESILIE: 'Terminated',
    PAYE: 'Paid', ECHOUE: 'Failed', REMBOURSE: 'Refunded',
    ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', VISA: 'Visa',
    MASTERCARD: 'Mastercard', ESPECES: 'Cash',
  },
};

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [langue, setLangue] = useState<Langue>('fr');
  const [theme, setTheme] = useState<Theme>('clair');
  const [config, setConfig] = useState<Config | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const stockee = window.localStorage.getItem(CLE_LANGUE);
    if (stockee === 'fr' || stockee === 'en') setLangue(stockee);
  }, []);

  // Le theme a deja ete pose sur <html> par le script anti-scintillement du
  // layout : on se contente ici de refleter l etat reel du document.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'sombre' : 'clair');
  }, []);

  useEffect(() => {
    setChargement(true);
    api<Config>(`/api/config?langue=${langue}`, { sansAuth: true })
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setChargement(false));
  }, [langue]);

  const changerLangue = useCallback((l: Langue) => {
    setLangue(l);
    window.localStorage.setItem(CLE_LANGUE, l);
  }, []);

  const changerTheme = useCallback((t: Theme) => {
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'sombre');
    window.localStorage.setItem(CLE_THEME, t);
  }, []);

  const basculerTheme = useCallback(
    () => changerTheme(theme === 'sombre' ? 'clair' : 'sombre'),
    [changerTheme, theme],
  );

  const valeur = useMemo<ContexteConfig>(() => {
    const parCode = new Map(config?.categories.map((c) => [c.code, c]) ?? []);
    return {
      config,
      chargement,
      langue,
      changerLangue,
      theme,
      changerTheme,
      basculerTheme,
      t: (cle) => TEXTES[langue][cle],
      categorie: (code) => parCode.get(code) ?? { ...CATEGORIE_INCONNUE, code },
      statut: (code) => STATUTS[langue][code] ?? code,
    };
  }, [config, chargement, langue, changerLangue, theme, changerTheme, basculerTheme]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useConfig() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useConfig doit être utilisé dans ConfigProvider');
  return contexte;
}

/** Formatage dans la locale courante. */
export function useFormat() {
  const { langue, config } = useConfig();
  const locale = langue === 'en' ? 'en-GB' : 'fr-FR';
  const devise = (config?.parametres?.['app.deviseCode'] as string) ?? 'GNF';

  return useMemo(
    () => ({
      nombre: (v: number) => v.toLocaleString(locale).replace(/ | /g, ' '),
      montant: (v: number) => `${v.toLocaleString(locale).replace(/ | /g, ' ')} ${devise}`,
      dateCourte: (v: string | Date) =>
        new Date(v).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
      heure: (v: string | Date) =>
        new Date(v).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    }),
    [locale, devise],
  );
}
