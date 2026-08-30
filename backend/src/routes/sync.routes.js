import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { lireCodeQr } from '../lib/qr.js';
import { parametre } from '../lib/config.js';
import { calculerPoints, crediterPoints, seuilContamination } from '../lib/points.js';
import { notifier } from '../lib/notifications.js';

const router = Router();
router.use(authentifier);

/**
 * Synchronisation des operations faites hors reseau.
 *
 * Le collecteur travaille souvent sans couverture : il scanne, pese, confirme,
 * et tout part quand le reseau revient. Trois exigences en decoulent.
 *
 * IDEMPOTENCE. Chaque operation porte un `clientRef` (UUID genere sur
 * l'appareil AVANT l'envoi). Un lot rejoue — reseau coupe pendant la reponse,
 * utilisateur qui insiste — n'est applique qu'une fois.
 *
 * INDEPENDANCE. Les operations sont traitees une par une. Une seule qui echoue
 * ne doit pas faire perdre les vingt autres : chacune a son statut dans la
 * reponse, et le client ne retire de sa file que celles qui ont abouti.
 *
 * ORDRE REEL. `faiteA` porte l'heure de l'appareil. L'ordre d'arrivee au
 * serveur n'est pas celui des gestes du collecteur ; on trie donc avant de
 * traiter, sinon une pesee pourrait precede le demarrage de sa zone.
 */

const operationSchema = z.object({
  clientRef: z.string().uuid(),
  type: z.enum(['scan_bac', 'collecte_mission', 'confirmer_zone', 'niveau_bac', 'demarrer_zone']),
  faiteA: z.string().datetime(),
  charge: z.record(z.unknown()),
});

const lotSchema = z.object({
  operations: z.array(operationSchema).min(1).max(200),
});

// ---------------------------------------------------------------------------
// Traitement par type
// ---------------------------------------------------------------------------

/** Scan d'un bac chez le client : cree la collecte et la marque terminee. */
async function traiterScanBac(user, charge, faiteA) {
  const { codeQr, poidsKg, photoUrl, commentaire } = z
    .object({
      codeQr: z.string(),
      poidsKg: z.number().positive().optional(),
      photoUrl: z.string().url().optional(),
      commentaire: z.string().max(300).optional(),
    })
    .parse(charge);

  if (!user.collecteur) throw Object.assign(new Error('Reserve aux collecteurs'), { status: 403 });

  const lu = lireCodeQr(codeQr);
  if (!lu) throw Object.assign(new Error('Code QR non reconnu'), { status: 400 });

  const bac = await prisma.bac.findUnique({
    where: { codeQr: lu.codeQr },
    include: { client: { include: { user: true } } },
  });
  if (!bac?.client) throw Object.assign(new Error('Bac inconnu ou non affecte'), { status: 404 });

  const debutJour = new Date(faiteA);
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(debutJour.getTime() + 86_400_000);

  // Une collecte du jour deja ouverte est reprise plutot que dupliquee.
  let mission = await prisma.mission.findFirst({
    where: {
      clientId: bac.clientId,
      datePlanifiee: { gte: debutJour, lt: finJour },
      statut: { not: 'ANNULEE' },
    },
  });

  const [seuil, capacite, centre] = await Promise.all([
    seuilContamination(),
    parametre('tri.capaciteParCategorieKg'),
    prisma.centreTri.findFirst({ where: { actif: true } }),
  ]);

  const resultat = await prisma.$transaction(
    async (tx) => {
      if (!mission) {
        const derniere = await tx.mission.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { reference: true },
        });
        const numero = derniere
          ? parseInt(derniere.reference.replace(/\D/g, ''), 10) + 1
          : 1000;

        mission = await tx.mission.create({
          data: {
            reference: `#M-${numero}`,
            clientId: bac.clientId,
            quartierId: bac.client.quartierId,
            collecteurId: user.collecteur.id,
            origine: 'PLANIFIEE',
            statut: 'ARRIVE',
            datePlanifiee: faiteA,
            bacs: { create: [{ bacId: bac.id }] },
          },
        });
      }

      if (poidsKg) {
        await tx.pesee.create({
          data: {
            missionId: mission.id,
            bacId: bac.id,
            categorie: bac.categorie,
            poidsKg,
            // Saisie sur le terrain, hors balance connectee : a controler.
            peseeCertifiee: false,
          },
        });

        if (centre) {
          await tx.stock.upsert({
            where: {
              centreTriId_categorie: { centreTriId: centre.id, categorie: bac.categorie },
            },
            create: {
              centreTriId: centre.id,
              categorie: bac.categorie,
              quantiteKg: poidsKg,
              capaciteKg: capacite,
            },
            update: { quantiteKg: { increment: poidsKg } },
          });
        }
      }

      await tx.bac.update({ where: { id: bac.id }, data: { niveauTiers: 0 } });

      return tx.mission.update({
        where: { id: mission.id },
        data: {
          statut: 'TERMINEE',
          termineeA: faiteA,
          collecteurId: user.collecteur.id,
          poidsTotalKg: { increment: poidsKg ?? 0 },
          photoUrl: photoUrl ?? undefined,
          commentaire: commentaire ?? undefined,
        },
        include: { client: { include: { user: true } } },
      });
    },
    { timeout: 30_000, maxWait: 15_000 },
  );

  // Points et notification hors transaction : leur echec ne doit pas annuler
  // une collecte reellement effectuee.
  let points = 0;
  if (poidsKg) {
    const solde = await prisma.soldePoints.findUnique({
      where: { userId: bac.client.userId },
    });
    points = await calculerPoints({
      categorie: bac.categorie,
      poidsKg,
      declassee: false,
      cumule12Mois: solde?.cumule12Mois ?? 0,
    });
    if (points > 0) {
      await crediterPoints({
        userId: bac.client.userId,
        points,
        motif: `Collecte ${resultat.reference} - ${poidsKg} kg`,
      });
    }
  }

  // Le client doit confirmer de son cote : c'est la seconde moitie de la
  // double confirmation.
  await notifier({
    userId: bac.client.userId,
    type: 'COLLECTE_TERMINEE',
    titre: 'Vos bacs ont ete collectes',
    message: `Confirmez le passage de ${resultat.reference} dans l'application.`,
    lien: '/(client)/historique',
    donnees: { missionId: resultat.id, aConfirmer: true },
  }).catch(() => {});

  return { missionId: resultat.id, reference: resultat.reference, pointsCredites: points };
}

