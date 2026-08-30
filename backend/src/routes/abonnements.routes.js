import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authentifier } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/erreurs.js';
import { chargerConfig } from '../lib/config.js';
import { notifier } from '../lib/notifications.js';

const router = Router();
router.use(authentifier);

/**
 * Calcule le prix d'une formule.
 *
 * Toujours cote serveur : un montant envoye par le client serait une invitation
 * a payer ce qu'on veut. L'arrondi se fait a la centaine de francs, les pieces
 * de moins de 100 GNF n'ayant plus cours a Conakry.
 */
function calculerPrix(tarifMensuel, tarifPeriode) {
  const brut = tarifMensuel * tarifPeriode.mois;
  const remise = Math.round((brut * tarifPeriode.remisePct) / 100);
  const total = Math.round((brut - remise) / 100) * 100;

  return {
    mois: tarifPeriode.mois,
    prixMensuelGnf: tarifMensuel,
    brutGnf: brut,
    remisePct: tarifPeriode.remisePct,
    remiseGnf: brut - total,
    totalGnf: total,
    // Ce qu'un mois revient a payer sur cette formule : c'est la comparaison
    // qui interesse le client, pas le total.
    equivalentMensuelGnf: Math.round(total / tarifPeriode.mois),
  };
}

/**
 * GET /api/abonnements/formules?langue=fr|en
 * Grille complete : chaque offre declinee en mensuel, trimestriel et annuel.
 */
router.get(
  '/formules',
  asyncHandler(async (req, res) => {
    const langue = req.query.langue === 'en' ? 'en' : 'fr';
    const l = langue === 'en' ? 'En' : 'Fr';
    const { offres, periodicites } = await chargerConfig();

    res.json(
      offres.map((offre) => ({
        id: offre.id,
        type: offre.type,
        libelle: offre.libelle,
        passagesParSemaine: offre.passagesParSemaine,
        nbBacsFournis: offre.nbBacsFournis,
        formules: periodicites.map((p) => ({
          periodicite: p.periodicite,
          libelle: p[`libelle${l}`],
          ...calculerPrix(offre.tarifMensuelGnf, p),
        })),
      })),
    );
  }),
);

/** GET /api/abonnements/mon-abonnement */
router.get(
  '/mon-abonnement',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const abonnement = await prisma.abonnement.findFirst({
      where: { clientId: req.user.client.id, statut: { not: 'RESILIE' } },
      include: { offre: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!abonnement) return res.json(null);

    const { periodicites } = await chargerConfig();
    const tarif = periodicites.find((p) => p.periodicite === abonnement.periodicite);

    res.json({
      ...abonnement,
      prix: tarif ? calculerPrix(abonnement.offre.tarifMensuelGnf, tarif) : null,
    });
  }),
);

/**
 * POST /api/abonnements/souscrire
 * Souscription ou changement de formule depuis l'application.
 */
const souscriptionSchema = z.object({
  offreType: z.enum(['ESSENTIEL', 'STANDARD', 'PRO']),
  periodicite: z.enum(['MENSUEL', 'TRIMESTRIEL', 'ANNUEL']),
  moyen: z.enum(['ORANGE_MONEY', 'MTN_MOMO', 'VISA', 'MASTERCARD', 'ESPECES']),
  pointsAUtiliser: z.number().int().min(0).default(0),
});

