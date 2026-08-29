import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { debiterPoints, niveauPour, gnfParPoint } from '../lib/points.js';
import { chargerConfig, traduire } from '../lib/config.js';

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
    const niveau = await niveauPour(cumule);
    const suffixe = req.query.langue === 'en' ? 'En' : 'Fr';

    const { niveaux } = await chargerConfig();
    // niveaux est trie par seuil decroissant : on le remonte pour trouver le suivant.
    const suivant = [...niveaux].reverse().find((n) => n.seuil > cumule);

    res.json({
      solde: solde?.solde ?? 0,
      valeurGnf: (solde?.solde ?? 0) * (await gnfParPoint()),
      cumule12Mois: cumule,
      niveau: niveau.code,
      niveauLibelle: niveau['libelle' + suffixe],
      bonusPct: niveau.bonusPct,
      prochainNiveau: suivant
        ? {
            code: suivant.code,
            libelle: suivant['libelle' + suffixe],
            pointsRestants: suivant.seuil - cumule,
          }
        : null,
      mouvements,
    });
  }),
);

/** GET /api/points/bareme — grille affichee dans l application. */
router.get(
  '/bareme',
  asyncHandler(async (req, res) => {
    const langue = req.query.langue === 'en' ? 'en' : 'fr';
    const config = await chargerConfig();
    const traduit = traduire(config, langue);

    const enBase = await prisma.baremePoints.findMany({ where: { actif: true } });

    // Le bareme suit l'ordre et les libelles du referentiel des categories.
    const bareme = traduit.categories.map((c) => ({
      categorie: c.code,
      libelle: c.libelle,
      couleur: c.couleur,
      pointsParKg: enBase.find((b) => b.categorie === c.code)?.pointsParKg ?? 0,
    }));

    res.json({
      gnfParPoint: config.parametres['points.gnfParPoint'],
      validiteMois: config.parametres['points.validiteMois'],
      bareme,
      niveaux: traduit.niveaux,
      conversions: traduit.conversions,
    });
  }),
);

/**
 * POST /api/points/conversion
 * Les taux different selon la destination : le credit Mobile Money coute plus cher
 * en points car il supporte la commission de l operateur.
 */
const conversionSchema = z.object({
  type: z.enum([
    'REDUCTION_ABONNEMENT', 'CREDIT_MOBILE_MONEY', 'BON_PARTENAIRE',
    'CADEAU_CATALOGUE', 'DON_ASSOCIATION',
  ]),
  montantGnf: z.number().int().positive(),
});

router.post(
  '/conversion',
  asyncHandler(async (req, res) => {
    const { type, montantGnf } = conversionSchema.parse(req.body);

    // Taux, plafond et solde minimum viennent tous du referentiel.
    const { taux } = await chargerConfig();
    const regle = taux.find((t) => t.type === type);
    if (!regle) {
      return res.status(400).json({ erreur: 'Ce mode de conversion est indisponible' });
    }

    if (regle.plafondMensuelGnf !== null && montantGnf > regle.plafondMensuelGnf) {
      return res.status(400).json({
        erreur: `Plafond de ${regle.plafondMensuelGnf.toLocaleString('fr-FR')} GNF par mois sur ce canal`,
      });
    }

    const pointsRequis = Math.ceil((montantGnf / 1000) * regle.pointsPour1000Gnf);

    if (pointsRequis < regle.soldeMinimumPoints) {
      return res.status(400).json({
        erreur: `Minimum de ${regle.soldeMinimumPoints} points requis pour ce canal`,
      });
    }

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
