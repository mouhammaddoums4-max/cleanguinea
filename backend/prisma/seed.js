import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { semerConfig, CATEGORIES } from './config.seed.js';

const prisma = new PrismaClient();

const MDP_DEMO = 'cleanguinea2026';

const COMMUNES = {
  Ratoma: ['Cite FOFANA', 'Kipe', 'Nongo', 'Taouyah'],
  Matam: ['Cite Faranah', 'Matam Lido'],
  Dixinn: ['Cite Miniere', 'Camayenne'],
  Matoto: ['Dabompa', 'Gbessia'],
  Kaloum: ['Almamya', 'Sandervalia'],
};

const OFFRES = [
  { type: 'ESSENTIEL', libelle: 'Abonnement Essentiel', tarifMensuelGnf: 25_000, passagesParSemaine: 2, nbBacsFournis: 2 },
  { type: 'STANDARD', libelle: 'Abonnement Standard', tarifMensuelGnf: 50_000, passagesParSemaine: 3, nbBacsFournis: 3 },
  { type: 'PRO', libelle: 'Abonnement PRO', tarifMensuelGnf: 200_000, passagesParSemaine: 6, nbBacsFournis: 6 },
];

const POINTS_PAR_KG = {
  PLASTIQUE: 15, METAL_FER: 8, CARTON: 6, VERRE: 4, ORGANIQUE: 1, AUTRES: 2, REFUS: 0,
};

const BAREME = CATEGORIES.map((c) => ({
  categorie: c.code,
  pointsParKg: POINTS_PAR_KG[c.code] ?? 0,
}));

const CLIENTS = [
  { nom: 'Mariama Diallo', telephone: '+224622123456', commune: 'Ratoma', quartier: 'Cite FOFANA', notes: 'Sortir le bac devant la porte.' },
  { nom: 'Ibrahima Sylla', telephone: '+224622223344', commune: 'Matam', quartier: 'Cite Faranah', notes: null },
  { nom: 'Fatoumata Bah', telephone: '+224622334455', commune: 'Dixinn', quartier: 'Cite Miniere', notes: 'Portail vert, sonner deux fois.' },
  { nom: 'Sita Camara', telephone: '+224622445566', commune: 'Matoto', quartier: 'Dabompa', notes: null },
  { nom: 'Ousmane Diallo', telephone: '+224622556677', commune: 'Ratoma', quartier: 'Kipe', notes: null },
  { nom: 'Amadou Barry', telephone: '+224622667788', commune: 'Kaloum', quartier: 'Almamya', notes: null },
];

const COLLECTEURS = [
  { nom: 'Abdoulaye Camara', telephone: '+224623111222', matricule: 'COL-001', vehicule: 'TRI-001', note: 4.8, nbEvaluations: 42 },
  { nom: 'Ibrahima Sylla', telephone: '+224623222333', matricule: 'COL-002', vehicule: 'TRI-002', note: 4.6, nbEvaluations: 31 },
  { nom: 'Moussa Keita', telephone: '+224623333444', matricule: 'COL-003', vehicule: 'TRI-003', note: 4.9, nbEvaluations: 55 },
  { nom: 'Abdoulaye Traore', telephone: '+224623444555', matricule: 'COL-004', vehicule: 'CAM-001', note: 4.7, nbEvaluations: 28 },
];

// Les trois bacs remis a chaque foyer : les trois premieres categories du referentiel.
const BACS = CATEGORIES.slice(0, 3).map((c, i) => ({ numero: i + 1, categorie: c.code }));

