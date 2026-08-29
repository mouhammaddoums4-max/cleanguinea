import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import {
  calculerPoints, crediterPoints, poidsRecyclableDuMois, plafondKgMois, seuilContamination,
} from '../lib/points.js';
import { parametre } from '../lib/config.js';

const router = Router();
router.use(authentifier);

const missionComplete = {
  client: { include: { user: true, quartier: { include: { commune: true } } } },
  collecteur: { include: { user: true } },
  bacs: { include: { bac: true } },
  pesees: true,
};

async function prochaineReference() {
  const derniere = await prisma.mission.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { reference: true },
  });
  const numero = derniere ? parseInt(derniere.reference.replace(/\D/g, ''), 10) + 1 : 1000;
  return `#M-${numero}`;
}

/**
 * POST /api/missions/demande
 * Ecran "Demander une collecte" : bouton "Ma poubelle est pleine".
 */
const demandeSchema = z.object({
  bacIds: z.array(z.string()).min(1, 'Selectionnez au moins un bac'),
  immediate: z.boolean().default(true),
  datePlanifiee: z.string().datetime().optional(),
  commentaire: z.string().optional(),
});

router.post(
  '/demande',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const data = demandeSchema.parse(req.body);
    const client = await prisma.client.findUnique({
      where: { id: req.user.client.id },
      include: { bacs: true },
    });

    // Un client ne peut demander la collecte que de ses propres bacs.
    const bacsAutorises = new Set(client.bacs.map((b) => b.id));
    const inconnus = data.bacIds.filter((id) => !bacsAutorises.has(id));
    if (inconnus.length) {
      return res.status(400).json({ erreur: 'Un ou plusieurs bacs ne vous appartiennent pas' });
    }

    // Une seule demande ouverte a la fois, pour eviter les doublons.
    const dejaOuverte = await prisma.mission.findFirst({
      where: {
        clientId: client.id,
        origine: { in: ['DEMANDE_IMMEDIATE', 'DEMANDE_PROGRAMMEE'] },
        statut: { in: ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] },
      },
    });
    if (dejaOuverte) {
      return res.status(409).json({
        erreur: 'Une demande est deja en cours',
        mission: { reference: dejaOuverte.reference, statut: dejaOuverte.statut },
      });
    }

    const datePlanifiee = data.immediate
      ? new Date()
      : new Date(data.datePlanifiee ?? Date.now() + 86_400_000);

    const mission = await prisma.mission.create({
      data: {
        reference: await prochaineReference(),
        clientId: client.id,
        quartierId: client.quartierId,
        origine: data.immediate ? 'DEMANDE_IMMEDIATE' : 'DEMANDE_PROGRAMMEE',
        statut: 'EN_ATTENTE',
        datePlanifiee,
        commentaire: data.commentaire,
        bacs: { create: data.bacIds.map((bacId) => ({ bacId })) },
      },
      include: missionComplete,
    });

    res.status(201).json(mission);
  }),
);

/** GET /api/missions/mes-collectes — historique du client connecte. */
router.get(
  '/mes-collectes',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const { mois, annee } = req.query;
    const where = { clientId: req.user.client.id };

    if (mois && annee) {
      const debut = new Date(Number(annee), Number(mois) - 1, 1);
      const fin = new Date(Number(annee), Number(mois), 1);
      where.datePlanifiee = { gte: debut, lt: fin };
    }

    const missions = await prisma.mission.findMany({
      where,
      include: missionComplete,
      orderBy: { datePlanifiee: 'desc' },
      take: 100,
    });

    res.json(missions);
  }),
);

/** GET /api/missions/en-cours — suivi temps reel cote client. */
router.get(
  '/en-cours',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const mission = await prisma.mission.findFirst({
      where: {
        clientId: req.user.client.id,
        statut: { in: ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] },
      },
      include: missionComplete,
      orderBy: { datePlanifiee: 'asc' },
    });

    res.json(mission);
  }),
);

