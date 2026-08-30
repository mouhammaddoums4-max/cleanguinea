import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { parametre } from '../lib/config.js';

/**
 * Confirmation d'une zone collectee.
 *
 * Extrait de la route pour que la synchronisation hors ligne emprunte
 * exactement le meme chemin. Deux implementations paralleles auraient diverge
 * a la premiere evolution, et l'ecart ne se serait vu que sur les tournees
 * synchronisees — donc chez les collecteurs des quartiers mal couverts, ceux
 * qu'on observe le moins.
 */

export const confirmationSchema = z.object({
  clientRef: z.string().uuid().optional(),
  nbFoyersServis: z.number().int().min(0),
  pesees: z
    .array(
      z.object({
        categorie: z.enum([
          'PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS',
        ]),
        poidsKg: z.number().positive(),
        peseeCertifiee: z.boolean().default(true),
      }),
    )
    .default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoUrl: z.string().url().optional(),
  commentaire: z.string().max(500).optional(),
});

export const tourneeComplete = {
  quartier: { include: { commune: true } },
  collecteur: { include: { user: true } },
  pesees: true,
};

const refus = (message, status) => Object.assign(new Error(message), { status });

/** Bornes du jour contenant `instant`, en heure serveur. */
function journeeDe(instant) {
  const debut = new Date(instant);
  debut.setHours(0, 0, 0, 0);
  return { debut, fin: new Date(debut.getTime() + 86_400_000) };
}

/**
 * @param {object} options
 * @param {object} options.user        utilisateur authentifie
 * @param {string} options.tourneeId   zone a confirmer
 * @param {object} options.data        corps deja valide par confirmationSchema
 * @param {Date}   [options.termineeA] heure reelle du geste. Pour une tournee
 *   synchronisee, c'est `faiteA` : enregistrer l'heure d'arrivee au serveur
 *   ferait apparaitre une zone de 6 h du matin comme terminee a 14 h.
 * @returns {Promise<{tournee: object, deduplique: boolean}>}
 */
export async function confirmerTournee({ user, tourneeId, data, termineeA = new Date() }) {
  // Idempotence : une zone confirmee hors reseau puis resynchronisee ne compte qu'une fois.
  if (data.clientRef) {
    const deja = await prisma.tournee.findUnique({
      where: { clientRef: data.clientRef },
      include: tourneeComplete,
    });
    if (deja) return { tournee: deja, deduplique: true };
  }

  const tournee = await prisma.tournee.findUnique({ where: { id: tourneeId } });
  if (!tournee) throw refus('Zone introuvable', 404);
  if (user.collecteur && tournee.collecteurId !== user.collecteur.id) {
    throw refus('Cette zone ne vous est pas affectee', 403);
  }
  if (tournee.statut === 'TERMINEE') throw refus('Zone deja confirmee', 409);

  const poidsTotal = data.pesees.reduce((s, p) => s + p.poidsKg, 0);
  const { debut, fin } = journeeDe(termineeA);

  // Lectures faites AVANT d'ouvrir la transaction : chaque aller-retour compte
  // contre son delai, et la base est derriere un proxy a forte latence.
  const [centreTri, capacite] = await Promise.all([
    prisma.centreTri.findFirst({ where: { actif: true } }),
    parametre('tri.capaciteParCategorieKg'),
  ]);

  const confirmee = await prisma.$transaction(
    async (tx) => {
      await tx.pesee.createMany({
        data: data.pesees.map((p) => ({
          tourneeId: tournee.id,
          categorie: p.categorie,
          poidsKg: p.poidsKg,
          peseeCertifiee: p.peseeCertifiee,
        })),
      });

      // Entree en stock au centre de tri.
      if (centreTri) {
        for (const p of data.pesees) {
          await tx.stock.upsert({
            where: {
              centreTriId_categorie: { centreTriId: centreTri.id, categorie: p.categorie },
            },
            create: {
              centreTriId: centreTri.id,
              categorie: p.categorie,
              quantiteKg: p.poidsKg,
              capaciteKg: capacite,
            },
            update: { quantiteKg: { increment: p.poidsKg } },
          });
        }
      }

      // Les demandes du jour dans ce quartier sont servies par ce passage.
      await tx.mission.updateMany({
        where: {
          quartierId: tournee.quartierId,
          datePlanifiee: { gte: debut, lt: fin },
          statut: { in: ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] },
        },
        data: {
          statut: 'TERMINEE',
          termineeA,
          tourneeId: tournee.id,
          collecteurId: tournee.collecteurId,
        },
      });

      // Les bacs du quartier repassent a vide.
      await tx.bac.updateMany({
        where: { client: { quartierId: tournee.quartierId } },
        data: { niveauTiers: 0 },
      });

      return tx.tournee.update({
        where: { id: tournee.id },
        data: {
          statut: 'TERMINEE',
          termineeA,
          clientRef: data.clientRef,
          nbFoyersServis: data.nbFoyersServis,
          poidsTotalKg: poidsTotal,
          latitude: data.latitude ?? tournee.latitude,
          longitude: data.longitude ?? tournee.longitude,
          photoUrl: data.photoUrl,
          commentaire: data.commentaire,
        },
        include: tourneeComplete,
      });
    },
    {
      // 5 s par defaut : insuffisant quand la base repond en ~1 s par requete.
      timeout: 30_000,
      maxWait: 15_000,
    },
  );

  return { tournee: confirmee, deduplique: false };
}

/**
 * Demarrage d'une zone.
 *
 * Meme raison d'etre que ci-dessus : le collecteur demarre souvent sa tournee
 * avant d'avoir du reseau.
 */
export async function demarrerTournee({ user, tourneeId, position = {}, demarreeA = new Date() }) {
  const tournee = await prisma.tournee.findUnique({ where: { id: tourneeId } });
  if (!tournee) throw refus('Zone introuvable', 404);
  if (user.collecteur && tournee.collecteurId !== user.collecteur.id) {
    throw refus('Cette zone ne vous est pas affectee', 403);
  }
  // Deja demarree : ce n'est pas une erreur, le geste a simplement ete rejoue.
  if (tournee.statut !== 'A_FAIRE') {
    return { tournee, dejaDemarree: true };
  }

  const misAJour = await prisma.tournee.update({
    where: { id: tournee.id },
    data: {
      statut: 'EN_COURS',
      demarreeA,
      latitude: position.latitude ?? tournee.latitude,
      longitude: position.longitude ?? tournee.longitude,
    },
    include: tourneeComplete,
  });

  return { tournee: misAJour, dejaDemarree: false };
}
