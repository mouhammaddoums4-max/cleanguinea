import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signerToken, authentifier } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';

const router = Router();

/** Normalise vers le format +224XXXXXXXXX attendu par les operateurs. */
function normaliserTelephone(brut) {
  const chiffres = String(brut).replace(/\D/g, '');
  if (chiffres.startsWith('224')) return `+${chiffres}`;
  return `+224${chiffres.replace(/^0+/, '')}`;
}

const inscriptionSchema = z.object({
  nom: z.string().min(2, 'Le nom complet est requis'),
  telephone: z.string().min(8, 'Numero de telephone invalide'),
  email: z.string().email().optional().or(z.literal('')),
  motDePasse: z.string().min(6, 'Le mot de passe doit faire au moins 6 caracteres'),
  adresse: z.string().min(3, 'Adresse requise'),
  commune: z.string().min(2, 'Commune requise'),
  quartier: z.string().min(2, 'Quartier requis'),
  nbPersonnes: z.number().int().positive().optional(),
  cguAcceptees: z.literal(true, { errorMap: () => ({ message: 'Vous devez accepter les CGU' }) }),
});

/**
 * POST /api/auth/inscription
 * Ecran "Creer un compte" de l application client.
 * Cree le compte, le profil client, ses trois bacs et son abonnement Standard.
 */
router.post(
  '/inscription',
  asyncHandler(async (req, res) => {
    const data = inscriptionSchema.parse(req.body);
    const telephone = normaliserTelephone(data.telephone);

    const commune = await prisma.commune.upsert({
      where: { nom: data.commune },
      create: { nom: data.commune },
      update: {},
    });

    const quartier = await prisma.quartier.upsert({
      where: { communeId_nom: { communeId: commune.id, nom: data.quartier } },
      create: { nom: data.quartier, communeId: commune.id },
      update: {},
    });

    const offre = await prisma.offre.findUnique({ where: { type: 'STANDARD' } });
    if (!offre) {
      return res.status(500).json({ erreur: 'Aucune offre Standard configuree' });
    }

    const nbClients = await prisma.client.count();
    const reference = `CG-${new Date().getFullYear()}-${String(nbClients + 1).padStart(6, '0')}`;

    const prochainPrelevement = new Date();
    prochainPrelevement.setMonth(prochainPrelevement.getMonth() + 1);

    // Les trois bacs remis a chaque foyer, comme sur l ecran d accueil.
    const bacsParDefaut = [
      { numero: 1, categorie: 'PLASTIQUE' },
      { numero: 2, categorie: 'METAL_FER' },
      { numero: 3, categorie: 'AUTRES' },
    ];

    const user = await prisma.$transaction(async (tx) => {
      const cree = await tx.user.create({
        data: {
          nom: data.nom,
          telephone,
          email: data.email || null,
          motDePasse: await bcrypt.hash(data.motDePasse, 10),
          role: 'CLIENT',
          client: {
            create: {
              adresse: data.adresse,
              quartierId: quartier.id,
              nbPersonnes: data.nbPersonnes ?? 6,
            },
          },
        },
        include: { client: true },
      });

      await tx.soldePoints.create({ data: { userId: cree.id } });

      await tx.bac.createMany({
        data: bacsParDefaut.map((b) => ({
          ...b,
          codeQr: `CG-BAC-${cree.client.id.slice(-6).toUpperCase()}-${b.numero}`,
          clientId: cree.client.id,
          dateRemise: new Date(),
        })),
      });

      await tx.abonnement.create({
        data: {
          reference,
          clientId: cree.client.id,
          offreId: offre.id,
          prochainPrelevement,
        },
      });

      return cree;
    });

    res.status(201).json({
      token: signerToken(user),
      utilisateur: { id: user.id, nom: user.nom, telephone: user.telephone, role: user.role },
    });
  }),
);

const connexionSchema = z.object({
  telephone: z.string().min(8),
  motDePasse: z.string().min(1),
});

/** POST /api/auth/connexion — ecran "Se connecter". */
router.post(
  '/connexion',
  asyncHandler(async (req, res) => {
    const { telephone, motDePasse } = connexionSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { telephone: normaliserTelephone(telephone) },
    });

    // Message identique dans les deux cas : ne pas reveler si le compte existe.
    if (!user || !(await bcrypt.compare(motDePasse, user.motDePasse))) {
      return res.status(401).json({ erreur: 'Telephone ou mot de passe incorrect' });
    }
    if (!user.actif) {
      return res.status(403).json({ erreur: 'Compte desactive' });
    }

    res.json({
      token: signerToken(user),
      utilisateur: { id: user.id, nom: user.nom, telephone: user.telephone, role: user.role },
    });
  }),
);

/** GET /api/auth/moi — profil complet de l utilisateur connecte. */
router.get(
  '/moi',
  authentifier,
  asyncHandler(async (req, res) => {
    const { motDePasse, ...user } = req.user;

    const solde = await prisma.soldePoints.findUnique({ where: { userId: user.id } });

    let client = null;
    if (user.client) {
      client = await prisma.client.findUnique({
        where: { id: user.client.id },
        include: {
          quartier: { include: { commune: true } },
          bacs: { where: { enService: true }, orderBy: { numero: 'asc' } },
          abonnements: {
            where: { statut: 'ACTIF' },
            include: { offre: true },
            take: 1,
          },
        },
      });
    }

    res.json({ utilisateur: user, client, points: solde });
  }),
);

export default router;