/** Le client declare le remplissage d'un bac, meme hors ligne. */
async function traiterNiveauBac(user, charge) {
  const { bacId, niveauTiers } = z
    .object({ bacId: z.string(), niveauTiers: z.number().int().min(0).max(5) })
    .parse(charge);

  const bac = await prisma.bac.findUnique({ where: { id: bacId } });
  if (!bac) throw Object.assign(new Error('Bac introuvable'), { status: 404 });
  if (user.role === 'CLIENT' && bac.clientId !== user.client?.id) {
    throw Object.assign(new Error('Ce bac ne vous appartient pas'), { status: 403 });
  }

  await prisma.bac.update({ where: { id: bacId }, data: { niveauTiers } });
  return { bacId, niveauTiers };
}

/** Demarrage d'une zone, enregistre a l'heure reelle du terrain. */
async function traiterDemarrerZone(user, charge, faiteA) {
  const { tourneeId } = z.object({ tourneeId: z.string() }).parse(charge);

  const tournee = await prisma.tournee.findUnique({ where: { id: tourneeId } });
  if (!tournee) throw Object.assign(new Error('Zone introuvable'), { status: 404 });
  if (user.collecteur && tournee.collecteurId !== user.collecteur.id) {
    throw Object.assign(new Error('Zone non affectee'), { status: 403 });
  }
  if (tournee.statut !== 'A_FAIRE') return { tourneeId, ignoree: true };

  await prisma.tournee.update({
    where: { id: tourneeId },
    data: { statut: 'EN_COURS', demarreeA: faiteA },
  });
  return { tourneeId, statut: 'EN_COURS' };
}

const TRAITEMENTS = {
  scan_bac: traiterScanBac,
  niveau_bac: (user, charge) => traiterNiveauBac(user, charge),
  demarrer_zone: traiterDemarrerZone,
};

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/**
 * POST /api/sync
 * Recoit un lot d'operations faites hors ligne et renvoie leur sort une a une.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { operations } = lotSchema.parse(req.body);

    // Ordre des gestes sur le terrain, pas ordre d'arrivee.
    const triees = [...operations].sort(
      (a, b) => new Date(a.faiteA).getTime() - new Date(b.faiteA).getTime(),
    );

    // Un seul aller-retour pour savoir ce qui a deja ete applique.
    const dejaVues = new Set(
      (
        await prisma.operationSync.findMany({
          where: { clientRef: { in: triees.map((o) => o.clientRef) } },
          select: { clientRef: true },
        })
      ).map((o) => o.clientRef),
    );

    const resultats = [];

    for (const operation of triees) {
      if (dejaVues.has(operation.clientRef)) {
        resultats.push({ clientRef: operation.clientRef, statut: 'DEJA_TRAITEE' });
        continue;
      }

      const traitement = TRAITEMENTS[operation.type];
      if (!traitement) {
        resultats.push({
          clientRef: operation.clientRef,
          statut: 'ECHOUEE',
          erreur: `Type inconnu : ${operation.type}`,
        });
        continue;
      }

      try {
        const resultat = await traitement(req.user, operation.charge, new Date(operation.faiteA));

        await prisma.operationSync.create({
          data: {
            clientRef: operation.clientRef,
            userId: req.user.id,
            type: operation.type,
            charge: operation.charge,
            statut: 'APPLIQUEE',
            faiteA: new Date(operation.faiteA),
          },
        });

        resultats.push({ clientRef: operation.clientRef, statut: 'APPLIQUEE', resultat });
      } catch (err) {
        // On journalise l'echec : sans trace, une synchronisation partielle
        // disparait et personne ne sait ce qui manque.
        await prisma.operationSync
          .create({
            data: {
              clientRef: operation.clientRef,
              userId: req.user.id,
              type: operation.type,
              charge: operation.charge,
              statut: 'ECHOUEE',
              erreur: err.message?.slice(0, 400),
              faiteA: new Date(operation.faiteA),
            },
          })
          .catch(() => {});

        resultats.push({
          clientRef: operation.clientRef,
          statut: 'ECHOUEE',
          erreur: err.message,
          // Une erreur de donnees ne se resoudra pas en reessayant ; une panne
          // serveur, si. Le client sait ainsi quoi garder dans sa file.
          rejouable: (err.status ?? 500) >= 500,
        });
      }
    }

    const appliquees = resultats.filter((r) => r.statut === 'APPLIQUEE').length;
    const echouees = resultats.filter((r) => r.statut === 'ECHOUEE').length;

    res.json({ recues: operations.length, appliquees, echouees, resultats });
  }),
);

/** GET /api/sync/journal — ce qui a echoue, pour le support. */
router.get(
  '/journal',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.operationSync.findMany({
        where: { userId: req.user.id, ...(req.query.statut ? { statut: req.query.statut } : {}) },
        orderBy: { recueA: 'desc' },
        take: 100,
      }),
    );
  }),
);

export default router;