/** GET /api/missions/mes-missions — tableau de bord du collecteur. */
router.get(
  '/mes-missions',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    if (!req.user.collecteur) return res.status(403).json({ erreur: 'Reserve aux collecteurs' });

    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date(debutJour.getTime() + 86_400_000);

    const where = {
      collecteurId: req.user.collecteur.id,
      datePlanifiee: { gte: debutJour, lt: finJour },
    };

    const [missions, total, terminees, enCours] = await Promise.all([
      prisma.mission.findMany({ where, include: missionComplete, orderBy: { datePlanifiee: 'asc' } }),
      prisma.mission.count({ where }),
      prisma.mission.count({ where: { ...where, statut: 'TERMINEE' } }),
      prisma.mission.count({ where: { ...where, statut: { in: ['ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] } } }),
    ]);

    res.json({ missions, resume: { total, terminees, enCours } });
  }),
);

/** GET /api/missions/:id */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const mission = await prisma.mission.findUnique({
      where: { id: req.params.id },
      include: missionComplete,
    });
    if (!mission) return res.status(404).json({ erreur: 'Mission introuvable' });

    const estLeClient = req.user.client?.id === mission.clientId;
    const estLeCollecteur = req.user.collecteur?.id === mission.collecteurId;
    const estAdmin = ['ADMIN', 'SUPERVISEUR'].includes(req.user.role);
    if (!estLeClient && !estLeCollecteur && !estAdmin) {
      return res.status(403).json({ erreur: 'Acces refuse' });
    }

    res.json(mission);
  }),
);

/**
 * PATCH /api/missions/:id/statut
 * Fait avancer la mission : ACCEPTEE -> EN_ROUTE -> ARRIVE -> TERMINEE.
 */
const TRANSITIONS = {
  EN_ATTENTE: ['ACCEPTEE', 'ANNULEE'],
  ACCEPTEE: ['EN_ROUTE', 'ANNULEE'],
  EN_ROUTE: ['ARRIVE', 'ANNULEE', 'MANQUEE'],
  ARRIVE: ['TERMINEE', 'MANQUEE'],
  TERMINEE: [],
  ANNULEE: [],
  MANQUEE: [],
};

const HORODATAGE = {
  ACCEPTEE: 'accepteeA',
  EN_ROUTE: 'enRouteA',
  ARRIVE: 'arriveeA',
  TERMINEE: 'termineeA',
};

const statutSchema = z.object({
  statut: z.enum(['ACCEPTEE', 'EN_ROUTE', 'ARRIVE', 'TERMINEE', 'ANNULEE', 'MANQUEE']),
  etaMinutes: z.number().int().positive().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  motifAnnulation: z.string().optional(),
});

router.patch(
  '/:id/statut',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const data = statutSchema.parse(req.body);
    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ erreur: 'Mission introuvable' });

    if (!TRANSITIONS[mission.statut].includes(data.statut)) {
      return res.status(409).json({
        erreur: `Transition impossible : ${mission.statut} -> ${data.statut}`,
      });
    }

    const maj = {
      statut: data.statut,
      etaMinutes: data.etaMinutes ?? mission.etaMinutes,
      latitude: data.latitude ?? mission.latitude,
      longitude: data.longitude ?? mission.longitude,
      motifAnnulation: data.motifAnnulation,
    };
    if (HORODATAGE[data.statut]) maj[HORODATAGE[data.statut]] = new Date();

    // Le collecteur s attribue la mission en l acceptant.
    if (data.statut === 'ACCEPTEE' && req.user.collecteur) {
      maj.collecteurId = req.user.collecteur.id;
    }

    res.json(
      await prisma.mission.update({
        where: { id: mission.id },
        data: maj,
        include: missionComplete,
      }),
    );
  }),
);

/**
 * POST /api/missions/:id/collecte
 * Ecran "Confirmer la collecte" : poids, photo, puis credit des Points Clean.
 */
