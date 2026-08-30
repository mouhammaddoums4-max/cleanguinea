# Sényi — *Du déchet à la valeur*

Plateforme numérique de gestion des déchets à Conakry : collecte chez les **foyers** et les
**professionnels**, tri, valorisation des matières recyclables et programme de fidélité
**Points Clean**.

> **Mission** — Offrir un service de collecte fiable, traçable et abordable aux ménages et
> commerces de Conakry, tout en transformant les déchets en matières premières secondaires
> et en emplois locaux.

---

## Organisation du dépôt

```
cleanguinea/
├── backend/     API REST — Node.js · Express · Prisma · PostgreSQL
├── appmobile/   Application client + collecteur — Expo SDK 57 · React Native
├── adminweb/    Back-office de supervision — Next.js 15 · React 19 · Tailwind
├── docs/        Dossier business (12 documents)
└── finance/     Modèle financier 5 ans (CSV)
```

| Dossier | Rôle | Démarrage |
|---|---|---|
| [`backend/`](backend/) | API, base de données, moteur Points Clean, intégrations Mobile Money et SMS | [README](backend/README.md) |
| [`appmobile/`](appmobile/) | Espace client (8 écrans) et espace collecteur (5 écrans) | [README](appmobile/README.md) |
| [`adminweb/`](adminweb/) | Tableau de bord, collectes, stock, ventes, finance | [README](adminweb/README.md) |

**Correctif barre de navigation Android** (barre système qui recouvrait la barre d'onglets) :
[`appmobile/NAVBAR.md`](appmobile/NAVBAR.md).

### Trois principes tenus dans tout le dépôt

| Principe | Comment |
|---|---|
| **Aucune donnée métier en dur** | Libellés, couleurs, tarifs, taux, seuils et plafonds vivent en base (`CategorieConfig`, `TauxConversion`, `NiveauFidelite`, `Parametre`) et sont servis par `GET /api/config`. Les modifier depuis le back-office ne demande **ni redéploiement ni nouvelle version de l'app**. |
| **Bilingue français / anglais** | Les deux applications basculent FR ⇄ EN. Le choix est mémorisé sur l'appareil et sur le compte, et s'applique aussi aux SMS. Les libellés métier sont traduits **en base** (`libelleFr` / `libelleEn`), les textes d'interface dans des dictionnaires typés. |
| **Suppression de compte** | `DELETE /api/compte` efface immédiatement toutes les données personnelles et désactive le compte, en conservant l'historique comptable anonymisé. Export des données possible avant suppression. |

---

## Démarrage rapide

```bash
# 1. API + base de données
cd backend
cp .env.example .env          # renseigner DATABASE_URL et JWT_SECRET
npm install
npx prisma db push            # crée le schéma
npm run seed                  # jeux de données de démonstration
npm run dev                   # http://localhost:4000

# 2. Back-office web
cd ../adminweb
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000

# 3. Application mobile
cd ../appmobile
npm install
npx expo start                # scanner le QR code avec Expo Go
```

> `npm run seed:config` (dans `backend/`) met à jour les seuls référentiels de
> configuration, sans toucher aux données : à lancer après chaque déploiement qui
> ajoute un paramètre.

### Comptes de démonstration

| Rôle | Téléphone | Mot de passe |
|---|---|---|
| Administrateur | `+224621000000` | `cleanguinea2026` |
| Collecteur | `+224623111222` | `cleanguinea2026` |
| Client | `+224622123456` | `cleanguinea2026` |

> ⚠️ Comptes de démonstration uniquement. À supprimer avant toute mise en production.

---

## Dossier business

| # | Document | Contenu |
|---|---|---|
| 01 | [Présentation du projet](docs/01-presentation-projet.md) | Problème, solution, modèle économique, déploiement |
| 02 | [Étude de marché](docs/02-etude-de-marche.md) | Taille du marché, ménages ciblés, concurrents, pénétration visée |
| 03 | [Prévisions financières 5 ans](docs/03-previsions-financieres.md) | Compte de résultat, trésorerie, seuil de rentabilité, ROI |
| 04 | [Budget de démarrage](docs/04-budget-demarrage.md) | Investissements détaillés et plan de financement |
| 05 | [Partenaires clés](docs/05-partenaires-cles.md) | Communes, ministères, opérateurs, recycleurs, bailleurs |
| 06 | [Cadre juridique](docs/06-cadre-juridique.md) | Forme sociale, autorisations, conformité, contrats |
| 07 | [Programme Points Clean](docs/07-programme-points-clean.md) | Barème, anti-fraude, budget |
| 08 | [Architecture technique](docs/08-architecture-technique.md) | Backend, mobile, web, déploiement |
| 09 | [Risques & indicateurs](docs/09-risques-et-kpi.md) | Matrice des risques, KPI opérationnels et d'impact |
| 10 | [Financements & concours](docs/10-financements-et-concours.md) | TEF, Orange Corners, fonds verts, calendrier |
| 11 | [Évaluation du projet](docs/11-evaluation-du-projet.md) | Analyse 9,5/10 et plan d'action à 90 jours |
| 12 | [Trame de pitch deck](docs/12-pitch-deck.md) | 13 slides prêtes à mettre en forme |

**Modèle financier chiffré** : [`finance/`](finance/) — CSV, séparateur `;`, prêts pour Excel.

---

## Chiffres clés du plan d'affaires

| Indicateur | Année 1 | Année 3 | Année 5 |
|---|---:|---:|---:|
| Abonnés ménages (fin d'exercice) | 2 400 | 12 000 | 40 000 |
| Clients PRO (fin d'exercice) | 60 | 300 | 950 |
| Chiffre d'affaires (M GNF) | 675 | 5 550 | 22 672 |
| EBITDA (M GNF) | −258 | +402 | +5 292 |
| Résultat net (M GNF) | −444 | −156 | +2 920 |
| Emplois directs | 20 | 108 | 335 |
| Tonnes collectées / an | 1 485 | 10 533 | 39 463 |
| Tonnes valorisées / an | 119 | 1 685 | 9 471 |

- **Besoin en amorçage** : 1,9 Md GNF (≈ 221 000 USD)
- **Série A (année 2)** : 2,5 Md GNF (≈ 291 000 USD)
- **EBITDA positif** : année 3 · **Résultat net positif** : année 4 · **ROI atteint** : mois 55

> Taux de conversion retenu : **1 USD = 8 600 GNF**. Montants en **millions de GNF (M GNF)**
> sauf mention contraire.

---

## Sécurité — à lire avant toute contribution

- **Aucun secret dans le dépôt.** Les fichiers `.env` sont ignorés par git ; seuls les
  `.env.example` sont publiés, avec des valeurs factices.
- Toute chaîne de connexion, clé d'API ou jeton ayant circulé en clair (message, capture,
  conversation) doit être considérée comme **compromise** et **régénérée**.
- Le back-office est réservé aux rôles `ADMIN` et `SUPERVISEUR`, contrôlés côté serveur.

---

## Avertissement méthodologique

Les données de marché sont des **estimations de travail** construites à partir des
projections démographiques publiques et des ratios usuels du secteur des déchets en Afrique
de l'Ouest. Elles doivent être confirmées par une **enquête terrain** (500 ménages,
3 communes) avant tout dépôt auprès d'un investisseur. Chaque hypothèse est explicitée dans
[`finance/hypotheses.csv`](finance/hypotheses.csv).

De même, les références réglementaires du [document 06](docs/06-cadre-juridique.md) sont une
trame de travail à faire valider par un avocat d'affaires inscrit au barreau de Guinée.
