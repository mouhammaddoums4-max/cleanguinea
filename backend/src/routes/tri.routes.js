import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';

const router = Router();
router.use(authentifier, exigerRole('ADMIN', 'SUPERVISEUR'));

/** GET /api/tri/stock — bloc "Stock par categorie" du tableau de bord. */
router.get(
  '/stock',
  asyncHandler(async (_req, res) => {
    const stocks = await prisma.stock.findMany({
      include: { centreTri: true },
      orderBy: { quantiteKg: 'desc' },
    });

    res.json(
      stocks.map((s) => ({
        ...s,
        tonnes: Number((s.quantiteKg / 1000).toFixed(2)),
        tauxRemplissage: Number(((s.quantiteKg / s.capaciteKg) * 100).toFixed(1)),
        capaciteRestantePct: Number((100 - (s.quantiteKg / s.capaciteKg) * 100).toFixed(1)),
      })),
    );
  }),
);

/**
 * POST /api/tri/lots
 * Constitue un lot (balle pressee) et le sort du stock.
 */
const lotSchema = z.object({
  centreTriId: z.string(),
  categorie: z.enum(['PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS']),
  poidsKg: z.number().positive(),
});

router.post(
  '/lots',
  asyncHandler(async (req, res) => {
    const data = lotSchema.parse(req.body);

    const stock = await prisma.stock.findUnique({
      where: { centreTriId_categorie: { centreTriId: data.centreTriId, categorie: data.categorie } },
    });
    if (!stock || stock.quantiteKg < data.poidsKg) {
      return res.status(400).json({
        erreur: `Stock insuffisant : ${stock?.quantiteKg ?? 0} kg disponibles`,
      });
    }

    const nb = await prisma.lot.count();
    const prefixe = data.categorie.slice(0, 3);

    const lot = await prisma.$transaction(async (tx) => {
      await tx.stock.update({
        where: { id: stock.id },
        data: { quantiteKg: { decrement: data.poidsKg } },
      });

      return tx.lot.create({
        data: {
          reference: `LOT-${prefixe}-${new Date().getFullYear()}-${String(nb + 1).padStart(3, '0')}`,
          centreTriId: data.centreTriId,
          categorie: data.categorie,
          poidsKg: data.poidsKg,
        },
      });
    });

    res.status(201).json(lot);
  }),
);

/** GET /api/tri/lots — lots disponibles ou vendus. */
router.get(
  '/lots',
  asyncHandler(async (req, res) => {
    const where = req.query.disponibles === 'true' ? { venteId: null } : {};
    res.json(
      await prisma.lot.findMany({
        where,
        include: { centreTri: true, vente: { include: { acheteur: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  }),
);

/**
 * POST /api/tri/ventes
 * Vend un ensemble de lots a un acheteur. Le montant est calcule serveur :
 * ne jamais faire confiance a un total envoye par le client.
 */
const venteSchema = z.object({
  acheteurId: z.string(),
  lotIds: z.array(z.string()).min(1),
  prixKgGnf: z.number().int().positive(),
});

router.post(
  '/ventes',
  asyncHandler(async (req, res) => {
    const data = venteSchema.parse(req.body);

    const lots = await prisma.lot.findMany({ where: { id: { in: data.lotIds } } });
    if (lots.length !== data.lotIds.length) {
      return res.status(400).json({ erreur: 'Un ou plusieurs lots sont introuvables' });
    }
    const dejaVendus = lots.filter((l) => l.venteId);
    if (dejaVendus.length) {
      return res.status(409).json({
        erreur: `Lots deja vendus : ${dejaVendus.map((l) => l.reference).join(', ')}`,
      });
    }

    const poidsTotalKg = lots.reduce((s, l) => s + l.poidsKg, 0);
    const nb = await prisma.vente.count();

    const vente = await prisma.$transaction(async (tx) => {
      const creee = await tx.vente.create({
        data: {
          reference: `VTE-${new Date().getFullYear()}-${String(nb + 1).padStart(4, '0')}`,
          acheteurId: data.acheteurId,
          poidsTotalKg,
          prixKgGnf: data.prixKgGnf,
          montantGnf: Math.round(poidsTotalKg * data.prixKgGnf),
        },
      });

      await tx.lot.updateMany({
        where: { id: { in: data.lotIds } },
        data: { venteId: creee.id },
      });

      return creee;
    });

    res.status(201).json(
      await prisma.vente.findUnique({
        where: { id: vente.id },
        include: { acheteur: true, lots: true },
      }),
    );
  }),
);

/** GET /api/tri/ventes */
router.get(
  '/ventes',
  asyncHandler(async (_req, res) => {
    res.json(
      await prisma.vente.findMany({
        include: { acheteur: true, lots: true },
        orderBy: { dateVente: 'desc' },
        take: 100,
      }),
    );
  }),
);

/** GET /api/tri/acheteurs · POST /api/tri/acheteurs */
router.get(
  '/acheteurs',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.acheteur.findMany({ orderBy: { nom: 'asc' } }));
  }),
);

router.post(
  '/acheteurs',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        nom: z.string().min(2),
        contact: z.string().optional(),
        matieres: z.string().optional(),
      })
      .parse(req.body);

    res.status(201).json(await prisma.acheteur.create({ data }));
  }),
);

export default router;
