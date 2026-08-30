import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';

const router = Router();
router.use(authentifier, exigerRole('ADMIN', 'SUPERVISEUR'));

const listeSchema = z.object({
  recherche: z.string().trim().optional(),
  statut: z.enum(['ACTIF', 'SUSPENDU', 'RESILIE']).optional(),
  type: z.enum(['PARTICULIER', 'ENTREPRISE']).optional(),
  commune: z.string().trim().optional(),
  // Les comptes supprimes sont anonymises : ils encombrent l annuaire, mais
  // restent consultables a la demande pour les rapprochements comptables.
  // z.coerce.boolean() rendrait "false" vrai : on compare la chaine.
  inclureSupprimes: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  page: z.coerce.number().int().positive().default(1),
  parPage: z.coerce.number().int().positive().max(100).default(25),
});

/** Abonnement a afficher : l actif s il existe, sinon le plus recent. */
function abonnementCourant(client) {
  return client.abonnements.find((a) => a.statut === 'ACTIF') ?? client.abonnements[0] ?? null;
}

function resumer(client) {
  const abonnement = abonnementCourant(client);
  return {
    id: client.id,
    reference: abonnement?.reference ?? null,
    type: client.type,
    nom: client.user.nom,
    telephone: client.user.telephone,
    email: client.user.email,
    adresse: client.adresse,
    quartier: client.quartier.nom,
    commune: client.quartier.commune.nom,
    nbPersonnes: client.nbPersonnes,
    nbBacs: client._count.bacs,
    offre: abonnement?.offre.libelle ?? null,
    tarifMensuelGnf: abonnement?.offre.tarifMensuelGnf ?? null,
    statutAbonnement: abonnement?.statut ?? null,
    prochainPrelevement: abonnement?.prochainPrelevement ?? null,
    actif: client.user.actif,
    supprime: Boolean(client.user.supprimeLe),
    inscritLe: client.createdAt,
  };
}

/**
 * GET /api/clients
 * Annuaire du back-office : liste paginee, recherche libre sur le nom, le
 * telephone et la reference d abonnement, filtres statut et commune.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { recherche, statut, type, commune, inclureSupprimes, page, parPage } =
      listeSchema.parse(req.query);

    const where = {
      ...(inclureSupprimes ? {} : { user: { supprimeLe: null } }),
      ...(statut && { abonnements: { some: { statut } } }),
      ...(type && { type }),
      ...(commune && { quartier: { commune: { nom: commune } } }),
      ...(recherche && {
        OR: [
          { user: { nom: { contains: recherche, mode: 'insensitive' } } },
          { user: { telephone: { contains: recherche.replace(/\s/g, '') } } },
          { adresse: { contains: recherche, mode: 'insensitive' } },
          {
            abonnements: {
              some: { reference: { contains: recherche.toUpperCase().replace(/\s/g, '') } },
            },
          },
        ],
      }),
    };

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: {
          user: true,
          quartier: { include: { commune: true } },
          abonnements: { include: { offre: true }, orderBy: { createdAt: 'desc' } },
          _count: { select: { bacs: { where: { enService: true } } } },
        },
        // Les derniers inscrits en premier : c est la que se portent les regards.
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * parPage,
        take: parPage,
      }),
    ]);

    res.json({
      total,
      page,
      parPage,
      nbPages: Math.max(1, Math.ceil(total / parPage)),
      clients: clients.map(resumer),
    });
  }),
);

/** GET /api/clients/communes — alimente le filtre par zone. */
router.get(
  '/communes',
  asyncHandler(async (_req, res) => {
    const communes = await prisma.commune.findMany({
      orderBy: { nom: 'asc' },
      select: { nom: true },
    });
    res.json(communes.map((c) => c.nom));
  }),
);

/** GET /api/clients/:id — fiche complete d un client. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        quartier: { include: { commune: true } },
        abonnements: { include: { offre: true }, orderBy: { createdAt: 'desc' } },
        bacs: { where: { enService: true }, orderBy: { numero: 'asc' } },
        _count: { select: { bacs: { where: { enService: true } } } },
      },
    });

    if (!client) return res.status(404).json({ erreur: 'Client introuvable' });

    const [missions, paiements] = await Promise.all([
      prisma.mission.findMany({
        where: { clientId: client.id },
        include: { collecteur: { include: { user: true } } },
        orderBy: { datePlanifiee: 'desc' },
        take: 10,
      }),
      prisma.paiement.findMany({
        where: { clientId: client.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      ...resumer(client),
      latitude: client.latitude,
      longitude: client.longitude,
      notes: client.notes,
      langue: client.user.langue,
      bacs: client.bacs.map((b) => ({
        numero: b.numero,
        categorie: b.categorie,
        codeQr: b.codeQr,
        niveauTiers: b.niveauTiers,
      })),
      abonnements: client.abonnements.map((a) => ({
        reference: a.reference,
        offre: a.offre.libelle,
        tarifMensuelGnf: a.offre.tarifMensuelGnf,
        statut: a.statut,
        dateDebut: a.dateDebut,
        dateFin: a.dateFin,
        prochainPrelevement: a.prochainPrelevement,
      })),
      dernieresMissions: missions.map((m) => ({
        id: m.id,
        reference: m.reference,
        statut: m.statut,
        datePlanifiee: m.datePlanifiee,
        termineeA: m.termineeA,
        poidsTotalKg: m.poidsTotalKg,
        collecteur: m.collecteur?.user.nom ?? null,
      })),
      derniersPaiements: paiements.map((p) => ({
        id: p.id,
        montantGnf: p.montantGnf,
        moyen: p.moyen,
        statut: p.statut,
        payeLe: p.payeLe,
        createdAt: p.createdAt,
      })),
    });
  }),
);

export default router;
