import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { notifier } from '../lib/notifications.js';

const router = Router();
router.use(authentifier);

/**
 * Messagerie de support.
 *
 * UN FIL PAR DEMANDE. Un client qui signale un bac casse et conteste une
 * facture ouvre deux fils : ils se suivent et se cloturent separement. Un fil
 * unique par client melangerait les sujets et rendrait le « resolu » impossible.
 *
 * CLOISONNEMENT. Un client ne voit et n'ecrit que dans ses propres fils. La
 * verification se fait sur chaque route, jamais sur la seule bonne foi de
 * l'application : l'identifiant d'une conversation se devine.
 *
 * COMPTEURS DENORMALISES. `nonLusSupport`, `nonLusClient` et `dernierMessageLe`
 * sont tenus a jour a l'ecriture. La liste du back-office se trie et s'affiche
 * alors sans agreger les messages a chaque requete.
 */

const MOTIFS = [
  'INCIDENT_COLLECTE',
  'BAC',
  'FACTURATION',
  'ABONNEMENT',
  'RECLAMATION',
  'AUTRE',
];

/** true si l'utilisateur fait partie de l'encadrement. */
function estStaff(user) {
  return user.role === 'ADMIN' || user.role === 'SUPERVISEUR';
}

/** Reference lisible, citee au telephone : SUP-2026-0001. */
async function prochaineReference() {
  const annee = new Date().getFullYear();
  const nb = await prisma.conversationSupport.count({
    where: { reference: { startsWith: `SUP-${annee}-` } },
  });
  return `SUP-${annee}-${String(nb + 1).padStart(4, '0')}`;
}

const conversationComplete = {
  client: {
    include: {
      user: { select: { id: true, nom: true, telephone: true, email: true } },
      quartier: { include: { commune: true } },
    },
  },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: { auteur: { select: { id: true, nom: true, role: true } } },
  },
};

/** Mise en forme commune : le client et le back-office lisent la meme chose. */
function presenter(c) {
  return {
    id: c.id,
    reference: c.reference,
    motif: c.motif,
    sujet: c.sujet,
    statut: c.statut,
    dernierMessageLe: c.dernierMessageLe,
    nonLusSupport: c.nonLusSupport,
    nonLusClient: c.nonLusClient,
    createdAt: c.createdAt,
    client: c.client && {
      id: c.client.id,
      nom: c.client.user.nom,
      telephone: c.client.user.telephone,
      email: c.client.user.email,
      adresse: c.client.adresse,
      commune: c.client.quartier?.commune?.nom ?? null,
      type: c.client.type,
    },
    messages: (c.messages ?? []).map((m) => ({
      id: m.id,
      emetteur: m.emetteur,
      auteur: m.auteur?.nom ?? null,
      texte: m.texte,
      photoUrl: m.photoUrl,
      luLe: m.luLe,
      createdAt: m.createdAt,
    })),
  };
}

/** GET /api/support/motifs — alimente la liste de choix de l'application. */
router.get('/motifs', (_req, res) => res.json(MOTIFS));

// ---------------------------------------------------------------------------
// Cote client
// ---------------------------------------------------------------------------

/** GET /api/support/mes-conversations — les fils du client connecte. */
router.get(
  '/mes-conversations',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const conversations = await prisma.conversationSupport.findMany({
      where: { clientId: req.user.client.id },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        client: { include: { user: true, quartier: { include: { commune: true } } } },
      },
      orderBy: { dernierMessageLe: 'desc' },
    });

    res.json(conversations.map(presenter));
  }),
);

const ouvertureSchema = z.object({
  motif: z.enum(MOTIFS),
  sujet: z.string().trim().max(120).optional(),
  texte: z.string().trim().min(1, 'Ecrivez votre message').max(2000),
  photoUrl: z.string().url().optional(),
});

/**
 * POST /api/support/conversations
 * Le client ouvre un fil : un motif choisi dans la liste, son message, et une
 * photo s'il en a une.
 */
