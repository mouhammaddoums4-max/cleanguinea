import type { fr } from './fr';

/**
 * English strings. Must mirror `fr.ts` key for key — the `Traductions` type below
 * makes the compiler fail if a key is missing or misspelled.
 *
 * Interface copy only. Business labels (waste categories, tariffs, loyalty tiers)
 * come from the API (`/api/config`), never from here.
 */
type Traductions = {
  [S in keyof typeof fr]: { [K in keyof (typeof fr)[S]]: (typeof fr)[S][K] extends readonly string[] ? string[] : string };
};

export const en: Traductions = {
  commun: {
    chargement: 'Loading…',
    reessayer: 'Retry',
    annuler: 'Cancel',
    confirmer: 'Confirm',
    enregistrer: 'Save',
    supprimer: 'Delete',
    fermer: 'Close',
    retour: 'Back',
    voirTout: 'See all',
    voirPlus: 'See more',
    aucuneDonnee: 'No data',
    erreurReseau: 'Cannot reach the server. Please check your connection.',
    obligatoire: 'Required field',
    oui: 'Yes',
    non: 'No',
  },

  bienvenue: {
    slogan: 'From waste to value',
    seConnecter: 'Sign in',
    creerCompte: 'Create an account',
  },

  connexion: {
    titre: 'Sign in',
    intro: 'Enter the phone number linked to your Clean Guinée subscription.',
    telephone: 'Phone number',
    motDePasse: 'Password',
    afficherMotDePasse: 'Show password',
    masquerMotDePasse: 'Hide password',
    valider: 'Sign in',
    pasDeCompte: 'Create an account',
    echec: 'Sign-in failed',
  },

  inscription: {
    titre: 'Create an account',
    nomComplet: 'Full name',
    telephone: 'Phone number',
    email: 'Email (optional)',
    adresse: 'Address',
    commune: 'Municipality',
    quartier: 'Neighbourhood',
    motDePasse: 'Password (6 characters minimum)',
    accepterCgu: 'I accept the terms and conditions',
    valider: 'Sign up',
    dejaCompte: 'I already have an account',
    echec: 'Sign-up failed',
  },

  accueil: {
    bonjour: 'Hello',
    prochainPassage: 'Next collection',
    collecteEnCours: 'Collection in progress',
    aucuneCollecte: 'No collection scheduled',
    signalerBacPlein: 'Report a full bin to request a pickup',
    suivreTempsReel: 'Track in real time',
    arriveeEstimee: 'Estimated arrival',
    mesBacs: 'My bins',
    poubellePleine: 'My bin is full',
    pointsClean: 'Clean points',
    niveau: 'Tier',
  },

  bacs: {
    titre: 'My bins',
    sousTitre: 'Set the fill level',
    bac: 'Bin',
    plein: 'full',
    presquePlein: 'This bin is nearly full',
    demanderCollecte: 'Request a collection',
  },

  demande: {
    titre: 'Request a collection',
    question: 'Which bin should we collect?',
    typeDemande: 'Request type',
    immediate: 'Immediate',
    immediateDetail: 'A collector is assigned as soon as possible',
    programmer: 'Schedule',
    programmerDetail: 'On the next round in your neighbourhood',
    valider: 'Submit request',
    echec: 'Request failed',
  },

  suivi: {
    titre: 'Collection tracking',
    collecteurAssigne: 'Assigned collector',
    enAffectation: 'Being assigned',
    arriveeEstimee: 'Estimated arrival',
    localisation: 'Location',
    aucuneEnCours: 'No collection in progress',
    aucuneEnCoursDetail: 'Your active requests appear here with the collector position.',
    minutes: 'min',
  },

  statuts: {
    EN_ATTENTE: 'Pending',
    ACCEPTEE: 'Accepted',
    EN_ROUTE: 'On the way',
    ARRIVE: 'Arrived',
    TERMINEE: 'Completed',
    ANNULEE: 'Cancelled',
    MANQUEE: 'Missed',
  },

  historique: {
    titre: 'Collection history',
    aucune: 'No completed collection',
    aucuneDetail: 'Your pickups will appear here.',
    poids: 'Weight',
  },

  paiements: {
    titre: 'Payments',
    aucunAbonnement: 'No subscription',
    parMois: '/ month',
    prochainPrelevement: 'Next charge',
    historique: 'Payment history',
    paye: 'Paid',
    echoue: 'Failed',
    enAttente: 'Pending',
    note:
      'Pay with Orange Money, MTN MoMo, Visa or Mastercard. Your Clean points can cover part or all of the subscription.',
  },

  points: {
    titre: 'Clean Points',
    soldeDisponible: 'Available balance',
    soit: 'worth',
    bonusSurGains: 'on your earnings',
    encorePts: '{n} more pts to reach {niveau}',
    baremeParMatiere: 'Rate per material',
    ptsParKg: 'pts / kg',
    note:
      '{taux} points = 1,000 GNF · redeemable as a subscription discount, Orange Money credit or vouchers.',
    derniersMouvements: 'Recent activity',
  },

  profil: {
    titre: 'Profile',
    mesInformations: 'My details',
    monAbonnement: 'My subscription',
    mesBacs: 'My bins',
    mesPoints: 'My Clean points',
    notifications: 'Notifications',
    langue: 'Language',
    aide: 'Help & FAQ',
    parametres: 'Settings',
    seDeconnecter: 'Sign out',
    confirmerDeconnexion: 'Do you really want to end your session?',
    supprimerCompte: 'Delete my account',
    version: 'version',
  },

  langue: {
    titre: 'Language',
    fr: 'Français',
    en: 'English',
    changee: 'Language updated',
  },

  suppression: {
    titre: 'Delete my account',
    avertissement: 'This action is permanent',
    ceQuiEstSupprime: 'Deleted immediately',
    listeSupprime: [
      'Your name, phone number, email and photo',
      'Your address and home access instructions',
      'Your Clean points balance and its history',
      'Your access to the app',
    ],
    ceQuiEstConserve: 'Kept, with no link to you',
    listeConserve: [
      'Amounts invoiced and paid, for accounting',
      'Collected tonnage, which feeds impact reporting',
    ],
    consequences: 'Your subscription will be terminated and your bins collected.',
    exporter: 'Download my data before deleting',
    exportReussi: 'Your data has been prepared',
    motDePasse: 'Your password',
    tapezPourConfirmer: 'Type {mot} to confirm',
    motConfirmation: 'DELETE',
    supprimerDefinitivement: 'Delete permanently',
    confirmationTitre: 'Final confirmation',
    confirmationTexte:
      'Your account and personal data will be deleted. This action cannot be undone.',
    succes: 'Your account has been deleted.',
    echec: 'Deletion failed',
  },

  collecteur: {
    missions: 'Jobs',
    carte: 'Map',
    historique: 'History',
    profil: 'Profile',
    toutes: 'All',
    enCours: 'In progress',
    terminees: 'Completed',
    prochaineMission: 'Next job',
    aucuneMission: 'No job',
    aucuneMissionDetail: 'Nothing to show for this filter.',
    detailMission: 'Job details',
    bacsACollecter: 'Bin(s) to collect',
    notesClient: 'Customer notes',
    accepter: 'Accept job',
    demarrer: 'Start job',
    suisArrive: 'I have arrived',
    pesee: 'Weighing',
    poidsKg: 'Weight (kg)',
    peseeAide: 'Weight read from the scale. Photograph the bin before confirming.',
    confirmerCollecte: 'Confirm collection',
    collecteConfirmee: 'Collection confirmed',
    kgEnregistres: '{poids} kg recorded. {points} points credited to the customer.',
    annulerMission: 'Cancel job',
    confirmerAnnulation: 'Confirm cancellation of this job?',
    missionTerminee: 'Job completed',
    kgCollectes: 'kg collected',
    maTournee: 'My round',
    groupeeParCommune: 'Grouped by municipality',
    arrets: 'stop(s)',
    matricule: 'Staff ID',
    vehicule: 'Vehicle',
    evaluations: 'Ratings received',
    collectesJour: 'collection(s)',
    aujourdhui: 'today',
  },

  onglets: {
    accueil: 'Home',
    collectes: 'Bins',
    historique: 'History',
    profil: 'Profile',
    missions: 'Jobs',
    carte: 'Map',
  },
};
