import { prisma } from './prisma.js';
import { chargerConfig, categoriesRecyclables, niveauPour, parametre } from './config.js';

/**
 * Moteur Points Clean.
 *
 * Aucune valeur metier n'est codee ici : bareme, taux, seuils, plafonds et
 * duree de validite viennent tous de la base (voir src/lib/config.js).
 */

export { niveauPour };

/** Nombre de GNF que vaut un point. */
export const gnfParPoint = () => parametre('points.gnfParPoint');

/** Plafond mensuel de recyclables par client, en kg (anti-fraude). */
export const plafondKgMois = () => parametre('fraude.plafondKgMois');

/**
 * Points d'une pesee, bonus de niveau inclus.
 * Un lot declasse (contamination au-dela du seuil) rapporte une fraction des points.
 */
export async function calculerPoints({ categorie, poidsKg, declassee, cumule12Mois }) {
  const bareme = await prisma.baremePoints.findUnique({ where: { categorie } });
  if (!bareme?.actif) return 0; // categorie non remuneree

  let points = Math.round(poidsKg * bareme.pointsParKg);

  if (declassee) {
    const facteur = await parametre('fraude.facteurDeclassement');
    points = Math.round(points * facteur);
  }

  const { bonusPct } = await niveauPour(cumule12Mois);
  if (bonusPct > 0) points = Math.round(points * (1 + bonusPct / 100));

  return points;
}

/** Seuil de contamination au-dela duquel un lot est declasse, en %. */
export const seuilContamination = () => parametre('qualite.seuilContaminationPct');

/**
 * Credite des points, met a jour le solde et le niveau, dans une seule transaction.
 * La duree de validite vient du parametre points.validiteMois.
 */
export async function crediterPoints({ userId, points, motif, peseeId = null }) {
  if (points <= 0) return null;

  const validiteMois = await parametre('points.validiteMois');
  const expireLe = new Date();
  expireLe.setMonth(expireLe.getMonth() + validiteMois);

  const { niveaux } = await chargerConfig();

  return prisma.$transaction(async (tx) => {
    const mouvement = await tx.mouvementPoints.create({
      data: { userId, sens: 'CREDIT', points, motif, peseeId, expireLe },
    });

    const actuel = await tx.soldePoints.findUnique({ where: { userId } });
    const cumule = (actuel?.cumule12Mois ?? 0) + points;
    const niveauDe = (c) => (niveaux.find((n) => c >= n.seuil) ?? niveaux[niveaux.length - 1]).code;

    await tx.soldePoints.upsert({
      where: { userId },
      create: {
        userId,
        solde: points,
        cumule12Mois: points,
        niveau: niveauDe(points),
      },
      update: {
        solde: { increment: points },
        cumule12Mois: cumule,
        niveau: niveauDe(cumule),
      },
    });

    return mouvement;
  });
}

/** Debite des points lors d'une conversion. Refuse si le solde est insuffisant. */
export async function debiterPoints({ userId, points, motif, conversion }) {
  return prisma.$transaction(async (tx) => {
    const solde = await tx.soldePoints.findUnique({ where: { userId } });
    if (!solde || solde.solde < points) {
      throw Object.assign(new Error('Solde de points insuffisant'), { status: 400 });
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

/**
 * Poids de recyclables deja presente ce mois-ci par un client.
 * Les categories comptees sont celles marquees `recyclable` dans le referentiel.
 *
 * Une pesee peut etre rattachee au client par deux chemins : la mission (une
 * demande ponctuelle) ou le bac (la pesee faite a l'entrepot). Les deux doivent
 * compter.
 *
 * Ne regarder que les missions laissait passer tout le tonnage pese a
 * l'entrepot — c'est-a-dire la quasi-totalite, depuis que le collecteur ne pese
 * plus sur le terrain. Le plafond anti-fraude ne voyait donc plus ce qu'il est
 * charge de limiter.
 */
export async function poidsRecyclableDuMois(clientId) {
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const agg = await prisma.pesee.aggregate({
    _sum: { poidsKg: true },
    where: {
      OR: [{ mission: { clientId } }, { bac: { clientId } }],
      createdAt: { gte: debutMois },
      categorie: { in: await categoriesRecyclables() },
    },
  });

  return agg._sum.poidsKg ?? 0;
}
