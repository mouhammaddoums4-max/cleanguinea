import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { chargerConfig, inviderCacheConfig, traduire } from '../lib/config.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';

const router = Router();

/**
 * GET /api/config?langue=fr|en
 *
 * Tout ce que les applications affichaient auparavant en dur : libelles des
 * categories, couleurs, offres et tarifs, taux de conversion, niveaux de
 * fidelite et parametres. Public : necessaire avant toute connexion (ecran
 * d'inscription, grille tarifaire).
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const langue = req.query.langue === 'en' ? 'en' : 'fr';
    const config = await chargerConfig();

    // Ces valeurs changent rarement : on autorise un cache court cote client.
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ langue, ...traduire(config, langue) });
  }),
);

/** GET /api/config/langues — langues proposees par l'application. */
router.get(
  '/langues',
  asyncHandler(async (_req, res) => {
    const config = await chargerConfig();
    res.json(config.parametres['app.languesDisponibles'] ?? ['fr', 'en']);
  }),
);

// ---------------------------------------------------------------------------
// Administration des referentiels
// ---------------------------------------------------------------------------

router.use(authentifier, exigerRole('ADMIN'));

/** GET /api/config/admin — configuration brute, bilingue, pour le back-office. */
router.get(
  '/admin',
  asyncHandler(async (_req, res) => {
    res.json(await chargerConfig());
  }),
);

/** PUT /api/config/parametres/:cle */
router.put(
  '/parametres/:cle',
  asyncHandler(async (req, res) => {
    const { valeur } = z.object({ valeur: z.union([z.string(), z.number(), z.boolean()]) })
      .parse(req.body);

    const existant = await prisma.parametre.findUnique({ where: { cle: req.params.cle } });
    if (!existant) return res.status(404).json({ erreur: 'Parametre inconnu' });
    if (!existant.modifiable) {
      return res.status(403).json({ erreur: 'Ce parametre n est pas modifiable' });
    }

    const misAJour = await prisma.parametre.update({
      where: { cle: req.params.cle },
      data: { valeur: String(valeur) },
    });

    inviderCacheConfig();
    res.json(misAJour);
  }),
);

/** PUT /api/config/categories/:code */
router.put(
  '/categories/:code',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        libelleFr: z.string().min(1).optional(),
        libelleEn: z.string().min(1).optional(),
        couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        couleurFond: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        recyclable: z.boolean().optional(),
        ordre: z.number().int().optional(),
        actif: z.boolean().optional(),
      })
      .parse(req.body);

    const misAJour = await prisma.categorieConfig.update({
      where: { code: req.params.code },
      data,
    });

    inviderCacheConfig();
    res.json(misAJour);
  }),
);

/** PUT /api/config/conversions/:type */
router.put(
  '/conversions/:type',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        libelleFr: z.string().min(1).optional(),
        libelleEn: z.string().min(1).optional(),
        pointsPour1000Gnf: z.number().int().positive().optional(),
        plafondMensuelGnf: z.number().int().positive().nullable().optional(),
        soldeMinimumPoints: z.number().int().min(0).optional(),
        actif: z.boolean().optional(),
      })
      .parse(req.body);

    const misAJour = await prisma.tauxConversion.update({
      where: { type: req.params.type },
      data,
    });

    inviderCacheConfig();
    res.json(misAJour);
  }),
);

/** PUT /api/config/niveaux/:code */
router.put(
  '/niveaux/:code',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        libelleFr: z.string().min(1).optional(),
        libelleEn: z.string().min(1).optional(),
        seuil: z.number().int().min(0).optional(),
        bonusPct: z.number().int().min(0).max(100).optional(),
      })
      .parse(req.body);

    const misAJour = await prisma.niveauFidelite.update({ where: { code: req.params.code }, data });

    inviderCacheConfig();
    res.json(misAJour);
  }),
);

/** PUT /api/config/offres/:type — tarifs et fréquences. */
router.put(
  '/offres/:type',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        libelle: z.string().min(1).optional(),
        tarifMensuelGnf: z.number().int().positive().optional(),
        passagesParSemaine: z.number().int().positive().optional(),
        nbBacsFournis: z.number().int().min(0).optional(),
        actif: z.boolean().optional(),
      })
      .parse(req.body);

    const misAJour = await prisma.offre.update({ where: { type: req.params.type }, data });

    inviderCacheConfig();
    res.json(misAJour);
  }),
);

export default router;