/** Remet la base a zero dans l ordre des dependances. */
async function vider() {
  await prisma.$transaction([
    prisma.evaluation.deleteMany(),
    prisma.mouvementPoints.deleteMany(),
    prisma.pesee.deleteMany(),
    prisma.missionBac.deleteMany(),
    prisma.mission.deleteMany(),
    prisma.paiement.deleteMany(),
    prisma.abonnement.deleteMany(),
    prisma.bac.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.vente.deleteMany(),
    prisma.acheteur.deleteMany(),
    prisma.stock.deleteMany(),
    prisma.centreTri.deleteMany(),
    prisma.alerte.deleteMany(),
    prisma.baremePoints.deleteMany(),
    prisma.tauxConversion.deleteMany(),
    prisma.niveauFidelite.deleteMany(),
    prisma.categorieConfig.deleteMany(),
    prisma.parametre.deleteMany(),
    prisma.soldePoints.deleteMany(),
    prisma.client.deleteMany(),
    prisma.collecteur.deleteMany(),
    prisma.user.deleteMany(),
    prisma.quartier.deleteMany(),
    prisma.commune.deleteMany(),
    prisma.offre.deleteMany(),
  ]);
}

async function main() {
  console.log('Nettoyage de la base...');
  await vider();

  const hash = await bcrypt.hash(MDP_DEMO, 10);

  console.log('Territoire...');
  const quartiers = {};
  for (const [nomCommune, listeQuartiers] of Object.entries(COMMUNES)) {
    const commune = await prisma.commune.create({ data: { nom: nomCommune } });
    for (const nomQuartier of listeQuartiers) {
      quartiers[`${nomCommune}/${nomQuartier}`] = await prisma.quartier.create({
        data: { nom: nomQuartier, communeId: commune.id },
      });
    }
  }

  console.log('Configuration (categories, niveaux, taux, parametres)...');
  const resume = await semerConfig(prisma);
  console.log(
    `  ${resume.categories} categories · ${resume.niveaux} niveaux · ` +
    `${resume.conversions} conversions · ${resume.parametres} parametres`,
  );

  console.log('Offres et bareme...');
  const offres = {};
  for (const o of OFFRES) offres[o.type] = await prisma.offre.create({ data: o });
  await prisma.baremePoints.createMany({ data: BAREME });

  console.log('Administrateur...');
  await prisma.user.create({
    data: {
      nom: 'Mamadou Camara',
      telephone: '+224621000000',
      email: 'admin@cleanguinea.gn',
      motDePasse: hash,
      role: 'ADMIN',
    },
  });

  console.log('Collecteurs...');
  const collecteurs = [];
  for (const c of COLLECTEURS) {
    const user = await prisma.user.create({
      data: {
        nom: c.nom,
        telephone: c.telephone,
        motDePasse: hash,
        role: 'COLLECTEUR',
        collecteur: {
          create: {
            matricule: c.matricule,
            vehicule: c.vehicule,
            note: c.note,
            nbEvaluations: c.nbEvaluations,
          },
        },
      },
      include: { collecteur: true },
    });
    collecteurs.push(user);
  }

  console.log('Clients, bacs et abonnements...');
  const clients = [];
  for (const [i, c] of CLIENTS.entries()) {
    const quartier = quartiers[`${c.commune}/${c.quartier}`];

    const user = await prisma.user.create({
      data: {
        nom: c.nom,
        telephone: c.telephone,
        motDePasse: hash,
        role: 'CLIENT',
        client: {
          create: {
            adresse: `${c.quartier}, ${c.commune}`,
            quartierId: quartier.id,
            notes: c.notes,
          },
        },
      },
      include: { client: true },
    });

    await prisma.soldePoints.create({
      data: { userId: user.id, solde: 400 + i * 250, cumule12Mois: 900 + i * 600 },
    });

    for (const b of BACS) {
      await prisma.bac.create({
        data: {
          ...b,
          codeQr: `CG-BAC-${user.client.id.slice(-6).toUpperCase()}-${b.numero}`,
          clientId: user.client.id,
          // Niveaux de remplissage varies, comme sur l ecran d accueil.
          niveauTiers: b.numero === 1 ? 2 : 1,
          dateRemise: new Date(),
        },
      });
    }

    const prochainPrelevement = new Date();
    prochainPrelevement.setMonth(prochainPrelevement.getMonth() + 1);

    await prisma.abonnement.create({
      data: {
        reference: `CG-${new Date().getFullYear()}-${String(i + 1).padStart(6, '0')}`,
        clientId: user.client.id,
        offreId: offres.STANDARD.id,
        prochainPrelevement,
      },
    });

    clients.push(user);
  }

  console.log('Centre de tri, stock et acheteurs...');
  const centre = await prisma.centreTri.create({
    data: { nom: 'Centre de tri de Kipe', adresse: 'Kipe, Ratoma', capaciteTonnesMois: 300 },
  });

  await prisma.stock.createMany({
    data: [
      { centreTriId: centre.id, categorie: 'PLASTIQUE', quantiteKg: 2450, capaciteKg: 2660 },
      { centreTriId: centre.id, categorie: 'METAL_FER', quantiteKg: 1350, capaciteKg: 3000 },
      { centreTriId: centre.id, categorie: 'CARTON', quantiteKg: 1100, capaciteKg: 3000 },
      { centreTriId: centre.id, categorie: 'VERRE', quantiteKg: 750, capaciteKg: 3000 },
      { centreTriId: centre.id, categorie: 'ORGANIQUE', quantiteKg: 1250, capaciteKg: 5000 },
    ],
  });

  await prisma.acheteur.createMany({
    data: [
      { nom: 'Guinee Plast Recyclage', contact: '+224624111111', matieres: 'PET, PEHD, PP' },
      { nom: 'Fonderie Conakry Metal', contact: '+224624222222', matieres: 'Ferraille, aluminium' },
      { nom: 'Cartonnerie Ouest Africaine', contact: '+224624333333', matieres: 'Papier, carton' },
    ],
  });

  console.log('Missions et pesees sur 30 jours...');
  const categoriesParBac = Object.fromEntries(BACS.map((b) => [b.numero, b.categorie]));

  // Les bacs sont charges une seule fois : la latence du proxy rend toute requete
  // dans la boucle prohibitive (plusieurs centaines d'allers-retours sinon).
  const tousLesBacs = await prisma.bac.findMany();
  const bacsParClient = new Map();
  for (const b of tousLesBacs) {
    if (!bacsParClient.has(b.clientId)) bacsParClient.set(b.clientId, {});
    bacsParClient.get(b.clientId)[b.numero] = b;
  }

  const missions = [];
  const missionBacs = [];
  const pesees = [];
  let compteur = 1200;

  for (let jour = 30; jour >= 0; jour--) {
    const date = new Date();
    date.setDate(date.getDate() - jour);
    date.setHours(8, 0, 0, 0);

    // Volume croissant dans le temps, pour que la courbe du tableau de bord ait du relief.
    const nbMissions = 3 + Math.floor(Math.random() * 4) + Math.floor((30 - jour) / 10);

    for (let n = 0; n < nbMissions; n++) {
      const user = clients[Math.floor(Math.random() * clients.length)];
      const collecteur = collecteurs[Math.floor(Math.random() * collecteurs.length)];
      const bac = bacsParClient.get(user.client.id)[1 + (n % 3)];

      const heure = new Date(date);
      heure.setMinutes(heure.getMinutes() + n * 45);

      // Les missions du jour restent en cours, les precedentes sont terminees.
      const estPassee = jour > 0;
      const statut = estPassee ? 'TERMINEE' : ['ACCEPTEE', 'EN_ROUTE', 'ARRIVE'][n % 3];
      const poids = Number((4 + Math.random() * 9).toFixed(1));
      const missionId = randomUUID();

      missions.push({
        id: missionId,
        reference: `#M-${compteur++}`,
        clientId: user.client.id,
        quartierId: user.client.quartierId,
        collecteurId: collecteur.collecteur.id,
        origine: n % 5 === 0 ? 'DEMANDE_IMMEDIATE' : 'PLANIFIEE',
        statut,
        datePlanifiee: heure,
        fenetreFin: new Date(heure.getTime() + 2 * 3_600_000),
        accepteeA: heure,
        enRouteA: statut !== 'ACCEPTEE' ? heure : null,
        arriveeA: ['ARRIVE', 'TERMINEE'].includes(statut) ? heure : null,
        termineeA: estPassee ? new Date(heure.getTime() + 20 * 60_000) : null,
        etaMinutes: estPassee ? null : 12,
        poidsTotalKg: estPassee ? poids : 0,
      });

      missionBacs.push({ missionId, bacId: bac.id });

      if (estPassee) {
        pesees.push({
          missionId,
          bacId: bac.id,
          categorie: categoriesParBac[bac.numero],
          poidsKg: poids,
          contaminationPct: Number((Math.random() * 12).toFixed(1)),
        });
      }
    }
  }

  await prisma.mission.createMany({ data: missions });
  await prisma.missionBac.createMany({ data: missionBacs });
  await prisma.pesee.createMany({ data: pesees });

  console.log('Paiements...');
  const paiements = [];
  for (const user of clients) {
    // Le mois 0 tombe dans la periode par defaut du tableau de bord (30 derniers
    // jours) : sans lui, les cartes de chiffre d'affaires afficheraient zero.
    for (let mois = 3; mois >= 0; mois--) {
      const debut = new Date();
      debut.setDate(debut.getDate() - mois * 30 - 3);
      const fin = new Date(debut);
      fin.setMonth(fin.getMonth() + 1);

      paiements.push({
        reference: `PAY-${user.client.id.slice(-4)}-${mois}`,
        clientId: user.client.id,
        montantGnf: 50_000,
        moyen: mois % 2 === 0 ? 'ORANGE_MONEY' : 'MTN_MOMO',
        statut: 'PAYE',
        payeLe: debut,
        periodeDebut: debut,
        periodeFin: fin,
      });
    }
  }
  await prisma.paiement.createMany({ data: paiements });

  console.log('Lots et ventes de matieres...');
  const acheteurs = await prisma.acheteur.findMany();
  const lots = [];
  const ventes = [];
  for (let i = 0; i < 6; i++) {
    const categorie = ['PLASTIQUE', 'METAL_FER', 'CARTON'][i % 3];
    const poids = 800 + i * 220;
    const prixKg = { PLASTIQUE: 1500, METAL_FER: 1100, CARTON: 650 }[categorie];
    const venteId = randomUUID();
    const dateVente = new Date();
    dateVente.setDate(dateVente.getDate() - i * 4 - 2);

    ventes.push({
      id: venteId,
      reference: `VTE-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      acheteurId: acheteurs[i % acheteurs.length].id,
      poidsTotalKg: poids,
      prixKgGnf: prixKg,
      montantGnf: poids * prixKg,
      dateVente,
      paye: i > 1,
    });

    lots.push({
      reference: `LOT-${categorie.slice(0, 3)}-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
      centreTriId: centre.id,
      categorie,
      poidsKg: poids,
      venteId,
    });
  }
  await prisma.vente.createMany({ data: ventes });
  await prisma.lot.createMany({ data: lots });

  console.log('Alertes...');
  await prisma.alerte.createMany({
    data: [
      { niveau: 'CRITIQUE', titre: 'Stock plastique presque plein', message: 'Capacite restante : 8%', lien: '/stock' },
      { niveau: 'ATTENTION', titre: 'Paiement echoue', message: 'Client : Amadou Barry', lien: '/paiements' },
      { niveau: 'INFO', titre: 'Nouveau client inscrit', message: 'Nom : Ousmane Diallo', lien: '/clients' },
      { niveau: 'ATTENTION', titre: 'Collecte en retard', message: 'Mission #M-1233', lien: '/collectes' },
    ],
  });

  const [nbUsers, nbMissions, nbPesees] = await Promise.all([
    prisma.user.count(),
    prisma.mission.count(),
    prisma.pesee.count(),
  ]);

  console.log('\nBase peuplee.');
  console.log(`  ${nbUsers} utilisateurs · ${nbMissions} missions · ${nbPesees} pesees`);
  console.log('\nComptes de demonstration (mot de passe commun) :');
  console.log(`  Admin      +224621000000 / ${MDP_DEMO}`);
  console.log(`  Collecteur +224623111222 / ${MDP_DEMO}`);
  console.log(`  Client     +224622123456 / ${MDP_DEMO}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
