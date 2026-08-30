import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { parametre } from '../lib/config.js';
import { notifier } from '../lib/notifications.js';
import {
  confirmationSchema,
  confirmerTournee,
  demarrerTournee,
  tourneeComplete,
} from '../services/tournees.service.js';

const router = Router();
router.use(authentifier);

/** Bornes du jour, en heure serveur. */
function aujourdhui() {
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  return { debut, fin: new Date(debut.getTime() + 86_400_000) };
}

/**
 * Barycentre des foyers d'un quartier.
 * Sert de point de centrage de la carte quand le quartier n'a pas de coordonnees
 * propres : mieux vaut viser la ou sont reellement les clients.
 */
function centre(quartier, clients) {
  const points = clients.filter((c) => c.latitude != null && c.longitude != null);
  if (points.length === 0) {
    return quartier.latitude != null && quartier.longitude != null
      ? { latitude: quartier.latitude, longitude: quartier.longitude }
      : null;
  }
  return {
    latitude: points.reduce((s, c) => s + c.latitude, 0) / points.length,
    longitude: points.reduce((s, c) => s + c.longitude, 0) / points.length,
  };
}

/**
 * GET /api/tournees/mes-zones
 * Ecran principal du collecteur : les zones qui lui sont confiees aujourd'hui.
 */
router.get(
  '/mes-zones',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    if (!req.user.collecteur) return res.status(403).json({ erreur: 'Reserve aux collecteurs' });

    const { debut, fin } = aujourdhui();

    const tournees = await prisma.tournee.findMany({
      where: { collecteurId: req.user.collecteur.id, date: { gte: debut, lt: fin } },
      include: tourneeComplete,
      orderBy: [{ statut: 'asc' }, { heureDebutPrevue: 'asc' }],
    });

    // Un seul aller-retour pour tous les quartiers concernes.
    const quartierIds = [...new Set(tournees.map((t) => t.quartierId))];
    const clients = await prisma.client.findMany({
      where: { quartierId: { in: quartierIds }, user: { actif: true } },
      select: { id: true, quartierId: true, latitude: true, longitude: true },
    });

    const parQuartier = new Map();
    for (const c of clients) {
      if (!parQuartier.has(c.quartierId)) parQuartier.set(c.quartierId, []);
      parQuartier.get(c.quartierId).push(c);
    }

    const zones = tournees.map((t) => {
      const foyers = parQuartier.get(t.quartierId) ?? [];
      return {
        id: t.id,
        reference: t.reference,
        statut: t.statut,
        zone: t.quartier.nom,
        commune: t.quartier.commune.nom,
        heureDebutPrevue: t.heureDebutPrevue,
        heureFinPrevue: t.heureFinPrevue,
        demarreeA: t.demarreeA,
        termineeA: t.termineeA,
        nbFoyers: foyers.length,
        nbFoyersServis: t.nbFoyersServis,
        poidsTotalKg: t.poidsTotalKg,
        position: centre(t.quartier, foyers),
      };
    });

    res.json({
      zones,
      resume: {
        total: zones.length,
        aFaire: zones.filter((z) => z.statut === 'A_FAIRE').length,
        enCours: zones.filter((z) => z.statut === 'EN_COURS').length,
        terminees: zones.filter((z) => z.statut === 'TERMINEE').length,
        poidsTotalKg: Number(zones.reduce((s, z) => s + z.poidsTotalKg, 0).toFixed(1)),
        foyersServis: zones.reduce((s, z) => s + z.nbFoyersServis, 0),
      },
    });
  }),
);

/**
 * GET /api/tournees/:id
 * Detail d'une zone : les foyers a servir, avec leurs coordonnees pour la carte.
 */
