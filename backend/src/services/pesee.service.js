import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { parametre } from '../lib/config.js';
import {
  calculerPoints,
  crediterPoints,
  plafondKgMois,
  poidsRecyclableDuMois,
  seuilContamination,
} from '../lib/points.js';
import { lireCodeQr } from '../lib/qr.js';
import { notifier } from '../lib/notifications.js';

/**
 * Pesee a l'entrepot, et credit des points Clean.
 *
 * Le collecteur ne pese plus rien sur le terrain : le camion rentre, et les
 * trieurs pesent chaque bac categorie par categorie. C'est donc ici, et nulle
 * part ailleurs, que les points doivent etre credites — sans cette route, les
 * points pouvaient etre depenses mais jamais gagnes.
 *
 * L'attribution passe par le code QR du bac, qui porte l'identifiant du client.
 * C'est ce qui rend la chaine possible : un bac anonyme aurait oblige a repartir
 * le tonnage d'une zone entiere a parts egales entre les foyers, ce qui aurait
 * recompense pareil celui qui trie et celui qui ne trie pas — et vide le
 * programme de fidelite de son sens.
 */

export const peseeSchema = z.object({
  /// Code QR du bac, tel que lu a l'entree de l'entrepot.
  codeQr: z.string().min(3),
  categorie: z.enum([
    'PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS',
  ]),
  poidsKg: z.number().positive().max(500),
  /// Part de dechets non conformes constatee par le trieur, en pourcentage.
  contaminationPct: z.number().min(0).max(100).optional(),
  /// false = saisie a la main faute de balance Bluetooth : a controler.
  peseeCertifiee: z.boolean().default(true),
  photoUrl: z.string().url().optional(),
});

export const lotSchema = z.object({
  centreTriId: z.string().optional(),
  pesees: z.array(peseeSchema).min(1).max(200),
});

const refus = (message, status) => Object.assign(new Error(message), { status });

/**
 * Enregistre une pesee, la fait entrer en stock et credite le client.
 *
 * @returns {Promise<object>} detail de la pesee, points compris
 */
async function traiterUnePesee({ donnees, centreTri, capacite, seuil, plafond }) {
  const lu = lireCodeQr(donnees.codeQr);
  if (!lu) throw refus(`Code QR non reconnu : ${donnees.codeQr}`, 400);

  const bac = await prisma.bac.findUnique({
    where: { codeQr: lu.codeQr },
    include: { client: { include: { user: { select: { id: true, nom: true } } } } },
  });
  if (!bac) throw refus(`Bac inconnu : ${lu.codeQr}`, 404);

  // Un bac sans proprietaire se pese quand meme — le tonnage compte pour le
  // centre — mais il n'y a personne a crediter.
  const user = bac.client?.user ?? null;

  const declassee =
    donnees.contaminationPct != null && donnees.contaminationPct > seuil;

  let points = 0;
  let motifNonCredit = null;

  if (!user) {
    motifNonCredit = 'BAC_SANS_CLIENT';
  } else {
    // Plafond mensuel : au-dela, on enregistre le poids sans le remunerer.
    // Sans cela, il suffirait d'apporter les dechets du voisinage sous un seul
    // compte pour transformer le programme de fidelite en source de revenu.
    const dejaCeMois = await poidsRecyclableDuMois(bac.clientId);
    if (dejaCeMois + donnees.poidsKg > plafond) {
      motifNonCredit = 'PLAFOND_MENSUEL';
    } else {
      const solde = await prisma.soldePoints.findUnique({
        where: { userId: user.id },
        select: { cumule12Mois: true },
      });
      points = await calculerPoints({
        categorie: donnees.categorie,
        poidsKg: donnees.poidsKg,
        declassee,
        cumule12Mois: solde?.cumule12Mois ?? 0,
      });
    }
  }

  const pesee = await prisma.pesee.create({
    data: {
      bacId: bac.id,
      categorie: donnees.categorie,
      poidsKg: donnees.poidsKg,
      peseeCertifiee: donnees.peseeCertifiee,
      contaminationPct: donnees.contaminationPct,
      declassee,
      photoUrl: donnees.photoUrl,
    },
  });

  // Entree en stock : le centre doit voir arriver la matiere, qu'elle ait
  // rapporte des points ou non.
  if (centreTri) {
    await prisma.stock.upsert({
      where: {
        centreTriId_categorie: { centreTriId: centreTri.id, categorie: donnees.categorie },
      },
      create: {
        centreTriId: centreTri.id,
        categorie: donnees.categorie,
        quantiteKg: donnees.poidsKg,
        capaciteKg: capacite,
      },
      update: { quantiteKg: { increment: donnees.poidsKg } },
    });
  }

  if (points > 0 && user) {
    await crediterPoints({
      userId: user.id,
      points,
      motif: `Tri ${donnees.categorie.toLowerCase()} — ${donnees.poidsKg} kg`,
      peseeId: pesee.id,
    });

    // Hors transaction : l'echec d'une notification ne doit pas annuler un
    // credit deja acquis.
    notifier({
      userId: user.id,
      type: 'POINTS_CREDITES',
      titre: `+${points} points Clean`,
      message: `Vos ${donnees.poidsKg} kg de ${donnees.categorie.toLowerCase()} ont ete tries. Merci !`,
      lien: '/(client)/paiements',
      donnees: { peseeId: pesee.id, points },
    }).catch(() => {});
  }

  return {
    peseeId: pesee.id,
    codeQr: lu.codeQr,
    client: user?.nom ?? null,
    categorie: donnees.categorie,
    poidsKg: donnees.poidsKg,
    declassee,
    points,
    motifNonCredit,
  };
}

/**
 * Enregistre un lot de pesees d'entrepot.
 *
 * Chaque pesee est traitee independamment : une seule en erreur — code QR
 * illisible, bac inconnu — ne doit pas faire perdre les cinquante autres deja
 * saisies par le trieur.
 */
export async function enregistrerPesees({ centreTriId, pesees }) {
  // Lectures faites une fois pour tout le lot plutot qu'a chaque pesee : la
  // base est derriere un proxy a forte latence et le lot peut compter 200 lignes.
  const [centreTri, capacite, seuil, plafond] = await Promise.all([
    centreTriId
      ? prisma.centreTri.findUnique({ where: { id: centreTriId } })
      : prisma.centreTri.findFirst({ where: { actif: true } }),
    parametre('tri.capaciteParCategorieKg'),
    seuilContamination(),
    plafondKgMois(),
  ]);

  const resultats = [];
  for (const donnees of pesees) {
    try {
      resultats.push({
        statut: 'OK',
        ...(await traiterUnePesee({ donnees, centreTri, capacite, seuil, plafond })),
      });
    } catch (err) {
      resultats.push({
        statut: 'ERREUR',
        codeQr: donnees.codeQr,
        erreur: err.message,
      });
    }
  }

  const reussies = resultats.filter((r) => r.statut === 'OK');

  return {
    resultats,
    resume: {
      total: resultats.length,
      enregistrees: reussies.length,
      enErreur: resultats.length - reussies.length,
      poidsTotalKg: Number(reussies.reduce((s, r) => s + r.poidsKg, 0).toFixed(2)),
      pointsCredites: reussies.reduce((s, r) => s + r.points, 0),
      // Rendu visible plutot que noye : un plafond atteint en masse signale
      // soit une fraude, soit un plafond mal regle.
      plafondAtteint: reussies.filter((r) => r.motifNonCredit === 'PLAFOND_MENSUEL').length,
      sansClient: reussies.filter((r) => r.motifNonCredit === 'BAC_SANS_CLIENT').length,
    },
  };
}
