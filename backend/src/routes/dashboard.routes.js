import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { parametre } from '../lib/config.js';

const router = Router();
router.use(authentifier, exigerRole('ADMIN', 'SUPERVISEUR'));

/** Bornes de periode : ?debut=ISO&fin=ISO, par defaut les 30 derniers jours. */
function periode(req) {
  const fin = req.query.fin ? new Date(req.query.fin) : new Date();
  const debut = req.query.debut
    ? new Date(req.query.debut)
    : new Date(fin.getTime() - 30 * 86_400_000);
  return { debut, fin };
}

function evolution(actuel, precedent) {
  if (!precedent) return null;
  return Number((((actuel - precedent) / precedent) * 100).toFixed(1));
}

/**
 * GET /api/dashboard
 * Alimente les cinq cartes du haut du back-office :
 * clients actifs, abonnements actifs, collectes realisees, dechets collectes, CA.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { debut, fin } = periode(req);
    const duree = fin.getTime() - debut.getTime();
    const debutPrec = new Date(debut.getTime() - duree);

    const dansPeriode = { gte: debut, lte: fin };
    const periodePrec = { gte: debutPrec, lt: debut };

    const [
      clientsActifs, clientsPrec,
      abonnementsActifs, abonnementsPrec,
      collectes, collectesPrec,
      tonnage, tonnagePrec,
      caAbo, caAboPrec,
      caRecyclage, caRecyclagePrec,
    ] = await Promise.all([
      prisma.client.count({ where: { user: { actif: true } } }),
      prisma.client.count({ where: { createdAt: { lt: debut } } }),
      prisma.abonnement.count({ where: { statut: 'ACTIF' } }),
      prisma.abonnement.count({ where: { statut: 'ACTIF', createdAt: { lt: debut } } }),
      prisma.mission.count({ where: { statut: 'TERMINEE', termineeA: dansPeriode } }),
      prisma.mission.count({ where: { statut: 'TERMINEE', termineeA: periodePrec } }),
      prisma.pesee.aggregate({ _sum: { poidsKg: true }, where: { createdAt: dansPeriode } }),
      prisma.pesee.aggregate({ _sum: { poidsKg: true }, where: { createdAt: periodePrec } }),
      prisma.paiement.aggregate({
        _sum: { montantGnf: true },
        where: { statut: 'PAYE', payeLe: dansPeriode },
      }),
      prisma.paiement.aggregate({
        _sum: { montantGnf: true },
        where: { statut: 'PAYE', payeLe: periodePrec },
      }),
      prisma.vente.aggregate({ _sum: { montantGnf: true }, where: { dateVente: dansPeriode } }),
      prisma.vente.aggregate({ _sum: { montantGnf: true }, where: { dateVente: periodePrec } }),
    ]);

    const revenusAbo = caAbo._sum.montantGnf ?? 0;
    const revenusRecyclage = caRecyclage._sum.montantGnf ?? 0;
    const revenusAboPrec = caAboPrec._sum.montantGnf ?? 0;
    const revenusRecyclagePrec = caRecyclagePrec._sum.montantGnf ?? 0;
    const tauxDepenses = await parametre('finance.tauxDepensesEstime');

    res.json({
      periode: { debut, fin },
      cartes: {
        clientsActifs: { valeur: clientsActifs, evolution: evolution(clientsActifs, clientsPrec) },
        abonnementsActifs: {
          valeur: abonnementsActifs,
          evolution: evolution(abonnementsActifs, abonnementsPrec),
        },
        collectesRealisees: { valeur: collectes, evolution: evolution(collectes, collectesPrec) },
        dechetsCollectesTonnes: {
          valeur: Number(((tonnage._sum.poidsKg ?? 0) / 1000).toFixed(2)),
          evolution: evolution(tonnage._sum.poidsKg ?? 0, tonnagePrec._sum.poidsKg ?? 0),
        },
        chiffreAffairesGnf: {
          valeur: revenusAbo + revenusRecyclage,
          evolution: evolution(
            revenusAbo + revenusRecyclage,
            revenusAboPrec + revenusRecyclagePrec,
          ),
        },
      },
      resumeFinancier: {
        revenusAbonnements: revenusAbo,
        revenusRecyclage,
        // Ratio provisoire, regle par parametre, en attendant la comptabilite analytique.
        depenses: Math.round((revenusAbo + revenusRecyclage) * tauxDepenses),
        beneficeNet: Math.round((revenusAbo + revenusRecyclage) * (1 - tauxDepenses)),
        tauxDepensesApplique: tauxDepenses,
      },
    });
  }),
);

/** GET /api/dashboard/collectes-par-jour — courbe "Collectes sur la periode". */
router.get(
  '/collectes-par-jour',
  asyncHandler(async (req, res) => {
    const { debut, fin } = periode(req);

    const missions = await prisma.mission.findMany({
      where: { statut: 'TERMINEE', termineeA: { gte: debut, lte: fin } },
      select: { termineeA: true },
    });

    const parJour = new Map();
    for (const m of missions) {
      const jour = m.termineeA.toISOString().slice(0, 10);
      parJour.set(jour, (parJour.get(jour) ?? 0) + 1);
    }

    // Les jours sans collecte doivent apparaitre a zero, sinon la courbe ment.
    const series = [];
    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
      const jour = d.toISOString().slice(0, 10);
      series.push({ date: jour, collectes: parJour.get(jour) ?? 0 });
    }

    res.json(series);
  }),
);

