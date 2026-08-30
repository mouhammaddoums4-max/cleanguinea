import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { enregistrerAppareil, notifierPlusieurs } from '../lib/notifications.js';

const router = Router();
router.use(authentifier);

const TYPES = [
  'COLLECTE_PLANIFIEE', 'COLLECTEUR_EN_ROUTE', 'COLLECTE_TERMINEE', 'POINTS_CREDITES',
  'PAIEMENT_DU', 'PAIEMENT_RECU', 'ZONE_AFFECTEE', 'INFORMATION',
];

/** GET /api/notifications — liste, avec le nombre de non lues. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 50, 100);

    const [notifications, nonLues] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: limite,
      }),
      prisma.notification.count({ where: { userId: req.user.id, lue: false } }),
    ]);

    res.json({ notifications, nonLues });
  }),
);

/** GET /api/notifications/compteur — pastille de la barre d'onglets. */
router.get(
  '/compteur',
  asyncHandler(async (req, res) => {
    res.json({
      nonLues: await prisma.notification.count({
        where: { userId: req.user.id, lue: false },
      }),
    });
  }),
);

/** PATCH /api/notifications/:id/lue */
router.patch(
  '/:id/lue',
  asyncHandler(async (req, res) => {
    // updateMany plutot que update : le filtre sur userId empeche de marquer
    // lue la notification de quelqu'un d'autre en devinant son identifiant.
    const { count } = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { lue: true, lueLe: new Date() },
    });

    if (count === 0) return res.status(404).json({ erreur: 'Notification introuvable' });
    res.json({ lue: true });
  }),
);

/** POST /api/notifications/tout-lu */
router.post(
  '/tout-lu',
  asyncHandler(async (req, res) => {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user.id, lue: false },
      data: { lue: true, lueLe: new Date() },
    });
    res.json({ marquees: count });
  }),
);

/** POST /api/notifications/appareil — enregistre le jeton push. */
router.post(
  '/appareil',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        jeton: z.string().min(10),
        plateforme: z.enum(['ios', 'android']).optional(),
        modele: z.string().max(120).optional(),
      })
      .parse(req.body);

    res.status(201).json(await enregistrerAppareil({ userId: req.user.id, ...data }));
  }),
);

/** DELETE /api/notifications/appareil — a la deconnexion. */
router.delete(
  '/appareil',
  asyncHandler(async (req, res) => {
    const { jeton } = z.object({ jeton: z.string() }).parse(req.body);

    await prisma.appareilPush.updateMany({
      where: { jeton, userId: req.user.id },
      data: { actif: false },
    });

    res.json({ desactive: true });
  }),
);

/** GET /api/notifications/preferences */
router.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const enBase = await prisma.preferenceNotification.findMany({
      where: { userId: req.user.id },
    });

    // L'absence de ligne vaut "active" : on complete pour que le client
    // n'ait pas a connaitre cette regle.
    res.json(
      TYPES.map((type) => {
        const p = enBase.find((x) => x.type === type);
        return {
          type,
          push: p?.push ?? true,
          sms: p?.sms ?? true,
          // Un impaye suspend le service : ce rappel ne se coupe pas.
          verrouille: type === 'PAIEMENT_DU',
        };
      }),
    );
  }),
);

/** PUT /api/notifications/preferences/:type */
router.put(
  '/preferences/:type',
  asyncHandler(async (req, res) => {
    const type = req.params.type;
    if (!TYPES.includes(type)) {
      return res.status(400).json({ erreur: 'Type de notification inconnu' });
    }
    if (type === 'PAIEMENT_DU') {
      return res.status(403).json({
        erreur: 'Ce rappel ne peut pas etre desactive : un impaye suspend le service.',
      });
    }

    const data = z
      .object({ push: z.boolean().optional(), sms: z.boolean().optional() })
      .parse(req.body);

    res.json(
      await prisma.preferenceNotification.upsert({
        where: { userId_type: { userId: req.user.id, type } },
        create: { userId: req.user.id, type, ...data },
        update: data,
      }),
    );
  }),
);

/**
 * POST /api/notifications/diffuser
 * Message de service a tous les clients d'une commune, ou a tous.
 */
router.post(
  '/diffuser',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        titre: z.string().min(3).max(80),
        message: z.string().min(3).max(300),
        communeId: z.string().optional(),
        lien: z.string().optional(),
      })
      .parse(req.body);

    const clients = await prisma.client.findMany({
      where: {
        user: { actif: true, role: 'CLIENT' },
        ...(data.communeId ? { quartier: { communeId: data.communeId } } : {}),
      },
      select: { userId: true },
    });

    // Envoi en tache de fond : une diffusion a 40 000 abonnes ne doit pas
    // tenir la requete HTTP ouverte.
    notifierPlusieurs(clients.map((c) => c.userId), {
      type: 'INFORMATION',
      titre: data.titre,
      message: data.message,
      lien: data.lien,
    }).catch((err) => console.error('[diffusion] echec', err.message));

    res.status(202).json({ destinataires: clients.length, statut: 'en cours' });
  }),
);

export default router;
