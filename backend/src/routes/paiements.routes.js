import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { debiterPoints, gnfParPoint } from '../lib/points.js';

const router = Router();
router.use(authentifier);

/** GET /api/paiements/mes-paiements — ecran "Paiements" de l application client. */
router.get(
  '/mes-paiements',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const [abonnement, paiements] = await Promise.all([
      prisma.abonnement.findFirst({
        where: { clientId: req.user.client.id, statut: 'ACTIF' },
        include: { offre: true },
      }),
      prisma.paiement.findMany({
        where: { clientId: req.user.client.id },
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
    ]);

    res.json({ abonnement, paiements });
  }),
);

/**
 * POST /api/paiements
 * Cree un paiement d abonnement. Les Points Clean peuvent couvrir tout ou partie
 * du montant : 100 points = 1 000 GNF.
 */
const paiementSchema = z.object({
  moyen: z.enum(['ORANGE_MONEY', 'MTN_MOMO', 'VISA', 'MASTERCARD', 'ESPECES']),
  pointsAUtiliser: z.number().int().min(0).default(0),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });
    const data = paiementSchema.parse(req.body);

    const abonnement = await prisma.abonnement.findFirst({
      where: { clientId: req.user.client.id, statut: 'ACTIF' },
      include: { offre: true },
    });
    if (!abonnement) return res.status(404).json({ erreur: 'Aucun abonnement actif' });

    const tarif = abonnement.offre.tarifMensuelGnf;

    // La remise ne peut jamais depasser le montant du mois.
    const tauxPoint = await gnfParPoint();
    const remiseGnf = Math.min(data.pointsAUtiliser * tauxPoint, tarif);
    const pointsReels = Math.floor(remiseGnf / tauxPoint);

    if (pointsReels > 0) {
      await debiterPoints({
        userId: req.user.id,
        points: pointsReels,
        motif: `Reduction abonnement ${abonnement.reference}`,
        conversion: 'REDUCTION_ABONNEMENT',
      });
    }

    const periodeDebut = new Date();
    const periodeFin = new Date(periodeDebut);
    periodeFin.setMonth(periodeFin.getMonth() + 1);

    const paiement = await prisma.paiement.create({
      data: {
        reference: `PAY-${Date.now()}`,
        clientId: req.user.client.id,
        abonnementId: abonnement.id,
        montantGnf: tarif - remiseGnf,
        remisePointsGnf: remiseGnf,
        moyen: data.moyen,
        // En production, le statut passe a PAYE sur le webhook de l operateur.
        statut: data.moyen === 'ESPECES' ? 'PAYE' : 'EN_ATTENTE',
        payeLe: data.moyen === 'ESPECES' ? new Date() : null,
        periodeDebut,
        periodeFin,
      },
    });

    res.status(201).json(paiement);
  }),
);

/**
 * POST /api/paiements/webhook/:operateur
 * Confirmation asynchrone d Orange Money / MTN MoMo.
 * En production : verifier la signature de l operateur avant de traiter.
 */
router.post(
  '/webhook/:operateur',
  asyncHandler(async (req, res) => {
    const { reference, statut, refOperateur } = z
      .object({
        reference: z.string(),
        statut: z.enum(['PAYE', 'ECHOUE']),
        refOperateur: z.string().optional(),
      })
      .parse(req.body);

    const paiement = await prisma.paiement.update({
      where: { reference },
      data: { statut, refOperateur, payeLe: statut === 'PAYE' ? new Date() : null },
    });

    if (statut === 'PAYE') {
      const prochain = new Date(paiement.periodeFin);
      await prisma.abonnement.update({
        where: { id: paiement.abonnementId },
        data: { statut: 'ACTIF', prochainPrelevement: prochain },
      });
    }

    res.json({ recu: true });
  }),
);

/** GET /api/paiements — liste back-office avec filtres. */
router.get(
  '/',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const { statut, page = '1', taille = '25' } = req.query;
    const prendre = Math.min(Number(taille), 100);
    const sauter = (Number(page) - 1) * prendre;

    const where = statut ? { statut } : {};

    const [total, paiements] = await Promise.all([
      prisma.paiement.count({ where }),
      prisma.paiement.findMany({
        where,
        include: { client: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
        skip: sauter,
        take: prendre,
      }),
    ]);

    res.json({ total, page: Number(page), paiements });
  }),
);

export default router;
