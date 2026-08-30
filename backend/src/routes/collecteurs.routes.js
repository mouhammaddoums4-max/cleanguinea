import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { envoyerSms } from '../lib/sms.js';

const router = Router();
router.use(authentifier, exigerRole('ADMIN', 'SUPERVISEUR'));

function normaliserTelephone(brut) {
  const chiffres = String(brut).replace(/\D/g, '');
  if (chiffres.startsWith('224')) return `+${chiffres}`;
  return `+224${chiffres.replace(/^0+/, '')}`;
}

/** COL-001, COL-002... Le numero suit le dernier attribue, pas le compte. */
async function prochainMatricule() {
  const dernier = await prisma.collecteur.findFirst({
    orderBy: { matricule: 'desc' },
    select: { matricule: true },
  });
  const numero = dernier ? parseInt(dernier.matricule.replace(/\D/g, ''), 10) + 1 : 1;
  return `COL-${String(numero).padStart(3, '0')}`;
}

/**
 * Mot de passe provisoire lisible au telephone.
 * Chiffres uniquement : il sera dicte ou lu dans un SMS, souvent sur un
 * clavier numerique et parfois par quelqu'un qui lit mal les caracteres mixtes.
 */
function motDePasseProvisoire() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const ficheSchema = z.object({
  nom: z.string().min(3).max(80),
  telephone: z.string().min(8),
  email: z.string().email().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  dateNaissance: z.string().datetime().nullable().optional(),
  adresse: z.string().max(160).nullable().optional(),
  quartierId: z.string().nullable().optional(),
  pieceIdentite: z.string().max(40).nullable().optional(),

  urgenceNom: z.string().max(80).nullable().optional(),
  urgenceTelephone: z.string().max(20).nullable().optional(),
  urgenceLien: z.string().max(40).nullable().optional(),

  statut: z.enum(['ACTIF', 'CONGE', 'SUSPENDU', 'SORTI']).optional(),
  dateEmbauche: z.string().datetime().nullable().optional(),
  typeContrat: z.string().max(40).nullable().optional(),
  vehicule: z.string().max(40).nullable().optional(),
});

const ficheComplete = {
  user: {
    select: { id: true, nom: true, telephone: true, email: true, photoUrl: true, actif: true },
  },
  quartier: { include: { commune: true } },
};

/** GET /api/collecteurs — annuaire, avec l'activite du jour. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = req.query.statut ? { statut: req.query.statut } : {};

    const collecteurs = await prisma.collecteur.findMany({
      where,
      include: ficheComplete,
      orderBy: { matricule: 'asc' },
    });

    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);

    // Un seul groupBy plutot qu'une requete par collecteur.
    const activite = await prisma.tournee.groupBy({
      by: ['collecteurId', 'statut'],
      where: { date: { gte: debutJour } },
      _count: true,
    });

    res.json(
      collecteurs.map((c) => {
        const lignes = activite.filter((a) => a.collecteurId === c.id);
        return {
          ...c,
          zonesDuJour: {
            total: lignes.reduce((s, l) => s + l._count, 0),
            terminees: lignes.find((l) => l.statut === 'TERMINEE')?._count ?? 0,
          },
        };
      }),
    );
  }),
);

/** GET /api/collecteurs/:id — fiche complete et historique. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const collecteur = await prisma.collecteur.findUnique({
      where: { id: req.params.id },
      include: ficheComplete,
    });
    if (!collecteur) return res.status(404).json({ erreur: 'Collecteur introuvable' });

    const jours = Math.min(Number(req.query.jours) || 30, 180);
    const depuis = new Date();
    depuis.setDate(depuis.getDate() - jours);
    depuis.setHours(0, 0, 0, 0);

    const [tournees, evaluations] = await Promise.all([
      prisma.tournee.findMany({
        where: { collecteurId: collecteur.id, date: { gte: depuis } },
        include: { quartier: { include: { commune: true } } },
        orderBy: { date: 'desc' },
        take: 200,
      }),
      prisma.evaluation.findMany({
        where: { collecteurId: collecteur.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const terminees = tournees.filter((t) => t.statut === 'TERMINEE');

    res.json({
      collecteur,
      historique: tournees,
      evaluations,
      cumul: {
        jours,
        zones: terminees.length,
        poidsTotalKg: Number(terminees.reduce((s, t) => s + t.poidsTotalKg, 0).toFixed(1)),
        foyersServis: terminees.reduce((s, t) => s + t.nbFoyersServis, 0),
        // Zones confiees mais jamais terminees : le signal le plus utile pour
        // un superviseur.
        nonTerminees: tournees.length - terminees.length,
      },
    });
  }),
);

/**
 * POST /api/collecteurs
 * Cree le compte et la fiche. Le mot de passe provisoire part par SMS :
 * l'administrateur n'a pas a le transmettre lui-meme, et il n'est jamais
 * stocke en clair.
 */