router.get(
  '/:id',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const tournee = await prisma.tournee.findUnique({
      where: { id: req.params.id },
      include: tourneeComplete,
    });
    if (!tournee) return res.status(404).json({ erreur: 'Zone introuvable' });

    const estLeSien = req.user.collecteur?.id === tournee.collecteurId;
    if (!estLeSien && !['ADMIN', 'SUPERVISEUR'].includes(req.user.role)) {
      return res.status(403).json({ erreur: 'Cette zone ne vous est pas affectee' });
    }

    const clients = await prisma.client.findMany({
      where: { quartierId: tournee.quartierId, user: { actif: true } },
      include: {
        user: { select: { nom: true, telephone: true } },
        bacs: { where: { enService: true }, orderBy: { numero: 'asc' } },
      },
      orderBy: { adresse: 'asc' },
    });

    // Les demandes du jour dans ce quartier : ce sont les foyers prioritaires.
    const { debut, fin } = aujourdhui();
    const demandes = await prisma.mission.findMany({
      where: {
        quartierId: tournee.quartierId,
        datePlanifiee: { gte: debut, lt: fin },
        statut: { in: ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] },
      },
      select: { id: true, clientId: true, reference: true, origine: true },
    });
    const demandeParClient = new Map(demandes.map((m) => [m.clientId, m]));

    res.json({
      id: tournee.id,
      reference: tournee.reference,
      statut: tournee.statut,
      zone: tournee.quartier.nom,
      commune: tournee.quartier.commune.nom,
      heureDebutPrevue: tournee.heureDebutPrevue,
      heureFinPrevue: tournee.heureFinPrevue,
      demarreeA: tournee.demarreeA,
      termineeA: tournee.termineeA,
      poidsTotalKg: tournee.poidsTotalKg,
      nbFoyersServis: tournee.nbFoyersServis,
      commentaire: tournee.commentaire,
      position: centre(tournee.quartier, clients),
      pesees: tournee.pesees,
      foyers: clients.map((c) => ({
        id: c.id,
        nom: c.user.nom,
        telephone: c.user.telephone,
        adresse: c.adresse,
        notes: c.notes,
        latitude: c.latitude,
        longitude: c.longitude,
        bacs: c.bacs.map((b) => ({
          id: b.id,
          numero: b.numero,
          categorie: b.categorie,
          niveauTiers: b.niveauTiers,
        })),
        // Un foyer qui a appuye sur "ma poubelle est pleine" passe en tete.
        demande: demandeParClient.get(c.id) ?? null,
      })),
    });
  }),
);

/** PATCH /api/tournees/:id/demarrer */
router.patch(
  '/:id/demarrer',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const position = z
      .object({ latitude: z.number().optional(), longitude: z.number().optional() })
      .parse(req.body ?? {});

    const { tournee, dejaDemarree } = await demarrerTournee({
      user: req.user,
      tourneeId: req.params.id,
      position,
    });

    // Rejouer un demarrage n'est pas une faute : le collecteur a pu perdre le
    // reseau au mauvais moment et retoucher le bouton. On renvoie l'etat courant
    // plutot qu'un 409 qui l'obligerait a comprendre une erreur sans objet.
    res.json({ ...tournee, dejaDemarree });
  }),
);

/**
 * POST /api/tournees/:id/confirmer
 *
 * Le collecteur confirme la zone : foyers servis, photo, commentaire.
 *
 * Il ne pese rien. Le camion part a l'entrepot, ou les trieurs pesent et
 * trient le chargement ; c'est de la que viendront les entrees en stock. Le
 * champ `pesees` reste accepte pour cette saisie d'entrepot a venir, mais
 * l'application du collecteur ne l'envoie plus.
 */
router.post(
  '/:id/confirmer',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const data = confirmationSchema.parse(req.body);

    const { tournee, deduplique } = await confirmerTournee({
      user: req.user,
      tourneeId: req.params.id,
      data,
    });

    res.status(deduplique ? 200 : 201).json({ ...tournee, deduplique });
  }),
);

/**
 * GET /api/tournees/collecteur/historique
 * Zones confirmees par le collecteur, avec le cumul de la periode.
 */
router.get(
  '/collecteur/historique',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    if (!req.user.collecteur) return res.status(403).json({ erreur: 'Reserve aux collecteurs' });

    const jours = Math.min(Number(req.query.jours) || 30, 90);
    const depuis = new Date();
    depuis.setDate(depuis.getDate() - jours);
    depuis.setHours(0, 0, 0, 0);

    const tournees = await prisma.tournee.findMany({
      where: {
        collecteurId: req.user.collecteur.id,
        statut: 'TERMINEE',
        date: { gte: depuis },
      },
      include: tourneeComplete,
      orderBy: { termineeA: 'desc' },
      take: 200,
    });

    res.json({
      tournees,
      cumul: {
        zones: tournees.length,
        poidsTotalKg: Number(tournees.reduce((s, t) => s + t.poidsTotalKg, 0).toFixed(1)),
        foyersServis: tournees.reduce((s, t) => s + t.nbFoyersServis, 0),
      },
    });
  }),
);

/**
 * GET /api/tournees/collecteur/tableau-de-bord
 * Chiffres du jour, de la semaine et cumul du mois.
 */
