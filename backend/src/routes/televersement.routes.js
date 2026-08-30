import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier, exigerRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import {
  DOSSIERS, cloudinaryActif, preparerTeleversement, publicIdDepuisUrl, supprimerImage,
} from '../lib/cloudinary.js';

const router = Router();
router.use(authentifier);

/**
 * POST /api/televersement/signature
 *
 * Renvoie de quoi televerser directement vers Cloudinary. Le fichier ne passe
 * pas par ce serveur, et `api_secret` n'en sort jamais.
 *
 * Le dossier n'est pas libre : chaque usage a le sien, et l'acces est verifie
 * ici. Sans ce controle, un client pourrait deposer dans « bannieres » et
 * afficher ce qu'il veut sur l'accueil de tout le monde.
 */
const signatureSchema = z.object({
  dossier: z.enum(Object.keys(DOSSIERS)),
  /** Identifiant metier de la cible : collecteur, banniere, mission. */
  cible: z.string().max(60).optional(),
});

router.post(
  '/signature',
  asyncHandler(async (req, res) => {
    if (!cloudinaryActif()) {
      return res.status(503).json({
        erreur: 'Stockage d images non configure sur ce serveur',
      });
    }

    const { dossier, cible } = signatureSchema.parse(req.body);

    // Qui a le droit d ecrire ou.
    const autorise =
      dossier === 'profils' ||
      // Une piece jointe de support : tout abonne doit pouvoir montrer son bac
      // casse ou un depot sauvage, c'est souvent plus clair qu'un paragraphe.
      dossier === 'support' ||
      (dossier === 'collectes' && ['COLLECTEUR', 'SUPERVISEUR', 'ADMIN'].includes(req.user.role)) ||
      (dossier === 'collecteurs' && ['ADMIN', 'SUPERVISEUR'].includes(req.user.role)) ||
      (dossier === 'bannieres' && req.user.role === 'ADMIN');

    if (!autorise) {
      return res.status(403).json({ erreur: 'Televersement non autorise dans ce dossier' });
    }

    // Le prefixe vient du serveur, jamais du client : sinon on ecraserait la
    // photo de quelqu un d autre en devinant son identifiant.
    const prefixe =
      dossier === 'profils' ? req.user.id : `${req.user.id}-${cible ?? 'sans-cible'}`;

    res.json(preparerTeleversement(dossier, prefixe));
  }),
);

/**
 * PUT /api/televersement/photo-profil
 * Enregistre l URL renvoyee par Cloudinary et supprime l ancienne image.
 */
router.put(
  '/photo-profil',
  asyncHandler(async (req, res) => {
    const { url } = z.object({ url: z.string().url().nullable() }).parse(req.body);

    const ancienne = req.user.photoUrl;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { photoUrl: url },
      select: { id: true, photoUrl: true },
    });

    // Sans cette suppression, chaque changement de photo laisserait un fichier
    // facture derriere lui.
    if (ancienne && ancienne !== url) {
      supprimerImage(publicIdDepuisUrl(ancienne)).catch(() => {});
    }

    // Le collecteur affiche sa photo depuis sa fiche : on la garde alignee.
    if (req.user.collecteur) {
      await prisma.collecteur
        .update({ where: { id: req.user.collecteur.id }, data: { photoUrl: url } })
        .catch(() => {});
    }

    res.json(user);
  }),
);

/** DELETE /api/televersement — supprime une image par son URL (admin). */
router.delete(
  '/',
  exigerRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    res.json(await supprimerImage(publicIdDepuisUrl(url)));
  }),
);

export default router;