router.post(
  '/conversations',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const data = ouvertureSchema.parse(req.body);

    // Sans sujet saisi, la premiere ligne du message en tient lieu : la liste
    // du back-office doit rester lisible sans ouvrir chaque fil.
    const sujet =
      data.sujet?.trim() ||
      data.texte.split('\n')[0].slice(0, 120) ||
      'Demande';

    const reference = await prochaineReference();

    const conversation = await prisma.$transaction(async (tx) => {
      const creee = await tx.conversationSupport.create({
        data: {
          reference,
          clientId: req.user.client.id,
          motif: data.motif,
          sujet,
          dernierMessageLe: new Date(),
          nonLusSupport: 1,
        },
      });

      await tx.messageSupport.create({
        data: {
          conversationId: creee.id,
          emetteur: 'CLIENT',
          auteurId: req.user.id,
          texte: data.texte,
          photoUrl: data.photoUrl,
        },
      });

      return tx.conversationSupport.findUnique({
        where: { id: creee.id },
        include: conversationComplete,
      });
    });

    // Le back-office doit voir arriver la demande sans rafraichir sa page.
    await prisma.alerte
      .create({
        data: {
          niveau: 'INFO',
          titre: 'Nouveau message client',
          message: `${reference} — ${req.user.nom} : ${sujet}`,
          lien: '/support',
        },
      })
      .catch(() => {});

    res.status(201).json(presenter(conversation));
  }),
);

// ---------------------------------------------------------------------------
// Cote back-office
// ---------------------------------------------------------------------------

const listeSchema = z.object({
  statut: z.enum(['OUVERTE', 'REPONDUE', 'RESOLUE']).optional(),
  motif: z.enum(MOTIFS).optional(),
  recherche: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  parPage: z.coerce.number().int().positive().max(100).default(25),
});

/** GET /api/support/conversations — tous les fils, pour l'encadrement. */
router.get(
  '/conversations',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const { statut, motif, recherche, page, parPage } = listeSchema.parse(req.query);

    const where = {
      ...(statut && { statut }),
      ...(motif && { motif }),
      ...(recherche && {
        OR: [
          { reference: { contains: recherche.toUpperCase() } },
          { sujet: { contains: recherche, mode: 'insensitive' } },
          { client: { user: { nom: { contains: recherche, mode: 'insensitive' } } } },
          { client: { user: { telephone: { contains: recherche.replace(/\s/g, '') } } } },
        ],
      }),
    };

    const [total, aTraiter, conversations] = await Promise.all([
      prisma.conversationSupport.count({ where }),
      prisma.conversationSupport.count({ where: { statut: { not: 'RESOLUE' } } }),
      prisma.conversationSupport.findMany({
        where,
        include: {
          client: { include: { user: true, quartier: { include: { commune: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        // Les fils qui attendent une reponse remontent, puis les plus recents.
        orderBy: [{ statut: 'asc' }, { dernierMessageLe: 'desc' }],
        skip: (page - 1) * parPage,
        take: parPage,
      }),
    ]);

    res.json({
      total,
      aTraiter,
      page,
      parPage,
      nbPages: Math.max(1, Math.ceil(total / parPage)),
      conversations: conversations.map(presenter),
    });
  }),
);

/** GET /api/support/resume — pastille du back-office. */
router.get(
  '/resume',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (_req, res) => {
    const [ouvertes, repondues, nonLus] = await Promise.all([
      prisma.conversationSupport.count({ where: { statut: 'OUVERTE' } }),
      prisma.conversationSupport.count({ where: { statut: 'REPONDUE' } }),
      prisma.conversationSupport.aggregate({ _sum: { nonLusSupport: true } }),
    ]);

    res.json({ ouvertes, repondues, messagesNonLus: nonLus._sum.nonLusSupport ?? 0 });
  }),
);

// ---------------------------------------------------------------------------
// Fil commun aux deux cotes
// ---------------------------------------------------------------------------

/**
 * GET /api/support/conversations/:id
 * Le fil complet. L'ouvrir marque comme lus les messages de l'autre cote.
 */
router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const conversation = await prisma.conversationSupport.findUnique({
      where: { id: req.params.id },
      include: conversationComplete,
    });
    if (!conversation) return res.status(404).json({ erreur: 'Conversation introuvable' });

    const staff = estStaff(req.user);
    if (!staff && conversation.clientId !== req.user.client?.id) {
      return res.status(403).json({ erreur: 'Cette conversation ne vous concerne pas' });
    }

    // Lire, c'est accuser reception des messages d'en face.
    const cote = staff ? 'CLIENT' : 'SUPPORT';
    const maintenant = new Date();

    const [, aJour] = await prisma.$transaction([
      prisma.messageSupport.updateMany({
        where: { conversationId: conversation.id, emetteur: cote, luLe: null },
        data: { luLe: maintenant },
      }),
      prisma.conversationSupport.update({
        where: { id: conversation.id },
        data: staff ? { nonLusSupport: 0 } : { nonLusClient: 0 },
        include: conversationComplete,
      }),
    ]);

    // On renvoie l'etat d'apres : sinon le badge lu resterait affiche jusqu'au
    // prochain chargement, alors que le serveur, lui, l'a bien remis a zero.
    res.json(presenter(aJour));
  }),
);

