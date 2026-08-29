import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';

const router = Router();
router.use(authentifier);

/** GET /api/bacs/mes-bacs — bloc "Mes bacs" de l ecran d accueil. */
router.get(
  '/mes-bacs',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const bacs = await prisma.bac.findMany({
      where: { clientId: req.user.client.id, enService: true },
      orderBy: { numero: 'asc' },
    });

    res.json(
      bacs.map((b) => ({
        ...b,
        libelleNiveau: `${b.niveauTiers}/3 plein`,
        pleinAConfirmer: b.niveauTiers >= 2,
      })),
    );
  }),
);

/** PATCH /api/bacs/:id/niveau — le client declare le remplissage (0 a 3 tiers). */
router.patch(
  '/:id/niveau',
  asyncHandler(async (req, res) => {
    const { niveauTiers } = z.object({ niveauTiers: z.number().int().min(0).max(3) }).parse(req.body);

    const bac = await prisma.bac.findUnique({ where: { id: req.params.id } });
    if (!bac) return res.status(404).json({ erreur: 'Bac introuvable' });
    if (bac.clientId !== req.user.client?.id && req.user.role === 'CLIENT') {
      return res.status(403).json({ erreur: 'Ce bac ne vous appartient pas' });
    }

    res.json(await prisma.bac.update({ where: { id: bac.id }, data: { niveauTiers } }));
  }),
);

/** GET /api/bacs/qr/:codeQr — scan par l application collecteur. */
router.get(
  '/qr/:codeQr',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const bac = await prisma.bac.findUnique({
      where: { codeQr: req.params.codeQr },
      include: {
        client: { include: { user: true, quartier: { include: { commune: true } } } },
      },
    });
    if (!bac) return res.status(404).json({ erreur: 'QR code inconnu' });
    res.json(bac);
  }),
);

export default router;
