-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'COLLECTEUR', 'SUPERVISEUR', 'ADMIN');

-- CreateEnum
CREATE TYPE "CategorieDechet" AS ENUM ('PLASTIQUE', 'METAL_FER', 'AUTRES', 'CARTON', 'VERRE', 'ORGANIQUE', 'REFUS');

-- CreateEnum
CREATE TYPE "TypeOffre" AS ENUM ('ESSENTIEL', 'STANDARD', 'PRO');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'SUSPENDU', 'RESILIE');

-- CreateEnum
CREATE TYPE "OrigineMission" AS ENUM ('PLANIFIEE', 'DEMANDE_IMMEDIATE', 'DEMANDE_PROGRAMMEE');

-- CreateEnum
CREATE TYPE "StatutMission" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'EN_ROUTE', 'ARRIVE', 'TERMINEE', 'ANNULEE', 'MANQUEE');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('ORANGE_MONEY', 'MTN_MOMO', 'VISA', 'MASTERCARD', 'ESPECES');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'PAYE', 'ECHOUE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "SensPoints" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TypeConversion" AS ENUM ('REDUCTION_ABONNEMENT', 'CREDIT_MOBILE_MONEY', 'BON_PARTENAIRE', 'CADEAU_CATALOGUE', 'DON_ASSOCIATION');

-- CreateEnum
CREATE TYPE "NiveauAlerte" AS ENUM ('INFO', 'ATTENTION', 'CRITIQUE');

