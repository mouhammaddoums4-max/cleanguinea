import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';

const router = Router();

/**
 * GET /api/bannieres?langue=fr|en
 *
 * Encarts de l'ecran d'accueil. Public : l'accueil s'affiche avant que le
 * profil complet soit charge, et une banniere n'a rien de confidentiel.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const langue = req.query.langue === 'en' ? 'en' : 'fr';
    const maintenant = new Date();

    const bannieres = await prisma.banniere.findMany({
      where: {
        actif: true,
        // Une banniere sans dates est permanente ; avec dates, elle n'apparait
        // que dans sa fenetre.
        AND: [
          { OR: [{ debutLe: null }, { debutLe: { lte: maintenant } }] },
          { OR: [{ finLe: null }, { finLe: { gte: maintenant } }] },
        ],
      },
      orderBy: [{ ordre: 'asc' }, { createdAt: 'desc' }],
      take: 5,
    });

    res.set('Cache-Control', 'public, max-age=120');
    res.json(
      bannieres.map((b) => ({
        id: b.id,
        titre: (langue === 'en' && b.titreEn) || b.titre,
        sousTitre: (langue === 'en' && b.sousTitreEn) || b.sousTitre,
        imageUrl: b.imageUrl,
        couleur: b.couleur,
        lien: b.lien,
        libelleAction: (langue === 'en' && b.libelleActionEn) || b.libelleAction,
      })),
    );
  }),
);

/**
 * POST /api/bannieres/:id/vue et /clic
 * Compteurs d'usage : sans eux, personne ne sait si une banniere sert a
 * quelque chose. Public et sans authentification, comme l'affichage.
 */
for (const [chemin, champ] of [['vue', 'vues'], ['clic', 'clics']]) {
  router.post(
    `/:id/${chemin}`,
    asyncHandler(async (req, res) => {
      await prisma.banniere
        .update({ where: { id: req.params.id }, data: { [champ]: { increment: 1 } } })
        .catch(() => {
          // Une banniere supprimee entre l'affichage et le clic : sans importance.
        });
      res.status(204).end();
    }),
  );
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

router.use(authentifier, exigerRole('ADMIN'));

const banniereSchema = z.object({
  titre: z.string().min(2).max(80),
  titreEn: z.string().max(80).nullable().optional(),
  sousTitre: z.string().max(160).nullable().optional(),
  sousTitreEn: z.string().max(160).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  lien: z.string().max(300).nullable().optional(),
  libelleAction: z.string().max(40).nullable().optional(),
  libelleActionEn: z.string().max(40).nullable().optional(),
  actif: z.boolean().optional(),
  ordre: z.number().int().optional(),
  debutLe: z.string().datetime().nullable().optional(),
  finLe: z.string().datetime().nullable().optional(),
});

/** GET /api/bannieres/admin — toutes, avec leurs compteurs. */
router.get(
  '/admin',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.banniere.findMany({ orderBy: { ordre: 'asc' } }));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = banniereSchema.parse(req.body);
    res.status(201).json(
      await prisma.banniere.create({
        data: {
          ...data,
          debutLe: data.debutLe ? new Date(data.debutLe) : null,
          finLe: data.finLe ? new Date(data.finLe) : null,
        },
      }),
    );
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = banniereSchema.partial().parse(req.body);
    res.json(
      await prisma.banniere.update({
        where: { id: req.params.id },
        data: {
          ...data,
          ...(data.debutLe !== undefined
            ? { debutLe: data.debutLe ? new Date(data.debutLe) : null }
            : {}),
          ...(data.finLe !== undefined
            ? { finLe: data.finLe ? new Date(data.finLe) : null }
            : {}),
        },
      }),
    );
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.banniere.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

export default router;
