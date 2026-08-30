import type { fr } from './fr';

/**
 * English strings. Must mirror `fr.ts` key for key — the `Traductions` type below
 * makes the compiler fail if a key is missing or misspelled.
 *
 * Interface copy only. Business labels (waste categories, tariffs, loyalty tiers)
 * come from the API (`/api/config`), never from here.
 */
/**
 * Meme forme que `fr`, aux valeurs pres : une cle manquante ou mal orthographiee
 * fait echouer la compilation, ce qui evite les textes non traduits en production.
 */
type Miroir<T> = {
  [K in keyof T]: T[K] extends readonly string[]
    ? string[]
    : T[K] extends object
      ? Miroir<T[K]>
      : string;
};

type Traductions = Miroir<typeof fr>;

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
    introClient: 'Enter the phone number on your account and your password.',
    numeroAbonnement: 'Customer code',
    numeroEmploye: 'Staff number',
    aideClient:
      'Use the number you gave at signup.',
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
    typeCompte: 'You are signing up as',
    particulier: 'Individual',
    particulierAide: 'A household',
    entreprise: 'Business',
    entrepriseAide: 'Company, shop, public body',
    nomComplet: 'Full name',
    raisonSociale: 'Business name',
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
      'Pay with Orange Money, MTN MoMo, Visa or Mastercard.',
  },

  profil: {
    sectionCompte: 'Account',
    sectionPreferences: 'Preferences',
    sectionSupport: 'Help and support',
    sectionSession: 'Session',
    contacterService: 'Contact customer service',
    conditions: 'Terms and conditions',
    titre: 'Profile',
    mesInformations: 'My details',
    monAbonnement: 'My subscription',
    mesBacs: 'My bins',
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


  zones: {
    confirmeeHorsLigne: 'Zone saved offline',
    confirmeeHorsLigneDetail:
      'The confirmation will be sent automatically when the network returns. You can carry on with your round.',
    aCollecter: 'Zones to collect',
    aFaire: 'To do',
    enCours: 'In progress',
    terminees: 'Completed',
    foyers: 'households',
    foyersServis: 'households served',
    demandes: 'requests',
    autresFoyers: 'more households',
    toutFait: 'All your zones are collected. Have a good day!',
    aucuneZone: 'No zone today',
    aucuneZoneDetail: 'Your supervisor has not assigned you a zone yet.',
    aucuneTerminee: 'No completed zone',
    detail: 'Zone details',
    itineraire: 'Directions',
    demarrer: 'Start collection',
    confirmerCollecte: 'Confirm collection',
    confirmationAide: 'Tell us how many households you served in this zone.',
    foyersServisLabel: 'Number of households served',
    commentaire: 'Comment (optional)',
    commentairePlaceholder: 'Difficult access, missing bin…',
    zoneConfirmee: 'Zone confirmed',
    confirmationResume: 'Collection recorded for {foyers} households.',
    echecDemarrage: 'Could not start',
    echecConfirmation: 'Confirmation failed',
    carteSousTitre: "Today's zones",
    carteIndisponible: 'Map unavailable in Expo Go',
    positionIndisponible:
      'Location unavailable: turn it on to sort zones by distance.',
    statut: {
      A_FAIRE: 'To do',
      EN_COURS: 'In progress',
      TERMINEE: 'Completed',
      ANNULEE: 'Cancelled',
    },
  },

  tdb: {
    titre: 'Dashboard',
    aujourdhui: 'Today',
    cetteSemaine: 'This week',
    ceMois: 'This month',
    zones: 'zones',
    zonesRestantes: 'You have {n} zone(s) left to collect',
    prochaineZone: 'Next zone',
    voirMesZones: 'View my zones',
  },

  inscriptionGeo: {
    titre: 'Locate my home',
    aide:
      'Your location helps the collector find your door. An address alone is often imprecise.',
    utiliserPosition: 'Use my current location',
    positionEnregistree: 'Location saved',
    refusee: 'Location declined. You can add it later from your profile.',
    indisponible: 'Location unavailable right now.',
  },

  infos: {
    domicile: 'My home',
    consignes: 'Access instructions (optional)',
    consignesPlaceholder: 'Leave the bin by the door, green gate…',
    nbPersonnes: 'People in the household',
    aucunePosition: 'No location saved',
    telephoneFige:
      'Your phone number identifies your account. To change it, contact customer service.',
    enregistre: 'Details saved',
    echec: 'Could not save',
  },

  notifs: {
    passagePrevu: 'Scheduled collection',
    passagePrevuDetail: 'The day before each planned collection',
    collecteurEnRoute: 'Collector on the way',
    collecteurEnRouteDetail: 'When the collector is approaching',
    collecteTerminee: 'Collection completed',
    collecteTermineeDetail: 'When your bins have been emptied',
    rappelPaiement: 'Payment reminder',
    rappelPaiementDetail: 'Cannot be turned off: an unpaid bill suspends the service',
    avisSms:
      'If you turn a notification off, you may still receive it by SMS depending on your subscription.',
  },

  aide: {
    serviceClient: 'Customer service',
    horaires: 'Monday to Saturday, 8am – 6pm',
    questionsFrequentes: 'Frequently asked questions',
    q1: 'How much does the subscription cost?',
    r1: 'The Standard subscription is {tarif} per month, for {passages} collections per week. Pay with Orange Money, MTN MoMo, Visa or Mastercard.',
    q2: 'What if the collector did not come?',
    r2: 'Report it from the Bins screen by tapping "My bin is full". A request is created and a collector is assigned. If it happens again, call customer service.',
    q3: 'What happens after the collector comes?',
    r3: 'The collector empties your bins and leaves — nothing is weighed at your door. The load goes to the warehouse, where sorters separate and weigh it. All you have to do is confirm the pickup in the app.',
    q4: 'What goes in each bin?',
    r4: 'Bin 1: plastic bottles and packaging. Bin 2: cans, tins and metals. Bin 3: everything else. The better you sort, the smoother sorting is at the warehouse.',
    q5: 'What happens if I do not pay?',
    r5: 'You receive reminders. After 45 days overdue, the service is suspended until payment. Your bins stay with you.',
    q6: 'How do I delete my account?',
    r6: 'From Profile, at the very bottom. Your personal data is erased immediately. Invoiced amounts are kept for accounting, with no link to you.',
    cguResume:
      'By subscribing, you agree to put your bins out on collection days and to pay your subscription monthly. Sényi commits to the announced collection frequency and informs you of any delay. Bins remain the property of Sényi and are collected on termination.',
  },

  codeClient: {
    compteCree: 'Account created',
    intro: 'Here is your customer code. It is printed on your bins and used by customer service.',
    votreCode: 'YOUR CUSTOMER CODE',
    copier: 'Copy code',
    copie: 'Code copied',
    parSms: 'We have sent it to you by SMS.',
    connexionTelephone: 'To sign in, use your phone number.',
    retrouvable: 'You can find it any time in your profile.',
    continuer: 'Get started',
  },

  scan: {
    titre: 'Scan a bin',
    presenterCode: 'Point at the bin QR code',
    permissionRequise:
      'Camera access is required to scan bins. You can allow it in your phone settings.',
    autoriser: 'Allow camera',
    codeInconnu: 'Code not recognised',
    codeInconnuDetail: 'This QR code is not a Sényi bin.',
    saisirManuellement: 'Enter the code manually',
    abonnementInactif: 'Subscription suspended',
    foyerIntrouvable: 'Household not found — the collection will be matched on sync.',
    modeHorsLigne: 'Offline — saved and sent when the network returns',
    enAttente: 'pending',
    confirmerCollecte: 'Confirm collection',
    scannerAutre: 'Scan another bin',
    enregistre: 'Collection recorded',
    enregistreEnLigne: 'The customer will be asked to confirm.',
    enregistreHorsLigne: 'Saved on the phone. It will be sent automatically when the network returns.',
  },

  confirmation: {
    titre: 'Confirm my collections',
    sousTitre: 'Were your bins actually collected?',
    question: 'Were your bins collected?',
    ouiCollecte: 'Yes, collected',
    nonCollecte: 'No, nobody came',
    motif: 'What happened?',
    motifPlaceholder: 'The bin was not emptied, the collector did not come…',
    envoyerSignalement: 'Report',
    merci: 'Thank you',
    mercitexte: 'Your confirmation helps us check service quality.',
    signale: 'Report sent',
    signaleTexte: 'Our team will check this collection and get back to you.',
    aucune: 'No collection to confirm',
    aucuneDetail: 'Collections declared by your collector will appear here.',
    explication:
      'We ask you to confirm each collection: this is how we spot a collection that was billed but never made.',
  },

  notifsListe: {
    nonLues: '{n} unread',
    toutLire: 'Mark all read',
    aucune: 'No notification',
    aucuneDetail: 'Collections, payments and points will appear here.',
  },

  abonnement: {
    titre: 'My subscription',
    choisirOffre: 'Plan',
    choisirDuree: 'Commitment',
    moyenPaiement: 'Payment method',
    passagesSemaine: 'collections/week',
    bacs: 'bins',
    MENSUEL: 'Monthly',
    TRIMESTRIEL: 'Quarterly',
    ANNUEL: 'Yearly',
    jusquau: 'Until',
    remise: 'Discount',
    total: 'Total to pay',
    souscrire: 'Subscribe',
    souscrit: 'Subscription recorded',
    actif: 'Your subscription is active.',
    validerPaiement: 'Approve the {montant} payment on your phone.',
    echec: 'Subscription failed',
    note:
      'A longer commitment costs less per month. You can change plan at any time; the new one takes effect immediately.',
  },

  horsLigne: {
    banniere: 'Offline — {n} pending operation(s)',
    synchronisation: 'Syncing…',
    synchroniser: 'Sync now',
    echecs: 'Failed operations',
    echecsDetail: 'These operations could not be saved. Please contact support.',
  },

  oubli: {
    titre: 'Forgotten password',
    lienConnexion: 'Forgotten password?',

    introIdentifiant:
      'Enter your account phone number. We will send you a code by SMS.',
    identifiant: 'Phone or customer code',
    envoyerCode: 'Send me the code',

    introCode:
      'If this account exists, a 6-digit code has just been sent to it by SMS. It is valid for {n} minutes.',
    code: 'Code received by SMS',
    verifier: 'Verify',
    renvoyer: 'I did not receive anything',
    essaisRestants: '{n} attempt(s) left',
    changerNumero: 'Change the number',

    introNouveau: 'Choose a new password. You will use it to sign in.',
    nouveau: 'New password',
    confirmation: 'Confirm the password',
    tropCourt: 'At least 6 characters',
    differents: 'The two passwords do not match',
    valider: 'Save',

    reussi: 'Password changed',
    reussiTexte: 'You can now sign in with your new password.',
    retourConnexion: 'Sign in',

    note:
      'The code goes to the number registered when you signed up. If you no longer have access to it, call customer service.',
    echec: 'Something went wrong',
  },

  onglets: {
    scanner: 'Scan',
    points: 'Points',
    paiements: 'Payments',
    accueil: 'Home',
    collectes: 'Bins',
    historique: 'History',
    profil: 'Profile',
    tableauDeBord: 'Summary',
    zones: 'Zones',
    carte: 'Map',
  },
};
