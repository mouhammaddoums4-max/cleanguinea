import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { construireCodeQr, lireCodeQr } from '../lib/qr.js';

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

/**
 * GET /api/bacs/qr/:codeQr — scan par l application collecteur.
 *
 * Le code porte l identifiant du client (CG-2026-000001-B1) : le collecteur
 * sait chez qui il se trouve des la lecture, sans reseau.
 */
router.get(
  '/qr/:codeQr',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const lu = lireCodeQr(req.params.codeQr);
    if (!lu) {
      return res.status(400).json({
        erreur: 'Ce code n est pas un bac Clean Guinee',
        attendu: 'CG-AAAA-NNNNNN-B1',
      });
    }

    const bac = await prisma.bac.findUnique({
      where: { codeQr: lu.codeQr },
      include: {
        client: {
          include: {
            user: { select: { nom: true, telephone: true } },
            quartier: { include: { commune: true } },
            abonnements: { where: { statut: 'ACTIF' }, take: 1 },
          },
        },
      },
    });
    if (!bac) return res.status(404).json({ erreur: 'QR code inconnu' });
    if (!bac.client) return res.status(409).json({ erreur: 'Ce bac n est affecte a personne' });

    res.json({
      ...bac,
      referenceAbonnement: lu.referenceAbonnement,
      // Un abonnement suspendu doit se voir a l ecran : le collecteur decide
      // ensuite avec son superviseur, il ne refuse pas de lui-meme.
      abonnementActif: bac.client.abonnements.length > 0,
    });
  }),
);

// ---------------------------------------------------------------------------
// Gestion du parc, cote administrateur
// ---------------------------------------------------------------------------

/** GET /api/bacs — inventaire du parc, avec filtres. */
router.get(
  '/',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const { etat, affecte, page = '1', taille = '50' } = req.query;
    const prendre = Math.min(Number(taille), 200);

    const where = {
      ...(etat ? { etat } : {}),
      ...(affecte === 'false' ? { clientId: null } : {}),
      ...(affecte === 'true' ? { NOT: { clientId: null } } : {}),
    };

    const [total, bacs] = await Promise.all([
      prisma.bac.count({ where }),
      prisma.bac.findMany({
        where,
        include: {
          client: {
            include: {
              user: { select: { nom: true, telephone: true } },
              quartier: { include: { commune: true } },
            },
          },
        },
        orderBy: { codeQr: 'asc' },
        skip: (Number(page) - 1) * prendre,
        take: prendre,
      }),
    ]);

    res.json({ total, page: Number(page), bacs });
  }),
);

/**
 * POST /api/bacs — met un bac en service pour un client.
 * Le code QR est deduit du numero d abonnement : il n est jamais saisi a la
 * main, ce qui evite les fautes de frappe sur des etiquettes qu on colle.
 */
router.post(
  '/',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        clientId: z.string(),
        numero: z.number().int().min(1).max(9),
        categorie: z.enum([
          'PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS',
        ]),
        volumeLitres: z.number().int().positive().optional(),
      })
      .parse(req.body);

    const abonnement = await prisma.abonnement.findFirst({
      where: { clientId: data.clientId },
      orderBy: { createdAt: 'asc' },
      select: { reference: true },
    });
    if (!abonnement) {
      return res.status(409).json({ erreur: 'Ce client n a pas encore de numero d abonnement' });
    }

    const codeQr = construireCodeQr(abonnement.reference, data.numero);

    const existant = await prisma.bac.findUnique({ where: { codeQr } });
    if (existant) {
      return res.status(409).json({ erreur: `Le bac ${codeQr} existe deja` });
    }

    res.status(201).json(
      await prisma.bac.create({
        data: { ...data, codeQr, dateRemise: new Date() },
        include: { client: { include: { user: { select: { nom: true } } } } },
      }),
    );
  }),
);

/** PUT /api/bacs/:id — etat, categorie, reaffectation. */
router.put(
  '/:id',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        etat: z.enum(['BON', 'ABIME', 'PERDU', 'REMPLACE']).optional(),
        categorie: z.enum([
          'PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS',
        ]).optional(),
        volumeLitres: z.number().int().positive().optional(),
        enService: z.boolean().optional(),
        imprimeLe: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);

    res.json(
      await prisma.bac.update({
        where: { id: req.params.id },
        data: {
          ...data,
          ...(data.imprimeLe !== undefined
            ? { imprimeLe: data.imprimeLe ? new Date(data.imprimeLe) : null }
            : {}),
          // Un bac perdu ou remplace sort du service, sans quoi il resterait
          // scannable et fausserait les tournees.
          ...(data.etat === 'PERDU' || data.etat === 'REMPLACE' ? { enService: false } : {}),
        },
      }),
    );
  }),
);

/** GET /api/bacs/:id/etiquette — donnees a imprimer sur l etiquette. */
router.get(
  '/:id/etiquette',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const bac = await prisma.bac.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          include: {
            user: { select: { nom: true } },
            quartier: { include: { commune: true } },
          },
        },
      },
    });
    if (!bac) return res.status(404).json({ erreur: 'Bac introuvable' });

    res.json({
      codeQr: bac.codeQr,
      numero: bac.numero,
      categorie: bac.categorie,
      volumeLitres: bac.volumeLitres,
      client: bac.client?.user.nom ?? null,
      zone: bac.client
        ? `${bac.client.quartier.nom}, ${bac.client.quartier.commune.nom}`
        : null,
    });
  }),
);

export default router;
