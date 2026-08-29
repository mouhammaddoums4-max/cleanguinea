import { prisma } from './prisma.js';

/** Bareme par defaut, utilise si la table BaremePoints est vide. */
export const BAREME_DEFAUT = {
  PLASTIQUE: 15,
  METAL_FER: 8,
  ALUMINIUM: 40,
  CARTON: 6,
  VERRE: 4,
  ORGANIQUE: 1,
  AUTRES: 2,
  REFUS: 0,
};

/** 100 points = 1 000 GNF. */
export const GNF_PAR_POINT = 10;

/** Plafond mensuel anti-fraude, en kilogrammes de recyclables par client. */
export const PLAFOND_KG_MOIS = 25;

export const NIVEAUX = [
  { nom: 'CHAMPION', seuil: 8000, bonusPct: 30 },
  { nom: 'OR', seuil: 4000, bonusPct: 20 },
  { nom: 'ARGENT', seuil: 1500, bonusPct: 10 },
  { nom: 'BRONZE', seuil: 0, bonusPct: 0 },
];

export function niveauPour(cumule12Mois) {
  return NIVEAUX.find((n) => cumule12Mois >= n.seuil) ?? NIVEAUX[NIVEAUX.length - 1];
}

/**
 * Calcule les points d une pesee, bonus de niveau inclus.
 * Un lot declasse (contamination > 15%) ne rapporte que la moitie des points.
 */
export async function calculerPoints({ categorie, poidsKg, declassee, cumule12Mois }) {
  const bareme = await prisma.baremePoints.findUnique({ where: { categorie } });
  const pointsParKg = bareme?.actif ? bareme.pointsParKg : (BAREME_DEFAUT[categorie] ?? 0);

  let points = Math.round(poidsKg * pointsParKg);
  if (declassee) points = Math.round(points * 0.5);

  const { bonusPct } = niveauPour(cumule12Mois);
  if (bonusPct > 0) points = Math.round(points * (1 + bonusPct / 100));

  return points;
}

/**
 * Credite des points et met a jour le solde et le niveau, dans une seule transaction.
 * Les points expirent 18 mois apres leur credit.
 */
export async function crediterPoints({ userId, points, motif, peseeId = null }) {
  if (points <= 0) return null;

  const expireLe = new Date();
  expireLe.setMonth(expireLe.getMonth() + 18);

  return prisma.$transaction(async (tx) => {
    const mouvement = await tx.mouvementPoints.create({
      data: { userId, sens: 'CREDIT', points, motif, peseeId, expireLe },
    });

    const actuel = await tx.soldePoints.findUnique({ where: { userId } });
    const cumule = (actuel?.cumule12Mois ?? 0) + points;

    await tx.soldePoints.upsert({
      where: { userId },
      create: {
        userId,
        solde: points,
        cumule12Mois: points,
        niveau: niveauPour(points).nom,
      },
      update: {
        solde: { increment: points },
        cumule12Mois: cumule,
        niveau: niveauPour(cumule).nom,
      },
    });

    return mouvement;
  });
}

/** Debite des points lors d une conversion. Refuse si le solde est insuffisant. */
export async function debiterPoints({ userId, points, motif, conversion }) {
  return prisma.$transaction(async (tx) => {
    const solde = await tx.soldePoints.findUnique({ where: { userId } });
    if (!solde || solde.solde < points) {
      const err = new Error('Solde de points insuffisant');
      err.status = 400;
      throw err;
    }

    await tx.soldePoints.update({
      where: { userId },
      data: { solde: { decrement: points } },
    });

    return tx.mouvementPoints.create({
      data: { userId, sens: 'DEBIT', points, motif, conversion },
    });
  });
}

/** Verifie le plafond mensuel anti-fraude sur le mois calendaire en cours. */
export async function poidsRecyclableDuMois(clientId) {
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const agg = await prisma.pesee.aggregate({
    _sum: { poidsKg: true },
    where: {
      mission: { clientId },
      createdAt: { gte: debutMois },
      categorie: { in: ['PLASTIQUE', 'METAL_FER', 'CARTON', 'VERRE'] },
    },
  });

  return agg._sum.poidsKg ?? 0;
}
