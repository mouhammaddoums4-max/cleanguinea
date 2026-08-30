import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signerToken, authentifier } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { chargerConfig, parametre } from '../lib/config.js';
import { envoyerSms, modeles } from '../lib/sms.js';
import { construireCodeQr } from '../lib/qr.js';

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

/** Echecs consecutifs tolerés avant verrouillage temporaire du compte. */
const SEUIL_VERROUILLAGE = 5;

const inscriptionSchema = z.object({
  nom: z.string().min(2, 'Le nom complet est requis'),
  // Un foyer ou une societe : le volume et l interlocuteur different, et le
  // back-office doit pouvoir les distinguer des l inscription.
  type: z.enum(['PARTICULIER', 'ENTREPRISE']).default('PARTICULIER'),
  telephone: z.string().min(8, 'Numero de telephone invalide'),
  email: z.string().email().optional().or(z.literal('')),
  motDePasse: z.string().min(6, 'Le mot de passe doit faire au moins 6 caracteres'),
  adresse: z.string().min(3, 'Adresse requise'),
  commune: z.string().min(2, 'Commune requise'),
  quartier: z.string().min(2, 'Quartier requis'),
  nbPersonnes: z.number().int().positive().optional(),
  // Position relevee par le telephone a l'inscription : c'est elle qui permet
  // au collecteur de trouver le foyer, l'adresse seule etant souvent imprecise.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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

    // Les bacs remis a chaque foyer viennent du parametre bac.categoriesParDefaut :
    // deux bacs, un pour ce qui se recycle et un pour le reste. Le nombre est
    // borne par nbBacsFournis de l'offre souscrite.
    const { categories } = await chargerConfig();
    const codesVoulus = await parametre('bac.categoriesParDefaut');
    const actives = new Set(categories.filter((c) => c.actif).map((c) => c.code));

    const bacsParDefaut = codesVoulus
      .filter((code) => actives.has(code))
      .slice(0, offre.nbBacsFournis)
      .map((code, i) => ({ numero: i + 1, categorie: code }));

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
              type: data.type,
              adresse: data.adresse,
              quartierId: quartier.id,
              nbPersonnes: data.nbPersonnes ?? 6,
              latitude: data.latitude,
              longitude: data.longitude,
            },
          },
        },
        include: { client: true },
      });

      await tx.soldePoints.create({ data: { userId: cree.id } });

      // Le QR porte la reference d abonnement : le collecteur qui le scanne
      // sait chez qui il est, meme sans reseau.
      await tx.bac.createMany({
        data: bacsParDefaut.map((b) => ({
          ...b,
          codeQr: construireCodeQr(reference, b.numero),
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

    // Le code de connexion part par SMS : le client doit pouvoir le retrouver
    // meme s'il desinstalle l'application. L'envoi ne bloque pas la reponse et
    // un echec n'annule pas l'inscription.
    const message =
      data.langue === 'en'
        ? modeles.codeClientEn(data.nom, reference)
        : modeles.codeClient(data.nom, reference);

    envoyerSms(telephone, message).catch((err) =>
      console.error('[inscription] SMS du code client non envoye', err.message),
    );

    res.status(201).json({
      token: signerToken(user),
      utilisateur: {
        id: user.id, nom: user.nom, telephone: user.telephone,
        role: user.role, langue: user.langue,
        // C est avec ce code que le client se connectera ensuite.
        identifiant: reference,
      },
      codeClient: reference,
      // Conserve pour ne pas casser les clients deja deployes.
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

    // Un identifiant inconnu est annonce comme tel : l'abonne qui se trompe de
    // numero doit le savoir, plutot que de soupconner son mot de passe. Le
    // verrouillage progressif ci-dessous reste ce qui protege les comptes.
    if (!user) {
      return res.status(404).json({
        erreur: "Aucun compte n'est enregistre pour ce numero.",
        compteInconnu: true,
      });
    }

    const refus = { erreur: 'Mot de passe incorrect' };

    // Compte verrouille : on ne verifie meme pas le mot de passe. La limitation
    // par IP ne suffit pas — un attaquant patient change d'adresse, alors que
    // le compte vise, lui, ne change pas.
    if (user.verrouilleJusqua && user.verrouilleJusqua > new Date()) {
      const minutes = Math.ceil((user.verrouilleJusqua - Date.now()) / 60_000);
      return res.status(429).json({
        erreur: `Compte temporairement bloque apres plusieurs echecs. Reessayez dans ${minutes} minute(s).`,
      });
    }

    if (!(await bcrypt.compare(donnees.motDePasse, user.motDePasse))) {
      const echecs = user.echecsConnexion + 1;

      // Le blocage s'allonge avec les echecs : 5 min, puis 10, 20, 40...
      // Une faute de frappe coute quelques minutes, un script en essuie des
      // heures. Plafonne a une heure pour ne pas enfermer un client dehors.
      const verrouille = echecs >= SEUIL_VERROUILLAGE;
      const minutes = verrouille
        ? Math.min(5 * 2 ** (echecs - SEUIL_VERROUILLAGE), 60)
        : 0;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          echecsConnexion: echecs,
          verrouilleJusqua: verrouille ? new Date(Date.now() + minutes * 60_000) : null,
        },
      });

      // Le refus annonce le verrouillage au moment ou il tombe : sinon
      // l'abonne enchaine les essais sans comprendre pourquoi ils echouent.
      if (verrouille) {
        return res.status(429).json({
          erreur: `Trop d essais. Compte bloque pendant ${minutes} minute(s).`,
        });
      }

      return res.status(401).json({
        ...refus,
        essaisRestants: Math.max(0, SEUIL_VERROUILLAGE - echecs),
      });
    }

    if (!user.actif || user.supprimeLe) {
      return res.status(403).json({ erreur: 'Compte desactive' });
    }

    // Connexion reussie : le compteur repart de zero.
    if (user.echecsConnexion > 0 || user.verrouilleJusqua) {
      await prisma.user.update({
        where: { id: user.id },
        data: { echecsConnexion: 0, verrouilleJusqua: null },
      });
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
