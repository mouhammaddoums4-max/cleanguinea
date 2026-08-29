import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import {
  debiterPoints, niveauPour, BAREME_DEFAUT, GNF_PAR_POINT, NIVEAUX,
} from '../lib/points.js';

const router = Router();
router.use(authentifier);

/** GET /api/points/mon-solde — ecran Points Clean. */
router.get(
  '/mon-solde',
  asyncHandler(async (req, res) => {
    const [solde, mouvements] = await Promise.all([
      prisma.soldePoints.findUnique({ where: { userId: req.user.id } }),
      prisma.mouvementPoints.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const cumule = solde?.cumule12Mois ?? 0;
    const niveau = niveauPour(cumule);
    const suivant = [...NIVEAUX].reverse().find((n) => n.seuil > cumule);

    res.json({
      solde: solde?.solde ?? 0,
      valeurGnf: (solde?.solde ?? 0) * GNF_PAR_POINT,
      cumule12Mois: cumule,
      niveau: niveau.nom,
      bonusPct: niveau.bonusPct,
      prochainNiveau: suivant ? { nom: suivant.nom, pointsRestants: suivant.seuil - cumule } : null,
      mouvements,
    });
  }),
);

/** GET /api/points/bareme — grille affichee dans l application. */
router.get(
  '/bareme',
  asyncHandler(async (_req, res) => {
    const enBase = await prisma.baremePoints.findMany({ where: { actif: true } });

    const bareme = Object.entries(BAREME_DEFAUT).map(([categorie, defaut]) => ({
      categorie,
      pointsParKg: enBase.find((b) => b.categorie === categorie)?.pointsParKg ?? defaut,
    }));

    res.json({ gnfParPoint: GNF_PAR_POINT, bareme, niveaux: NIVEAUX });
  }),
);

/**
 * POST /api/points/conversion
 * Les taux different selon la destination : le credit Mobile Money coute plus cher
 * en points car il supporte la commission de l operateur.
 */
const TAUX = {
  REDUCTION_ABONNEMENT: 100,
  CREDIT_MOBILE_MONEY: 110,
  BON_PARTENAIRE: 95,
  CADEAU_CATALOGUE: 100,
  DON_ASSOCIATION: 90,
};

const conversionSchema = z.object({
  type: z.enum(Object.keys(TAUX)),
  montantGnf: z.number().int().positive(),
});

router.post(
  '/conversion',
  asyncHandler(async (req, res) => {
    const { type, montantGnf } = conversionSchema.parse(req.body);

    // Plafond de 150 000 GNF par mois sur le credit Mobile Money.
    if (type === 'CREDIT_MOBILE_MONEY' && montantGnf > 150_000) {
      return res.status(400).json({ erreur: 'Plafond de 150 000 GNF par mois sur ce canal' });
    }

    const pointsRequis = Math.ceil((montantGnf / 1000) * TAUX[type]);

    const mouvement = await debiterPoints({
      userId: req.user.id,
      points: pointsRequis,
      motif: `Conversion ${type} - ${montantGnf.toLocaleString('fr-FR')} GNF`,
      conversion: type,
    });

    res.status(201).json({ mouvement, pointsUtilises: pointsRequis, montantGnf });
  }),
);

/** PUT /api/points/bareme — reglage du bareme depuis le back-office. */
router.put(
  '/bareme',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { categorie, pointsParKg } = z
      .object({
        categorie: z.enum([
          'PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS',
        ]),
        pointsParKg: z.number().int().min(0).max(200),
      })
      .parse(req.body);

    res.json(
      await prisma.baremePoints.upsert({
        where: { categorie },
        create: { categorie, pointsParKg },
        update: { pointsParKg, dateEffet: new Date() },
      }),
    );
  }),
);

export default router;
