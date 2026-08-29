import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signerToken, authentifier } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { chargerConfig, parametre } from '../lib/config.js';

const router = Router();

/** Normalise vers le format +224XXXXXXXXX attendu par les operateurs. */
function normaliserTelephone(brut) {
  const chiffres = String(brut).replace(/\D/g, '');
  if (chiffres.startsWith('224')) return `+${chiffres}`;
  return `+224${chiffres.replace(/^0+/, '')}`;
}

/**
 * Resout un identifiant de connexion vers un utilisateur.
 *
 * Trois formes acceptees, dans cet ordre :
 *   1. numero d abonnement du client   -> CG-2026-000001
 *   2. numero employe du collecteur    -> COL-001
 *   3. numero de telephone             -> +224 6XX XX XX XX
 *
 * Le numero de telephone reste accepte : c est ce que les premiers abonnes
 * connaissent, et le retirer les enfermerait dehors.
 */
async function resoudreIdentifiant(brut) {
  const saisi = String(brut).trim();
  if (!saisi) return null;

  // Les references sont saisies sans egard a la casse ni aux espaces.
  const reference = saisi.toUpperCase().replace(/\s+/g, '');

  const abonnement = await prisma.abonnement.findUnique({
    where: { reference },
    include: { client: { include: { user: true } } },
  });
  if (abonnement) return abonnement.client.user;

  const collecteur = await prisma.collecteur.findUnique({
    where: { matricule: reference },
    include: { user: true },
  });
  if (collecteur) return collecteur.user;

  // Un identifiant sans chiffre ne peut pas etre un numero : inutile d aller plus loin.
  if (!/\d/.test(saisi)) return null;

  return prisma.user.findUnique({ where: { telephone: normaliserTelephone(saisi) } });
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
  langue: z.enum(['fr', 'en']).default('fr'),
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

    // L'offre par defaut est un parametre, pas une valeur codee.
    const typeOffreDefaut = await parametre('abonnement.offreParDefaut');
    const offre = await prisma.offre.findUnique({ where: { type: typeOffreDefaut } });
    if (!offre) {
      return res.status(503).json({ erreur: `Offre ${typeOffreDefaut} non configuree` });
    }

    const nbClients = await prisma.client.count();
    const reference = `CG-${new Date().getFullYear()}-${String(nbClients + 1).padStart(6, '0')}`;

    const prochainPrelevement = new Date();
    prochainPrelevement.setMonth(prochainPrelevement.getMonth() + 1);

    // Les bacs remis a chaque foyer viennent du referentiel des categories :
    // leur nombre suit nbBacsFournis de l'offre, leur ordre celui du referentiel.
    const { categories } = await chargerConfig();
    const bacsParDefaut = categories
      .filter((c) => c.actif)
      .slice(0, offre.nbBacsFournis)
      .map((c, i) => ({ numero: i + 1, categorie: c.code }));

    const user = await prisma.$transaction(async (tx) => {
      const cree = await tx.user.create({
        data: {
          nom: data.nom,
          telephone,
          email: data.email || null,
          motDePasse: await bcrypt.hash(data.motDePasse, 10),
          role: 'CLIENT',
          langue: data.langue,
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
      utilisateur: {
        id: user.id, nom: user.nom, telephone: user.telephone,
        role: user.role, langue: user.langue,
        // C est avec ce numero que le client se connectera ensuite.
        identifiant: reference,
      },
      numeroAbonnement: reference,
    });
  }),
);

const connexionSchema = z.object({
  // `telephone` reste accepte pour ne pas casser les clients deja deployes.
  identifiant: z.string().min(3).optional(),
  telephone: z.string().min(3).optional(),
  motDePasse: z.string().min(1),
});

/** POST /api/auth/connexion — ecran "Se connecter". */
router.post(
  '/connexion',
  asyncHandler(async (req, res) => {
    const donnees = connexionSchema.parse(req.body);
    const saisi = donnees.identifiant ?? donnees.telephone;

    if (!saisi) {
      return res.status(400).json({ erreur: 'Identifiant requis' });
    }

    const user = await resoudreIdentifiant(saisi);

    // Message identique dans tous les cas : ne pas reveler si le compte existe.
    if (!user || !(await bcrypt.compare(donnees.motDePasse, user.motDePasse))) {
      return res.status(401).json({ erreur: 'Identifiant ou mot de passe incorrect' });
    }
    if (!user.actif || user.supprimeLe) {
      return res.status(403).json({ erreur: 'Compte desactive' });
    }

    res.json({
      token: signerToken(user),
      utilisateur: {
        id: user.id, nom: user.nom, telephone: user.telephone,
        role: user.role, langue: user.langue,
        identifiant: await identifiantDe(user),
      },
    });
  }),
);

/** Identifiant de connexion a rappeler a l utilisateur apres sa connexion. */
async function identifiantDe(user) {
  if (user.role === 'CLIENT') {
    const abonnement = await prisma.abonnement.findFirst({
      where: { client: { userId: user.id }, statut: 'ACTIF' },
      select: { reference: true },
    });
    return abonnement?.reference ?? null;
  }

  const collecteur = await prisma.collecteur.findUnique({
    where: { userId: user.id },
    select: { matricule: true },
  });
  return collecteur?.matricule ?? null;
}

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

    let collecteur = null;
    if (user.collecteur) {
      collecteur = await prisma.collecteur.findUnique({ where: { id: user.collecteur.id } });
    }

    res.json({
      utilisateur: { ...user, identifiant: await identifiantDe(user) },
      client,
      collecteur,
      points: solde,
    });
  }),
);

export default router;
