import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { parametre } from '../lib/config.js';

const router = Router();
router.use(authentifier);

/** PATCH /api/compte/langue — bascule FR / EN, memorisee sur le compte. */
router.patch(
  '/langue',
  asyncHandler(async (req, res) => {
    const { langue } = z.object({ langue: z.enum(['fr', 'en']) }).parse(req.body);

    await prisma.user.update({ where: { id: req.user.id }, data: { langue } });
    res.json({ langue });
  }),
);

/** PATCH /api/compte/profil — modification des informations personnelles. */
router.patch(
  '/profil',
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        nom: z.string().min(2).optional(),
        email: z.string().email().nullable().optional(),
        adresse: z.string().min(3).optional(),
        notes: z.string().max(280).nullable().optional(),
        nbPersonnes: z.number().int().positive().max(50).optional(),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
      })
      .parse(req.body);

    const { nom, email, ...champsClient } = data;

    if (nom !== undefined || email !== undefined) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { ...(nom !== undefined && { nom }), ...(email !== undefined && { email }) },
      });
    }

    if (req.user.client && Object.keys(champsClient).length > 0) {
      await prisma.client.update({ where: { id: req.user.client.id }, data: champsClient });
    }

    res.json({ misAJour: true });
  }),
);

/** POST /api/compte/mot-de-passe */
router.post(
  '/mot-de-passe',
  asyncHandler(async (req, res) => {
    const { actuel, nouveau } = z
      .object({ actuel: z.string().min(1), nouveau: z.string().min(6) })
      .parse(req.body);

    if (!(await bcrypt.compare(actuel, req.user.motDePasse))) {
      return res.status(401).json({ erreur: 'Mot de passe actuel incorrect' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { motDePasse: await bcrypt.hash(nouveau, 10) },
    });

    res.json({ misAJour: true });
  }),
);

/**
 * GET /api/compte/donnees
 * Export des donnees personnelles, a fournir avant toute suppression.
 */
router.get(
  '/donnees',
  asyncHandler(async (req, res) => {
    const { motDePasse, ...utilisateur } = req.user;

    const [client, points, mouvements, missions, paiements] = await Promise.all([
      req.user.client
        ? prisma.client.findUnique({
            where: { id: req.user.client.id },
            include: { quartier: { include: { commune: true } }, bacs: true, abonnements: true },
          })
        : null,
      prisma.soldePoints.findUnique({ where: { userId: req.user.id } }),
      prisma.mouvementPoints.findMany({ where: { userId: req.user.id } }),
      req.user.client
        ? prisma.mission.findMany({
            where: { clientId: req.user.client.id },
            include: { pesees: true },
          })
        : [],
      req.user.client
        ? prisma.paiement.findMany({ where: { clientId: req.user.client.id } })
        : [],
    ]);

    res.set('Content-Disposition', 'attachment; filename="mes-donnees-senyi.json"');
    res.json({
      exporteLe: new Date().toISOString(),
      utilisateur,
      client,
      points,
      mouvements,
      missions,
      paiements,
    });
  }),
);

/**
 * DELETE /api/compte
 *
 * Suppression du compte par anonymisation.
 *
 * Pourquoi pas un DELETE en base : les paiements et les pesees alimentent la
 * comptabilite et les rapports remis aux communes et aux bailleurs. Les effacer
 * fausserait des donnees deja publiees et contreviendrait aux obligations de
 * conservation comptable.
 *
 * Ce qui est reellement fait :
 *   - toutes les donnees personnelles sont ecrasees (nom, telephone, email,
 *     adresse, coordonnees GPS, photo, notes d acces au domicile) ;
 *   - le compte est desactive : plus aucune connexion possible ;
 *   - l abonnement est resilie et les bacs sont liberes pour reaffectation ;
 *   - le solde de points est remis a zero et les mouvements supprimes ;
 *   - les missions et paiements restent, rattaches a un client devenu anonyme.
 *
 * Le compte n'est donc plus rattachable a une personne, et les agregats restent justes.
 */
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const { motDePasse, confirmation } = z
      .object({
        motDePasse: z.string().min(1),
        // Garde-fou volontaire : l'utilisateur doit taper le mot exact.
        confirmation: z.enum(['SUPPRIMER', 'DELETE']),
      })
      .parse(req.body);

    if (!(await bcrypt.compare(motDePasse, req.user.motDePasse))) {
      return res.status(401).json({ erreur: 'Mot de passe incorrect' });
    }

    // Un impaye ne doit pas pouvoir etre efface en supprimant son compte.
    if (req.user.client) {
      const impayes = await prisma.paiement.count({
        where: { clientId: req.user.client.id, statut: { in: ['EN_ATTENTE', 'ECHOUE'] } },
      });
      if (impayes > 0) {
        return res.status(409).json({
          erreur:
            'Un paiement reste en attente sur votre compte. Regularisez-le avant la suppression.',
          impayes,
        });
      }

      // Une collecte en cours implique un collecteur deja en route.
      const enCours = await prisma.mission.count({
        where: {
          clientId: req.user.client.id,
          statut: { in: ['EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE'] },
        },
      });
      if (enCours > 0) {
        return res.status(409).json({
          erreur: 'Une collecte est en cours. Attendez la fin du passage ou annulez la demande.',
        });
      }
    }

    const anonyme = randomUUID().slice(0, 12);
    const retentionMois = await parametre('compte.retentionAnonymiseeMois');

    await prisma.$transaction(async (tx) => {
      if (req.user.client) {
        await tx.abonnement.updateMany({
          where: { clientId: req.user.client.id, statut: { not: 'RESILIE' } },
          data: { statut: 'RESILIE', dateFin: new Date() },
        });

        // Les bacs retournent au parc : ils seront reaffectes a un autre foyer.
        await tx.bac.updateMany({
          where: { clientId: req.user.client.id },
          data: { clientId: null, enService: false, niveauTiers: 0 },
        });

        await tx.client.update({
          where: { id: req.user.client.id },
          data: {
            adresse: 'Adresse supprimée',
            latitude: null,
            longitude: null,
            notes: null,
          },
        });
      }

      await tx.mouvementPoints.deleteMany({ where: { userId: req.user.id } });
      await tx.soldePoints.updateMany({
        where: { userId: req.user.id },
        data: { solde: 0, cumule12Mois: 0 },
      });

      await tx.user.update({
        where: { id: req.user.id },
        data: {
          nom: 'Compte supprimé',
          // Valeurs uniques : la contrainte d unicite doit rester satisfaite,
          // et le numero doit redevenir disponible pour une nouvelle inscription.
          telephone: `supprime-${anonyme}`,
          email: null,
          photoUrl: null,
          motDePasse: await bcrypt.hash(randomUUID(), 10),
          actif: false,
          supprimeLe: new Date(),
        },
      });
    });

    res.json({
      supprime: true,
      message:
        'Votre compte a été supprimé. Vos données personnelles ont été effacées immédiatement.',
      retentionMois,
    });
  }),
);

export default router;
