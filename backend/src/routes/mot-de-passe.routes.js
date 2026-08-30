import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { envoyerSms, genererOtp, modeles } from '../lib/sms.js';

const router = Router();

/**
 * Reinitialisation de mot de passe par SMS.
 *
 * Trois etapes : demande, verification du code, changement. Chacune a ses
 * garde-fous, et ils comptent plus que le confort ici — un mot de passe
 * reinitialisable par n'importe qui vaut mieux ne pas exister.
 *
 * NUMERO INCONNU ANNONCE. La demande dit clairement qu'aucun compte n'existe
 * pour ce numero : un abonne qui se trompe d'un chiffre doit le savoir tout de
 * suite plutot que d'attendre un SMS qui ne viendra pas. Cela rend la route
 * enumerable — le quota de trois envois par heure et par compte, et le plafond
 * d'essais sur le code, sont ce qui limite l'abus.
 *
 * CODE NON STOCKE. Seule l'empreinte SHA-256 est conservee. Une fuite de la
 * base ne donnerait pas les codes en cours.
 *
 * PLAFOND D'ESSAIS. Six chiffres se devinent en quelques milliers de
 * tentatives : au-dela de cinq essais, le code est brule.
 *
 * REPONSE SANS FORME DISTINCTIVE. Le message est le meme, mais l'objet aussi :
 * aucun champ supplementaire n'apparait quand le compte existe. Un message
 * identique dans deux objets de formes differentes ne cache rien.
 *
 * QUOTA D'ENVOI. Le credit SMS est limite et chaque message coute. Un meme
 * numero ne peut pas declencher plus de trois envois par heure.
 */

const VALIDITE_MINUTES = 10;
const MAX_ESSAIS = 5;
const MAX_DEMANDES_PAR_HEURE = 3;
const VALIDITE_JETON_MINUTES = 15;

const empreinter = (code) => createHash('sha256').update(String(code)).digest('hex');

function normaliserTelephone(brut) {
  const chiffres = String(brut).replace(/\D/g, '');
  if (chiffres.startsWith('224')) return `+${chiffres}`;
  return `+224${chiffres.replace(/^0+/, '')}`;
}

/** Resout un identifiant : telephone, code client ou numero employe. */
async function trouverCompte(saisi) {
  const reference = String(saisi).trim().toUpperCase().replace(/\s+/g, '');

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

  if (!/\d/.test(saisi)) return null;
  return prisma.user.findUnique({ where: { telephone: normaliserTelephone(saisi) } });
}

/**
 * POST /api/mot-de-passe/demande
 * Envoie un code a six chiffres par SMS.
 */
router.post(
  '/demande',
  asyncHandler(async (req, res) => {
    const { identifiant } = z.object({ identifiant: z.string().min(3) }).parse(req.body);

    const user = await trouverCompte(identifiant);

    // Un numero inconnu est annonce comme tel. C'est un choix explicite : sans
    // lui, l'abonne qui se trompe d'un chiffre attend indefiniment un SMS qui
    // n'arrivera jamais. En echange, la route permet de savoir si un numero est
    // abonne — le quota d'envoi et la limitation par IP en sont la contrepartie.
    if (!user || user.supprimeLe) {
      return res.status(404).json({
        erreur: "Aucun compte n'est enregistre pour ce numero.",
        compteInconnu: true,
      });
    }
    if (!user.actif) {
      return res.status(403).json({ erreur: 'Ce compte est desactive. Appelez le service client.' });
    }

    const reponse = {
      envoye: true,
      message: 'Un code vient de vous etre envoye par SMS.',
      validiteMinutes: VALIDITE_MINUTES,
    };

    // Quota : trois envois par heure et par compte.
    const uneHeure = new Date(Date.now() - 3600_000);
    const recents = await prisma.codeVerification.count({
      where: { userId: user.id, createdAt: { gte: uneHeure } },
    });
    if (recents >= MAX_DEMANDES_PAR_HEURE) {
      return res.status(429).json({
        erreur: 'Trop de demandes. Reessayez dans une heure ou appelez le service client.',
      });
    }

    // Les codes precedents encore valides sont annules : deux codes actifs en
    // meme temps doublent la surface d'attaque sans rien apporter.
    await prisma.codeVerification.updateMany({
      where: { userId: user.id, utiliseLe: null, expireLe: { gt: new Date() } },
      data: { expireLe: new Date() },
    });

    const code = genererOtp();
    const expireLe = new Date(Date.now() + VALIDITE_MINUTES * 60_000);

    await prisma.codeVerification.create({
      data: {
        userId: user.id,
        empreinte: empreinter(code),
        expireLe,
        ip: req.ip,
      },
    });

    await envoyerSms(user.telephone, modeles.otp(code));

    res.json(reponse);
  }),
);

