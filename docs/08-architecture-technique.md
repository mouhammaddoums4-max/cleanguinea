# 08 — Architecture technique

Le dépôt est organisé en trois applications indépendantes qui partagent une seule base
de données PostgreSQL.

```
cleanguinea/
├── backend/     API REST — Node.js · Express · Prisma · PostgreSQL
├── appmobile/   Application abonné et collecteur — Expo SDK 57 · React Native
├── adminweb/    Back-office — Next.js 15 · React 19 · Tailwind
├── docs/        Dossier business
└── finance/     Modèle financier (CSV)
```

---

## 1. Vue d'ensemble

```
   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
   │  appmobile   │        │   adminweb   │        │  USSD / SMS  │
   │  Expo 57     │        │  Next.js 15  │        │  passerelle  │
   │  Abonné +    │        │  Supervision │        │  (hors app)  │
   │  Collecteur  │        │              │        │              │
   └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │  HTTPS / JWT
                          ┌───────▼────────┐
                          │    backend     │
                          │ Express + Zod  │
                          │  Prisma ORM    │
                          └───────┬────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
     ┌───────▼──────┐   ┌─────────▼────────┐  ┌────────▼────────┐
     │  PostgreSQL  │   │ Orange Money API │  │  MTN MoMo API   │
     │   (Railway)  │   │  MTN MoMo API    │  │  SMS / Push     │
     └──────────────┘   └──────────────────┘  └─────────────────┘
```

---

## 2. Backend — `backend/`

| Couche | Choix | Raison |
|---|---|---|
| Runtime | Node.js 20+ | Écosystème connu, déploiement Railway simple |
| Framework HTTP | Express 4 | Léger, suffisant pour une API REST |
| ORM | Prisma 6 | Migrations versionnées, typage fort, excellent avec PostgreSQL |
| Base de données | PostgreSQL (Railway) | Transactions, requêtes géo, agrégats de tonnage |
| Validation | Zod | Une seule source de vérité pour les schémas d'entrée |
| Authentification | JWT + bcrypt | Sans état, adapté au mobile hors ligne |
| Journalisation | Pino | Logs structurés exploitables |

### Modules fonctionnels

| Module | Responsabilité |
|---|---|
| `auth` | Inscription, connexion par téléphone + OTP, rôles |
| `users` | Abonnés, collecteurs, superviseurs, administrateurs |
| `zones` | Communes, quartiers, secteurs de tournée |
| `subscriptions` | Offres, souscription, suspension, résiliation, échéancier |
| `bins` | Parc de bacs, QR codes, affectation, remplacement |
| `collections` | Tournées planifiées, passages, preuves GPS et photo |
| `weighings` | Pesées de recyclables, matières, contrôle qualité |
| `points` | Moteur Points Clean : barème, bonus, plafonds, conversions |
| `payments` | Orange Money, MTN MoMo, espèces, relances, impayés |
| `materials` | Stocks du centre de tri, lots, ventes aux recycleurs |
| `reports` | Tonnages par zone, KPI, export pour les communes |

### Rôles et permissions

| Rôle | Accès |
|---|---|
| `ABONNE` | Son compte, ses passages, ses points, ses paiements |
| `COLLECTEUR` | Sa tournée du jour, scan, pesée, signalement |
| `SUPERVISEUR` | Ses zones, validation des anomalies, réaffectation |
| `ADMIN` | Tout : tarifs, barème de points, ventes de matières, finances |

---

## 3. Application mobile — `appmobile/`

| Couche | Choix |
|---|---|
| SDK | **Expo 57** |
| Navigation | expo-router (routage par fichiers) |
| Zones sûres | react-native-safe-area-context — **voir §5, point critique** |
| État serveur | TanStack Query |
| Stockage local | expo-secure-store (jeton) + AsyncStorage (cache tournée) |
| Scan QR | expo-camera |
| Position | expo-location |
| Notifications | expo-notifications |

### Écrans

**Espace abonné** — Accueil (prochain passage, solde de points), Collectes (historique avec
preuves), Points Clean (solde, barème, conversions), Profil (abonnement, paiements, bacs).

**Espace collecteur** — Tournée du jour, scan du bac, saisie de pesée, signalement d'incident,
synchronisation hors ligne.

### Mode hors ligne

La couverture réseau est irrégulière sur les tournées. L'application collecteur enregistre
les passages localement et les synchronise dès le retour du réseau. Chaque passage porte un
identifiant client (UUID) qui garantit l'**idempotence** côté serveur : un même passage
renvoyé deux fois n'est jamais compté deux fois.

---

## 4. Back-office web — `adminweb/`

| Couche | Choix |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Graphiques | Recharts |
| Tables | TanStack Table |

Écrans : tableau de bord (abonnés, tonnages, recouvrement, EBITDA du mois), abonnés,
tournées et suivi temps réel, centre de tri et stocks, ventes de matières, Points Clean
(barème et anomalies), rapports communes.

---

## 5. Point critique — la barre de navigation Android

**Symptôme** : depuis Expo SDK 54, Android est en **edge-to-edge obligatoire**. L'application
se dessine sous la barre système. La barre d'onglets de l'application se retrouve **cachée
derrière la barre de navigation du téléphone** (les trois boutons ou la barre gestuelle).

**Ce qui ne fonctionne plus** : la clé `androidNavigationBar` dans `app.json` est ignorée en
mode edge-to-edge, et `SafeAreaView` de `react-native` ne gère pas correctement le bas d'écran.

**Solution appliquée dans ce dépôt** :

1. `SafeAreaProvider` enveloppe toute l'application dans `appmobile/app/_layout.tsx`.
2. La barre d'onglets lit `useSafeAreaInsets().bottom` et l'ajoute à sa hauteur et à son
   `paddingBottom` — voir `appmobile/app/(tabs)/_layout.tsx`.
3. Les écrans utilisent `edges={['top']}` uniquement : le bas est déjà géré par la barre
   d'onglets, sinon on ajoute deux fois la marge.
4. `expo-navigation-bar` rend la barre système translucide et adapte la couleur des boutons
   au thème.

Le détail du correctif, avec le code et les pièges, est dans
[`appmobile/NAVBAR.md`](../appmobile/NAVBAR.md).

---

## 6. Base de données

La chaîne de connexion vit **uniquement** dans `backend/.env`, qui est ignoré par git.
Le dépôt ne contient que `backend/.env.example` avec des valeurs factices.

```bash
cd backend
cp .env.example .env      # puis renseigner DATABASE_URL
npm install
npx prisma migrate dev    # crée le schéma
npm run seed              # jeux de données de démonstration
npm run dev
```

> **Sécurité** : toute chaîne de connexion ayant circulé en clair (message, capture,
> conversation) doit être considérée comme compromise. Régénérer le mot de passe dans
> l'interface Railway avant la mise en production.

---

## 7. Déploiement cible

| Composant | Hébergement | Coût mensuel estimé |
|---|---|---:|
| `backend` | Railway | 20 – 50 USD |
| PostgreSQL | Railway | 10 – 30 USD |
| `adminweb` | Vercel | 0 – 20 USD |
| `appmobile` | EAS Build + stores | 30 USD (plan EAS) |
| Stockage photos | S3 compatible | 5 – 20 USD |
| SMS transactionnels | Passerelle locale | Selon volume |

**Total à l'échelle du pilote : 65 à 150 USD par mois**, cohérent avec la ligne
« Technologie » du prévisionnel (45 M GNF en année 1).