const reponseSchema = z.object({
  texte: z.string().trim().min(1, 'Ecrivez votre message').max(2000),
  photoUrl: z.string().url().optional(),
  /** Le support peut clore le fil dans le meme geste que sa reponse. */
  resoudre: z.boolean().default(false),
});

/** POST /api/support/conversations/:id/messages — repondre dans un fil. */
router.post(
  '/conversations/:id/messages',
  asyncHandler(async (req, res) => {
    const data = reponseSchema.parse(req.body);

    const conversation = await prisma.conversationSupport.findUnique({
      where: { id: req.params.id },
      include: { client: { include: { user: true } } },
    });
    if (!conversation) return res.status(404).json({ erreur: 'Conversation introuvable' });

    const staff = estStaff(req.user);
    if (!staff && conversation.clientId !== req.user.client?.id) {
      return res.status(403).json({ erreur: 'Cette conversation ne vous concerne pas' });
    }
    if (conversation.statut === 'RESOLUE' && staff === false) {
      // Le client qui repond dans un fil clos le rouvre : son probleme n'a
      // manifestement pas disparu.
      await prisma.conversationSupport.update({
        where: { id: conversation.id },
        data: { statut: 'OUVERTE' },
      });
    }

    const emetteur = staff ? 'SUPPORT' : 'CLIENT';

    const misAJour = await prisma.$transaction(async (tx) => {
      // Repondre, c'est avoir lu : on ne peut pas ecrire dans un fil sans
      // l'avoir sous les yeux. Sans cela, le compteur d'en face ne redescend
      // jamais pour qui repond directement depuis la liste.
      await tx.messageSupport.updateMany({
        where: {
          conversationId: conversation.id,
          emetteur: staff ? 'CLIENT' : 'SUPPORT',
          luLe: null,
        },
        data: { luLe: new Date() },
      });

      await tx.messageSupport.create({
        data: {
          conversationId: conversation.id,
          emetteur,
          auteurId: req.user.id,
          texte: data.texte,
          photoUrl: data.photoUrl,
        },
      });

      return tx.conversationSupport.update({
        where: { id: conversation.id },
        data: {
          dernierMessageLe: new Date(),
          statut: staff ? (data.resoudre ? 'RESOLUE' : 'REPONDUE') : 'OUVERTE',
          ...(staff
            ? { nonLusClient: { increment: 1 }, nonLusSupport: 0 }
            : { nonLusSupport: { increment: 1 }, nonLusClient: 0 }),
        },
        include: conversationComplete,
      });
    });

    // Une reponse du support doit atteindre le client meme s'il a ferme
    // l'application. Dans l'autre sens, l'alerte du back-office suffit.
    if (staff) {
      notifier({
        userId: conversation.client.userId,
        type: 'INFORMATION',
        titre: 'Reponse du service client',
        message: `${conversation.reference} : ${data.texte.slice(0, 120)}`,
        lien: '/(client)/support',
        donnees: { conversationId: conversation.id },
      }).catch((e) => console.error('[support] notification', e.message));
    } else {
      prisma.alerte
        .create({
          data: {
            niveau: 'INFO',
            titre: 'Message client',
            message: `${conversation.reference} — ${conversation.client.user.nom}`,
            lien: '/support',
          },
        })
        .catch(() => {});
    }

    res.status(201).json(presenter(misAJour));
  }),
);

const statutSchema = z.object({ statut: z.enum(['OUVERTE', 'REPONDUE', 'RESOLUE']) });

/** PATCH /api/support/conversations/:id — cloturer ou rouvrir un fil. */
router.patch(
  '/conversations/:id',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const { statut } = statutSchema.parse(req.body);

    const existe = await prisma.conversationSupport.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existe) return res.status(404).json({ erreur: 'Conversation introuvable' });

    const misAJour = await prisma.conversationSupport.update({
      where: { id: req.params.id },
      data: { statut },
      include: conversationComplete,
    });

    res.json(presenter(misAJour));
  }),
);

export default router;