/**
 * POST /api/mot-de-passe/verifier
 * Echange un code valide contre un jeton a usage unique.
 */
router.post(
  '/verifier',
  asyncHandler(async (req, res) => {
    const { identifiant, code } = z
      .object({ identifiant: z.string().min(3), code: z.string().length(6) })
      .parse(req.body);

    const user = await trouverCompte(identifiant);
    const refus = { erreur: 'Code invalide ou expire' };
    if (!user) return res.status(400).json(refus);

    const verification = await prisma.codeVerification.findFirst({
      // `jeton: null` est essentiel : sans lui, un code deja echange restait
      // verifiable et chaque rejeu emettait un nouveau jeton, ce qui annulait
      // silencieusement le precedent. L'utilisateur se retrouvait avec un lien
      // mort sans rien avoir fait de mal.
      where: { userId: user.id, utiliseLe: null, jeton: null, expireLe: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) return res.status(400).json(refus);

    if (verification.essais >= MAX_ESSAIS) {
      // Code brule : on l'expire pour de bon plutot que de laisser continuer.
      await prisma.codeVerification.update({
        where: { id: verification.id },
        data: { expireLe: new Date() },
      });
      return res.status(429).json({
        erreur: 'Trop de tentatives. Demandez un nouveau code.',
      });
    }

    if (verification.empreinte !== empreinter(code)) {
      await prisma.codeVerification.update({
        where: { id: verification.id },
        data: { essais: { increment: 1 } },
      });
      return res.status(400).json({
        ...refus,
        essaisRestants: MAX_ESSAIS - verification.essais - 1,
      });
    }

    // Le jeton remplace le code : il est plus long, et il ne circule pas par SMS.
    const jeton = randomUUID();
    await prisma.codeVerification.update({
      where: { id: verification.id },
      data: { jeton, expireLe: new Date(Date.now() + VALIDITE_JETON_MINUTES * 60_000) },
    });

    res.json({ jeton, validiteMinutes: VALIDITE_JETON_MINUTES });
  }),
);

/**
 * POST /api/mot-de-passe/reinitialiser
 * Change le mot de passe et invalide toutes les sessions de l'appareil.
 */
router.post(
  '/reinitialiser',
  asyncHandler(async (req, res) => {
    const { jeton, nouveau } = z
      .object({
        jeton: z.string().uuid(),
        nouveau: z.string().min(6, 'Le mot de passe doit faire au moins 6 caracteres'),
      })
      .parse(req.body);

    const verification = await prisma.codeVerification.findUnique({
      where: { jeton },
      include: { user: { select: { id: true, nom: true, telephone: true, actif: true } } },
    });

    if (!verification || verification.utiliseLe || verification.expireLe < new Date()) {
      return res.status(400).json({ erreur: 'Lien expire. Recommencez la procedure.' });
    }
    if (!verification.user.actif) {
      return res.status(403).json({ erreur: 'Compte desactive' });
    }

    const empreinteMdp = await bcrypt.hash(nouveau, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: {
          motDePasse: empreinteMdp,
          // Revoque tous les jetons deja emis. Sans cela, quelqu'un qui avait
          // pris le compte gardait un acces valable jusqu'a trente jours : la
          // victime changeait son mot de passe sans rien chasser du tout.
          jetonVersion: { increment: 1 },
          // Le proprietaire legitime vient de prouver qu'il tient le numero :
          // le verrou pose par les tentatives de l'attaquant n'a plus lieu d'etre.
          echecsConnexion: 0,
          verrouilleJusqua: null,
        },
      }),
      // Usage unique : le jeton est consomme, pas seulement expire.
      prisma.codeVerification.update({
        where: { id: verification.id },
        data: { utiliseLe: new Date(), jeton: null },
      }),
      // Les appareils enregistres sont detaches. Si le compte a ete repris par
      // quelqu'un d'autre, l'ancien telephone cesse de recevoir ses notifications.
      prisma.appareilPush.updateMany({
        where: { userId: verification.userId },
        data: { actif: false },
      }),
    ]);

    envoyerSms(
      verification.user.telephone,
      `Senyi : votre mot de passe vient d etre modifie. ` +
        `Si ce n est pas vous, appelez immediatement le service client.`,
    ).catch(() => {});

    res.json({ reinitialise: true });
  }),
);

export default router;