router.get(
  '/collecteur/tableau-de-bord',
  exigerRole('COLLECTEUR', 'SUPERVISEUR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    if (!req.user.collecteur) return res.status(403).json({ erreur: 'Reserve aux collecteurs' });

    const collecteurId = req.user.collecteur.id;
    const { debut: debutJour, fin: finJour } = aujourdhui();

    const debutSemaine = new Date(debutJour);
    // Lundi comme premier jour : getDay() renvoie 0 pour dimanche.
    debutSemaine.setDate(debutSemaine.getDate() - ((debutSemaine.getDay() + 6) % 7));

    const debutMois = new Date(debutJour);
    debutMois.setDate(1);

    const agreger = async (depuis, jusqua) => {
      const t = await prisma.tournee.findMany({
        where: {
          collecteurId,
          statut: 'TERMINEE',
          date: jusqua ? { gte: depuis, lt: jusqua } : { gte: depuis },
        },
        select: { poidsTotalKg: true, nbFoyersServis: true },
      });
      return {
        zones: t.length,
        poidsKg: Number(t.reduce((s, x) => s + x.poidsTotalKg, 0).toFixed(1)),
        foyers: t.reduce((s, x) => s + x.nbFoyersServis, 0),
      };
    };

    const [jour, semaine, mois, aFaire, collecteur] = await Promise.all([
      agreger(debutJour, finJour),
      agreger(debutSemaine),
      agreger(debutMois),
      prisma.tournee.count({
        where: { collecteurId, date: { gte: debutJour, lt: finJour }, statut: { not: 'TERMINEE' } },
      }),
      prisma.collecteur.findUnique({ where: { id: collecteurId } }),
    ]);

    res.json({
      jour,
      semaine,
      mois,
      zonesRestantes: aFaire,
      note: collecteur?.note ?? null,
      nbEvaluations: collecteur?.nbEvaluations ?? 0,
    });
  }),
);

/** PATCH /api/tournees/collecteur/position — position temps reel du collecteur. */
router.patch(
  '/collecteur/position',
  exigerRole('COLLECTEUR'),
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = z
      .object({ latitude: z.number(), longitude: z.number() })
      .parse(req.body);

    await prisma.collecteur.update({
      where: { id: req.user.collecteur.id },
      data: { latitude, longitude, positionMaj: new Date() },
    });

    res.json({ enregistre: true });
  }),
);

// ---------------------------------------------------------------------------
// Planification (back-office)
// ---------------------------------------------------------------------------

/** POST /api/tournees — affecte une zone a un collecteur pour une date. */
router.post(
  '/',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        date: z.string(),
        quartierId: z.string(),
        collecteurId: z.string(),
        heureDebutPrevue: z.string().datetime().optional(),
        heureFinPrevue: z.string().datetime().optional(),
      })
      .parse(req.body);

    const nb = await prisma.tournee.count();

    const tournee = await prisma.tournee.create({
      data: {
        reference: `Z-${new Date().getFullYear()}-${String(nb + 1).padStart(4, '0')}`,
        date: new Date(data.date),
        quartierId: data.quartierId,
        collecteurId: data.collecteurId,
        heureDebutPrevue: data.heureDebutPrevue ? new Date(data.heureDebutPrevue) : null,
        heureFinPrevue: data.heureFinPrevue ? new Date(data.heureFinPrevue) : null,
      },
      include: tourneeComplete,
    });

    // Le collecteur doit savoir qu'une zone lui a ete confiee sans avoir a
    // ouvrir l'application pour verifier.
    notifier({
      userId: tournee.collecteur.userId,
      type: 'ZONE_AFFECTEE',
      titre: 'Nouvelle zone affectee',
      message: `${tournee.quartier.nom} (${tournee.quartier.commune.nom}) vous est confiee.`,
      lien: `/(collecteur)/zone/${tournee.id}`,
      donnees: { tourneeId: tournee.id, reference: tournee.reference },
    }).catch((e) => console.error('[notif] zone affectee', e.message));

    res.status(201).json(tournee);
  }),
);

/** GET /api/tournees — vue back-office de la planification du jour. */
router.get(
  '/',
  exigerRole('ADMIN', 'SUPERVISEUR'),
  asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const lendemain = new Date(date.getTime() + 86_400_000);

    res.json(
      await prisma.tournee.findMany({
        where: { date: { gte: date, lt: lendemain } },
        include: tourneeComplete,
        orderBy: [{ statut: 'asc' }, { heureDebutPrevue: 'asc' }],
      }),
    );
  }),
);

export default router;