/** GET /api/dashboard/repartition-dechets — anneau "Repartition des dechets collectes". */
router.get(
  '/repartition-dechets',
  asyncHandler(async (req, res) => {
    const { debut, fin } = periode(req);

    const groupes = await prisma.pesee.groupBy({
      by: ['categorie'],
      _sum: { poidsKg: true },
      where: { createdAt: { gte: debut, lte: fin } },
    });

    const total = groupes.reduce((s, g) => s + (g._sum.poidsKg ?? 0), 0);

    res.json({
      totalTonnes: Number((total / 1000).toFixed(2)),
      categories: groupes
        .map((g) => ({
          categorie: g.categorie,
          tonnes: Number(((g._sum.poidsKg ?? 0) / 1000).toFixed(2)),
          pourcentage: total ? Number((((g._sum.poidsKg ?? 0) / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.tonnes - a.tonnes),
    });
  }),
);

/** GET /api/dashboard/top-zones — classement "Top 5 des zones". */
router.get(
  '/top-zones',
  asyncHandler(async (req, res) => {
    const { debut, fin } = periode(req);

    const missions = await prisma.mission.findMany({
      where: { statut: 'TERMINEE', termineeA: { gte: debut, lte: fin } },
      select: { poidsTotalKg: true, quartier: { include: { commune: true } } },
    });

    const parCommune = new Map();
    for (const m of missions) {
      const nom = m.quartier.commune.nom;
      parCommune.set(nom, (parCommune.get(nom) ?? 0) + m.poidsTotalKg);
    }

    res.json(
      [...parCommune.entries()]
        .map(([zone, kg]) => ({ zone, tonnes: Number((kg / 1000).toFixed(2)) }))
        .sort((a, b) => b.tonnes - a.tonnes)
        .slice(0, 5),
    );
  }),
);

/** GET /api/dashboard/missions-du-jour — bloc "Missions aujourd hui". */
router.get(
  '/missions-du-jour',
  asyncHandler(async (_req, res) => {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut.getTime() + 86_400_000);
    const where = { datePlanifiee: { gte: debut, lt: fin } };

    const [total, enCours, terminees, annulees] = await Promise.all([
      prisma.mission.count({ where }),
      prisma.mission.count({ where: { ...where, statut: { in: ['ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] } } }),
      prisma.mission.count({ where: { ...where, statut: 'TERMINEE' } }),
      prisma.mission.count({ where: { ...where, statut: 'ANNULEE' } }),
    ]);

    res.json({ total, enCours, terminees, annulees });
  }),
);

/** GET /api/dashboard/collectes-en-cours — tableau du back-office. */
router.get(
  '/collectes-en-cours',
  asyncHandler(async (_req, res) => {
    const missions = await prisma.mission.findMany({
      where: { statut: { in: ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] } },
      include: {
        client: { include: { user: true, quartier: { include: { commune: true } } } },
        collecteur: { include: { user: true } },
        bacs: { include: { bac: true } },
      },
      orderBy: { datePlanifiee: 'asc' },
      take: 20,
    });

    res.json(
      missions.map((m) => ({
        id: m.id,
        reference: m.reference,
        client: m.client.user.nom,
        zone: m.client.quartier.commune.nom,
        bacs: m.bacs.map((b) => ({ numero: b.bac.numero, categorie: b.bac.categorie })),
        collecteur: m.collecteur?.user.nom ?? null,
        heurePlanifiee: m.datePlanifiee,
        statut: m.statut,
      })),
    );
  }),
);

/** GET /api/dashboard/alertes */
router.get(
  '/alertes',
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.alerte.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    );
  }),
);

export default router;