router.post(
  '/souscrire',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });
    const data = souscriptionSchema.parse(req.body);

    const { offres, periodicites, parametres } = await chargerConfig();

    const offre = offres.find((o) => o.type === data.offreType);
    const tarif = periodicites.find((p) => p.periodicite === data.periodicite);
    if (!offre || !tarif) {
      return res.status(400).json({ erreur: 'Formule indisponible' });
    }

    const prix = calculerPrix(offre.tarifMensuelGnf, tarif);

    // Les points ne peuvent pas couvrir plus que le montant du.
    const gnfParPoint = parametres['points.gnfParPoint'];
    const remisePoints = Math.min(data.pointsAUtiliser * gnfParPoint, prix.totalGnf);
    const pointsReels = Math.floor(remisePoints / gnfParPoint);

    if (pointsReels > 0) {
      const solde = await prisma.soldePoints.findUnique({ where: { userId: req.user.id } });
      if (!solde || solde.solde < pointsReels) {
        return res.status(400).json({ erreur: 'Solde de points insuffisant' });
      }
    }

    const debut = new Date();
    const fin = new Date(debut);
    fin.setMonth(fin.getMonth() + prix.mois);

    const enCours = await prisma.abonnement.findFirst({
      where: { clientId: req.user.client.id, statut: { not: 'RESILIE' } },
      orderBy: { createdAt: 'desc' },
    });

    const nbClients = await prisma.abonnement.count();
    const reference =
      enCours?.reference ??
      `CG-${debut.getFullYear()}-${String(nbClients + 1).padStart(6, '0')}`;

    const resultat = await prisma.$transaction(async (tx) => {
      const abonnement = enCours
        ? await tx.abonnement.update({
            where: { id: enCours.id },
            data: {
              offreId: offre.id,
              periodicite: data.periodicite,
              statut: 'ACTIF',
              prochainPrelevement: fin,
              dateFin: null,
            },
            include: { offre: true },
          })
        : await tx.abonnement.create({
            data: {
              reference,
              clientId: req.user.client.id,
              offreId: offre.id,
              periodicite: data.periodicite,
              prochainPrelevement: fin,
            },
            include: { offre: true },
          });

      if (pointsReels > 0) {
        await tx.soldePoints.update({
          where: { userId: req.user.id },
          data: { solde: { decrement: pointsReels } },
        });
        await tx.mouvementPoints.create({
          data: {
            userId: req.user.id,
            sens: 'DEBIT',
            points: pointsReels,
            motif: `Souscription ${abonnement.reference}`,
            conversion: 'REDUCTION_ABONNEMENT',
          },
        });
      }

      const paiement = await tx.paiement.create({
        data: {
          reference: `PAY-${Date.now()}`,
          clientId: req.user.client.id,
          abonnementId: abonnement.id,
          periodicite: data.periodicite,
          montantGnf: prix.totalGnf - remisePoints,
          remisePointsGnf: remisePoints,
          moyen: data.moyen,
          // En production, le webhook de l'operateur fait passer a PAYE.
          statut: data.moyen === 'ESPECES' ? 'PAYE' : 'EN_ATTENTE',
          payeLe: data.moyen === 'ESPECES' ? new Date() : null,
          periodeDebut: debut,
          periodeFin: fin,
        },
      });

      return { abonnement, paiement };
    });

    notifier({
      userId: req.user.id,
      type: 'PAIEMENT_DU',
      titre: 'Souscription enregistree',
      message:
        resultat.paiement.statut === 'PAYE'
          ? `Votre abonnement ${offre.libelle} est actif jusqu'au ${fin.toLocaleDateString('fr-FR')}.`
          : `Validez le paiement de ${resultat.paiement.montantGnf.toLocaleString('fr-FR')} GNF sur votre telephone.`,
      lien: '/(client)/paiements',
      donnees: { abonnementId: resultat.abonnement.id, montant: resultat.paiement.montantGnf },
    }).catch((e) => console.error('[notif] souscription', e.message));

    res.status(201).json({ ...resultat, prix, pointsUtilises: pointsReels });
  }),
);

/** POST /api/abonnements/resilier */
router.post(
  '/resilier',
  asyncHandler(async (req, res) => {
    if (!req.user.client) return res.status(403).json({ erreur: 'Reserve aux clients' });

    const abonnement = await prisma.abonnement.findFirst({
      where: { clientId: req.user.client.id, statut: 'ACTIF' },
    });
    if (!abonnement) return res.status(404).json({ erreur: 'Aucun abonnement actif' });

    // Resiliation a echeance, pas immediate : le client a paye jusqu'au bout
    // de sa periode, le service lui est du.
    res.json(
      await prisma.abonnement.update({
        where: { id: abonnement.id },
        data: { dateFin: abonnement.prochainPrelevement ?? new Date() },
      }),
    );
  }),
);

export default router;