router.post(
  '/',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = ficheSchema.parse(req.body);
    const telephone = normaliserTelephone(data.telephone);

    const existant = await prisma.user.findUnique({ where: { telephone } });
    if (existant) {
      return res.status(409).json({ erreur: 'Ce numero est deja utilise par un autre compte' });
    }

    const matricule = await prochainMatricule();
    const provisoire = motDePasseProvisoire();

    const { nom, telephone: _t, email, ...fiche } = data;

    const collecteur = await prisma.collecteur.create({
      data: {
        matricule,
        ...fiche,
        dateNaissance: fiche.dateNaissance ? new Date(fiche.dateNaissance) : null,
        dateEmbauche: fiche.dateEmbauche ? new Date(fiche.dateEmbauche) : new Date(),
        user: {
          create: {
            nom,
            telephone,
            email: email || null,
            photoUrl: fiche.photoUrl ?? null,
            motDePasse: await bcrypt.hash(provisoire, 10),
            role: 'COLLECTEUR',
          },
        },
      },
      include: ficheComplete,
    });

    envoyerSms(
      telephone,
      `Clean Guinee : votre compte collecteur est cree. Numero employe ${matricule}, ` +
        `mot de passe provisoire ${provisoire}. Changez-le a la premiere connexion.`,
    ).catch((e) => console.error('[collecteur] SMS identifiants', e.message));

    res.status(201).json({
      collecteur,
      matricule,
      // Renvoye une seule fois : l'administrateur doit pouvoir le lire s'il n'y
      // a pas de reseau pour le SMS. Il n'est jamais relisible ensuite.
      motDePasseProvisoire: provisoire,
    });
  }),
);

/** PUT /api/collecteurs/:id */
router.put(
  '/:id',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = ficheSchema.partial().parse(req.body);
    const { nom, telephone, email, ...fiche } = data;

    const collecteur = await prisma.collecteur.findUnique({ where: { id: req.params.id } });
    if (!collecteur) return res.status(404).json({ erreur: 'Collecteur introuvable' });

    await prisma.$transaction(async (tx) => {
      if (nom || telephone || email !== undefined || fiche.photoUrl !== undefined) {
        await tx.user.update({
          where: { id: collecteur.userId },
          data: {
            ...(nom ? { nom } : {}),
            ...(telephone ? { telephone: normaliserTelephone(telephone) } : {}),
            ...(email !== undefined ? { email: email || null } : {}),
            ...(fiche.photoUrl !== undefined ? { photoUrl: fiche.photoUrl } : {}),
            // Un collecteur sorti ou suspendu ne doit plus pouvoir se connecter.
            ...(fiche.statut
              ? { actif: fiche.statut === 'ACTIF' || fiche.statut === 'CONGE' }
              : {}),
          },
        });
      }

      await tx.collecteur.update({
        where: { id: collecteur.id },
        data: {
          ...fiche,
          ...(fiche.dateNaissance !== undefined
            ? { dateNaissance: fiche.dateNaissance ? new Date(fiche.dateNaissance) : null }
            : {}),
          ...(fiche.dateEmbauche !== undefined
            ? { dateEmbauche: fiche.dateEmbauche ? new Date(fiche.dateEmbauche) : null }
            : {}),
          ...(fiche.statut === 'SORTI' ? { dateSortie: new Date(), disponible: false } : {}),
        },
      });
    });

    res.json(
      await prisma.collecteur.findUnique({ where: { id: collecteur.id }, include: ficheComplete }),
    );
  }),
);

/** POST /api/collecteurs/:id/reinitialiser-mot-de-passe */
router.post(
  '/:id/reinitialiser-mot-de-passe',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const collecteur = await prisma.collecteur.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { telephone: true } } },
    });
    if (!collecteur) return res.status(404).json({ erreur: 'Collecteur introuvable' });

    const provisoire = motDePasseProvisoire();
    await prisma.user.update({
      where: { id: collecteur.userId },
      data: { motDePasse: await bcrypt.hash(provisoire, 10) },
    });

    envoyerSms(
      collecteur.user.telephone,
      `Clean Guinee : nouveau mot de passe provisoire ${provisoire}. ` +
        `Changez-le a la prochaine connexion.`,
    ).catch(() => {});

    res.json({ motDePasseProvisoire: provisoire });
  }),
);

/**
 * DELETE /api/collecteurs/:id
 * Sortie d'effectif, pas suppression : l'historique de collecte doit rester
 * rattachable, et les tonnages alimentent des rapports deja publies.
 */
router.delete(
  '/:id',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const collecteur = await prisma.collecteur.findUnique({ where: { id: req.params.id } });
    if (!collecteur) return res.status(404).json({ erreur: 'Collecteur introuvable' });

    const enCours = await prisma.tournee.count({
      where: { collecteurId: collecteur.id, statut: { in: ['A_FAIRE', 'EN_COURS'] } },
    });
    if (enCours > 0) {
      return res.status(409).json({
        erreur: `${enCours} zone(s) lui sont encore affectees. Reaffectez-les avant la sortie.`,
      });
    }

    await prisma.$transaction([
      prisma.collecteur.update({
        where: { id: collecteur.id },
        data: { statut: 'SORTI', dateSortie: new Date(), disponible: false },
      }),
      prisma.user.update({ where: { id: collecteur.userId }, data: { actif: false } }),
    ]);

    res.json({ sorti: true });
  }),
);

export default router;