-- CreateTable
CREATE TABLE "Commune" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quartier" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "communeId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quartier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "nom" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "photoUrl" TEXT,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "quartierId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "nbPersonnes" INTEGER NOT NULL DEFAULT 6,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collecteur" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "vehicule" TEXT,
    "note" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "nbEvaluations" INTEGER NOT NULL DEFAULT 0,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "positionMaj" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collecteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offre" (
    "id" TEXT NOT NULL,
    "type" "TypeOffre" NOT NULL,
    "libelle" TEXT NOT NULL,
    "tarifMensuelGnf" INTEGER NOT NULL,
    "passagesParSemaine" INTEGER NOT NULL,
    "nbBacsFournis" INTEGER NOT NULL DEFAULT 3,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Offre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "offreId" TEXT NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "prochainPrelevement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bac" (
    "id" TEXT NOT NULL,
    "codeQr" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "categorie" "CategorieDechet" NOT NULL,
    "volumeLitres" INTEGER NOT NULL DEFAULT 240,
    "niveauTiers" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "enService" BOOLEAN NOT NULL DEFAULT true,
    "dateRemise" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientRef" TEXT,
    "clientId" TEXT NOT NULL,
    "quartierId" TEXT NOT NULL,
    "collecteurId" TEXT,
    "origine" "OrigineMission" NOT NULL DEFAULT 'PLANIFIEE',
    "statut" "StatutMission" NOT NULL DEFAULT 'EN_ATTENTE',
    "datePlanifiee" TIMESTAMP(3) NOT NULL,
    "fenetreFin" TIMESTAMP(3),
    "accepteeA" TIMESTAMP(3),
    "enRouteA" TIMESTAMP(3),
    "arriveeA" TIMESTAMP(3),
    "termineeA" TIMESTAMP(3),
    "etaMinutes" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "poidsTotalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commentaire" TEXT,
    "motifAnnulation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionBac" (
    "missionId" TEXT NOT NULL,
    "bacId" TEXT NOT NULL,

    CONSTRAINT "MissionBac_pkey" PRIMARY KEY ("missionId","bacId")
);

-- CreateTable
CREATE TABLE "Pesee" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "bacId" TEXT,
    "categorie" "CategorieDechet" NOT NULL,
    "poidsKg" DOUBLE PRECISION NOT NULL,
    "peseeCertifiee" BOOLEAN NOT NULL DEFAULT true,
    "contaminationPct" DOUBLE PRECISION,
    "declassee" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pesee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "collecteurId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaremePoints" (
    "id" TEXT NOT NULL,
    "categorie" "CategorieDechet" NOT NULL,
    "pointsParKg" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateEffet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaremePoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorieConfig" (
    "id" TEXT NOT NULL,
    "code" "CategorieDechet" NOT NULL,
    "libelleFr" TEXT NOT NULL,
    "libelleEn" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "couleurFond" TEXT NOT NULL,
    "icone" TEXT NOT NULL DEFAULT 'trash',
    "recyclable" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategorieConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TauxConversion" (
    "id" TEXT NOT NULL,
    "type" "TypeConversion" NOT NULL,
    "libelleFr" TEXT NOT NULL,
    "libelleEn" TEXT NOT NULL,
    "pointsPour1000Gnf" INTEGER NOT NULL,
    "plafondMensuelGnf" INTEGER,
    "soldeMinimumPoints" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TauxConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NiveauFidelite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelleFr" TEXT NOT NULL,
    "libelleEn" TEXT NOT NULL,
    "seuil" INTEGER NOT NULL,
    "bonusPct" INTEGER NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NiveauFidelite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "libelleFr" TEXT NOT NULL,
    "libelleEn" TEXT NOT NULL,
    "groupe" TEXT NOT NULL DEFAULT 'general',
    "modifiable" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoldePoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "solde" INTEGER NOT NULL DEFAULT 0,
    "cumule12Mois" INTEGER NOT NULL DEFAULT 0,
    "niveau" TEXT NOT NULL DEFAULT 'BRONZE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoldePoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sens" "SensPoints" NOT NULL,
    "points" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "peseeId" TEXT,
    "conversion" "TypeConversion",
    "expireLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "abonnementId" TEXT,
    "montantGnf" INTEGER NOT NULL,
    "remisePointsGnf" INTEGER NOT NULL DEFAULT 0,
    "moyen" "MoyenPaiement" NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "refOperateur" TEXT,
    "payeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentreTri" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "capaciteTonnesMois" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentreTri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "centreTriId" TEXT NOT NULL,
    "categorie" "CategorieDechet" NOT NULL,
    "quantiteKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capaciteKg" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "centreTriId" TEXT NOT NULL,
    "categorie" "CategorieDechet" NOT NULL,
    "poidsKg" DOUBLE PRECISION NOT NULL,
    "venteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acheteur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "matieres" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acheteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "poidsTotalKg" DOUBLE PRECISION NOT NULL,
    "prixKgGnf" INTEGER NOT NULL,
    "montantGnf" INTEGER NOT NULL,
    "dateVente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "niveau" "NiveauAlerte" NOT NULL DEFAULT 'INFO',
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commune_nom_key" ON "Commune"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Quartier_communeId_nom_key" ON "Quartier"("communeId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "User_telephone_key" ON "User"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Client_quartierId_idx" ON "Client"("quartierId");

-- CreateIndex
CREATE UNIQUE INDEX "Collecteur_userId_key" ON "Collecteur"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Collecteur_matricule_key" ON "Collecteur"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Offre_type_key" ON "Offre"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_reference_key" ON "Abonnement"("reference");

-- CreateIndex
CREATE INDEX "Abonnement_clientId_idx" ON "Abonnement"("clientId");

-- CreateIndex
CREATE INDEX "Abonnement_statut_idx" ON "Abonnement"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Bac_codeQr_key" ON "Bac"("codeQr");

-- CreateIndex
CREATE INDEX "Bac_categorie_idx" ON "Bac"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "Bac_clientId_numero_key" ON "Bac"("clientId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_reference_key" ON "Mission"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Mission_clientRef_key" ON "Mission"("clientRef");

-- CreateIndex
CREATE INDEX "Mission_clientId_idx" ON "Mission"("clientId");

-- CreateIndex
CREATE INDEX "Mission_collecteurId_idx" ON "Mission"("collecteurId");

-- CreateIndex
CREATE INDEX "Mission_statut_idx" ON "Mission"("statut");

-- CreateIndex
CREATE INDEX "Mission_datePlanifiee_idx" ON "Mission"("datePlanifiee");

-- CreateIndex
CREATE INDEX "Pesee_missionId_idx" ON "Pesee"("missionId");

-- CreateIndex
CREATE INDEX "Pesee_categorie_idx" ON "Pesee"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_missionId_key" ON "Evaluation"("missionId");

-- CreateIndex
CREATE INDEX "Evaluation_collecteurId_idx" ON "Evaluation"("collecteurId");

-- CreateIndex
CREATE UNIQUE INDEX "BaremePoints_categorie_key" ON "BaremePoints"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "CategorieConfig_code_key" ON "CategorieConfig"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TauxConversion_type_key" ON "TauxConversion"("type");

-- CreateIndex
CREATE UNIQUE INDEX "NiveauFidelite_code_key" ON "NiveauFidelite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Parametre_cle_key" ON "Parametre"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "SoldePoints_userId_key" ON "SoldePoints"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MouvementPoints_peseeId_key" ON "MouvementPoints"("peseeId");

-- CreateIndex
CREATE INDEX "MouvementPoints_userId_idx" ON "MouvementPoints"("userId");

-- CreateIndex
CREATE INDEX "MouvementPoints_createdAt_idx" ON "MouvementPoints"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_reference_key" ON "Paiement"("reference");

-- CreateIndex
CREATE INDEX "Paiement_clientId_idx" ON "Paiement"("clientId");

-- CreateIndex
CREATE INDEX "Paiement_statut_idx" ON "Paiement"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "CentreTri_nom_key" ON "CentreTri"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_centreTriId_categorie_key" ON "Stock"("centreTriId", "categorie");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_reference_key" ON "Lot"("reference");

-- CreateIndex
CREATE INDEX "Lot_categorie_idx" ON "Lot"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "Acheteur_nom_key" ON "Acheteur"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_reference_key" ON "Vente"("reference");

-- CreateIndex
CREATE INDEX "Vente_dateVente_idx" ON "Vente"("dateVente");

-- CreateIndex
CREATE INDEX "Alerte_lue_idx" ON "Alerte"("lue");

-- CreateIndex
CREATE INDEX "Alerte_createdAt_idx" ON "Alerte"("createdAt");

-- AddForeignKey
ALTER TABLE "Quartier" ADD CONSTRAINT "Quartier_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_quartierId_fkey" FOREIGN KEY ("quartierId") REFERENCES "Quartier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collecteur" ADD CONSTRAINT "Collecteur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "Offre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bac" ADD CONSTRAINT "Bac_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_quartierId_fkey" FOREIGN KEY ("quartierId") REFERENCES "Quartier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_collecteurId_fkey" FOREIGN KEY ("collecteurId") REFERENCES "Collecteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionBac" ADD CONSTRAINT "MissionBac_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionBac" ADD CONSTRAINT "MissionBac_bacId_fkey" FOREIGN KEY ("bacId") REFERENCES "Bac"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesee" ADD CONSTRAINT "Pesee_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesee" ADD CONSTRAINT "Pesee_bacId_fkey" FOREIGN KEY ("bacId") REFERENCES "Bac"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_collecteurId_fkey" FOREIGN KEY ("collecteurId") REFERENCES "Collecteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementPoints" ADD CONSTRAINT "MouvementPoints_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementPoints" ADD CONSTRAINT "MouvementPoints_peseeId_fkey" FOREIGN KEY ("peseeId") REFERENCES "Pesee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "Abonnement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_centreTriId_fkey" FOREIGN KEY ("centreTriId") REFERENCES "CentreTri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_centreTriId_fkey" FOREIGN KEY ("centreTriId") REFERENCES "CentreTri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Acheteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