const collecteSchema = z.object({
  clientRef: z.string().uuid().optional(),
  photoUrl: z.string().url().optional(),
  pesees: z
    .array(
      z.object({
        bacId: z.string().optional(),
        categorie: z.enum([
          'PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS',
        ]),
        poidsKg: z.number().positive('Le poids doit etre superieur a 0'),
        peseeCertifiee: z.boolean().default(true),
        contaminationPct: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1, 'Au moins une pesee est requise'),
});

router.post(
  '/:id/collecte',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const data = collecteSchema.parse(req.body);

    // Idempotence : une tournee synchronisee deux fois ne cree qu une seule collecte.
    if (data.clientRef) {
      const deja = await prisma.mission.findUnique({
        where: { clientRef: data.clientRef },
        include: missionComplete,
      });
      if (deja) return res.status(200).json({ ...deja, deduplique: true });
    }

    const mission = await prisma.mission.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { user: true } } },
    });
    if (!mission) return res.status(404).json({ erreur: 'Mission introuvable' });
    if (mission.statut === 'TERMINEE') {
      return res.status(409).json({ erreur: 'Mission deja terminee' });
    }

    const poidsTotal = data.pesees.reduce((s, p) => s + p.poidsKg, 0);
    const seuilContam = await seuilContamination();

    const misAJour = await prisma.$transaction(async (tx) => {
      await tx.pesee.createMany({
        data: data.pesees.map((p) => ({
          missionId: mission.id,
          bacId: p.bacId,
          categorie: p.categorie,
          poidsKg: p.poidsKg,
          peseeCertifiee: p.peseeCertifiee,
          contaminationPct: p.contaminationPct,
          declassee: (p.contaminationPct ?? 0) > seuilContam,
        })),
      });

      // Les bacs collectes repassent a vide.
      if (data.pesees.some((p) => p.bacId)) {
        await tx.bac.updateMany({
          where: { id: { in: data.pesees.filter((p) => p.bacId).map((p) => p.bacId) } },
          data: { niveauTiers: 0 },
        });
      }

      // Entree en stock au centre de tri.
      const centre = await tx.centreTri.findFirst({ where: { actif: true } });
      if (centre) {
        for (const p of data.pesees) {
          await tx.stock.upsert({
            where: { centreTriId_categorie: { centreTriId: centre.id, categorie: p.categorie } },
            create: {
              centreTriId: centre.id,
              categorie: p.categorie,
              quantiteKg: p.poidsKg,
              capaciteKg: await parametre('tri.capaciteParCategorieKg'),
            },
            update: { quantiteKg: { increment: p.poidsKg } },
          });
        }
      }

      return tx.mission.update({
        where: { id: mission.id },
        data: {
          statut: 'TERMINEE',
          termineeA: new Date(),
          poidsTotalKg: poidsTotal,
          photoUrl: data.photoUrl,
          clientRef: data.clientRef,
        },
        include: missionComplete,
      });
    });

    // Points Clean, hors transaction : un echec ici ne doit pas annuler la collecte.
    const solde = await prisma.soldePoints.findUnique({
      where: { userId: mission.client.userId },
    });
    const dejaPese = await poidsRecyclableDuMois(mission.clientId);
    const plafond = await plafondKgMois();

    let pointsTotal = 0;
    for (const p of data.pesees) {
      if (dejaPese > plafond) break; // plafond anti-fraude atteint
      pointsTotal += await calculerPoints({
        categorie: p.categorie,
        poidsKg: p.poidsKg,
        declassee: (p.contaminationPct ?? 0) > seuilContam,
        cumule12Mois: solde?.cumule12Mois ?? 0,
      });
    }

    if (pointsTotal > 0) {
      await crediterPoints({
        userId: mission.client.userId,
        points: pointsTotal,
        motif: `Collecte ${mission.reference} - ${poidsTotal.toFixed(1)} kg`,
      });
    }

    res.status(201).json({ ...misAJour, pointsCredites: pointsTotal });
  }),
);

/** POST /api/missions/:id/evaluation — le client note le collecteur (etoiles). */
router.post(
  '/:id/evaluation',
  asyncHandler(async (req, res) => {
    const { note, commentaire } = z
      .object({ note: z.number().int().min(1).max(5), commentaire: z.string().optional() })
      .parse(req.body);

    const mission = await prisma.mission.findUnique({ where: { id: req.params.id } });
    if (!mission) return res.status(404).json({ erreur: 'Mission introuvable' });
    if (req.user.client?.id !== mission.clientId) {
      return res.status(403).json({ erreur: 'Seul le client de la mission peut l evaluer' });
    }
    if (mission.statut !== 'TERMINEE' || !mission.collecteurId) {
      return res.status(409).json({ erreur: 'La mission doit etre terminee' });
    }

    const evaluation = await prisma.$transaction(async (tx) => {
      const creee = await tx.evaluation.create({
        data: { missionId: mission.id, collecteurId: mission.collecteurId, note, commentaire },
      });

      // Moyenne recalculee de facon incrementale.
      const c = await tx.collecteur.findUnique({ where: { id: mission.collecteurId } });
      const nb = c.nbEvaluations + 1;
      await tx.collecteur.update({
        where: { id: c.id },
        data: {
          note: Number(((c.note * c.nbEvaluations + note) / nb).toFixed(2)),
          nbEvaluations: nb,
        },
      });

      return creee;
    });

    res.status(201).json(evaluation);
  }),
);

export default router;
