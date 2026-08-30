# Sényi — API

API REST de la plateforme : comptes, abonnements, bacs, missions de collecte, pesées,
Points Clean, paiements, stock du centre de tri et ventes de matières.

**Node.js 20+ · Express 4 · Prisma 6 · PostgreSQL · Zod · JWT**

---

## Démarrage

```bash
cp .env.example .env      # renseigner DATABASE_URL et JWT_SECRET
npm install
npx prisma generate
npx prisma db push        # crée le schéma sur la base
npm run seed              # jeux de données de démonstration
npm run dev               # http://localhost:4000
```

Vérification : `curl http://localhost:4000/health`

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur en rechargement automatique |
| `npm start` | Serveur en production |
| `npm run seed` | **Vide** puis repeuple la base de démonstration |
| `npm run seed:config` | Met à jour **uniquement** les référentiels de configuration, sans toucher aux données |
| `npm run prisma:studio` | Explorateur de base dans le navigateur |
| `npm run prisma:migrate` | Crée une migration versionnée |

> `npm run seed` commence par un `deleteMany` sur toutes les tables. À ne jamais lancer
> sur une base de production.

---

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL. Suffixez `?connection_limit=10&pool_timeout=60&connect_timeout=30` sur une base distante à forte latence |
| `JWT_SECRET` | Signature des jetons — chaîne aléatoire longue |
| `JWT_EXPIRES_IN` | Durée de validité (défaut `30d`) |
| `PORT` | Port d'écoute (défaut `4000`) |
| `CORS_ORIGINS` | Origines autorisées, séparées par des virgules |
| `SMS_*` | Passerelle NimbaSMS — OTP et notifications |
| `ORANGE_MONEY_*`, `MTN_MOMO_*` | Encaissement Mobile Money |

**`.env` n'est jamais commité.** Seul `.env.example` l'est.

---

## Rôles

| Rôle | Accès |
|---|---|
| `CLIENT` | Son compte, ses bacs, ses collectes, ses points, ses paiements |
| `COLLECTEUR` | Sa tournée du jour, scan, pesée, avancement des missions |
| `SUPERVISEUR` | Ses zones, back-office en lecture, validation |
| `ADMIN` | Tout, dont le barème de points et les ventes de matières |

---

## Points d'entrée principaux

### Authentification — `/api/auth`

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/inscription` | Crée le compte, le profil, **3 bacs** et l'abonnement Standard |
| `POST` | `/connexion` | Retourne un JWT |
| `GET` | `/moi` | Profil complet de l'utilisateur connecté |

### Bacs — `/api/bacs`

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/mes-bacs` | Les trois bacs du client avec leur niveau de remplissage |
| `PATCH` | `/:id/niveau` | Le client déclare le remplissage (0 à 3 tiers) |
| `GET` | `/qr/:codeQr` | Résolution d'un QR code scanné par le collecteur |

### Missions — `/api/missions`

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/demande` | « Ma poubelle est pleine » — immédiate ou programmée |
| `GET` | `/mes-collectes` | Historique du client |
| `GET` | `/en-cours` | Mission suivie en temps réel |
| `GET` | `/mes-missions` | Tournée du jour du collecteur + compteurs |
| `PATCH` | `/:id/statut` | `ACCEPTEE → EN_ROUTE → ARRIVE → TERMINEE` |
| `POST` | `/:id/collecte` | Pesée, photo, entrée en stock et crédit des points |
| `POST` | `/:id/evaluation` | Le client note le collecteur |

### Points Clean — `/api/points`

`GET /mon-solde` · `GET /bareme` · `POST /conversion` · `PUT /bareme` (admin)

### Paiements — `/api/paiements`

`GET /mes-paiements` · `POST /` · `POST /webhook/:operateur` · `GET /` (admin)

### Tri et ventes — `/api/tri`

`GET /stock` · `POST /lots` · `GET /lots` · `POST /ventes` · `GET /ventes` · `/acheteurs`

### Tableau de bord — `/api/dashboard`

`/` · `/collectes-par-jour` · `/repartition-dechets` · `/top-zones` ·
`/missions-du-jour` · `/collectes-en-cours` · `/alertes`

### Configuration — `/api/config`

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/?langue=fr\|en` | **Public.** Catégories, couleurs, offres, taux, niveaux, paramètres |
| `GET` | `/admin` | Configuration brute bilingue (admin) |
| `PUT` | `/parametres/:cle` | Modifier un paramètre |
| `PUT` | `/categories/:code` | Libellés et couleurs d'une catégorie |
| `PUT` | `/conversions/:type` | Taux et plafond d'un mode de conversion |
| `PUT` | `/niveaux/:code` | Seuil et bonus d'un niveau de fidélité |
| `PUT` | `/offres/:type` | Tarif et fréquence d'une offre |

### Compte — `/api/compte`

| Méthode | Route | Description |
|---|---|---|
| `PATCH` | `/langue` | Bascule FR / EN, mémorisée sur le compte |
| `PATCH` | `/profil` | Nom, email, adresse, consignes d'accès |
| `POST` | `/mot-de-passe` | Changement de mot de passe |
| `GET` | `/donnees` | **Export** de toutes les données personnelles |
| `DELETE` | `/` | **Suppression du compte** — voir ci-dessous |

---

## Aucune donnée métier codée en dur

Libellés, couleurs, tarifs, taux, seuils et plafonds vivent **en base**, dans quatre
tables : `CategorieConfig`, `TauxConversion`, `NiveauFidelite` et `Parametre`.

`src/lib/config.js` les charge avec un cache de 5 minutes et les expose au reste du
code. Les modifier depuis le back-office ne demande **aucun redéploiement** ni nouvelle
version de l'application mobile.

| Ce qui était en dur | Où c'est désormais |
|---|---|
| Barème de points par matière | Table `BaremePoints` |
| Valeur d'un point, validité | `points.gnfParPoint`, `points.validiteMois` |
| Plafond anti-fraude, déclassement | `fraude.plafondKgMois`, `fraude.facteurDeclassement` |
| Seuil de contamination | `qualite.seuilContaminationPct` |
| Taux de conversion et plafonds | Table `TauxConversion` |
| Niveaux et bonus de fidélité | Table `NiveauFidelite` |
| Libellés et couleurs des catégories | Table `CategorieConfig` (FR + EN) |
| Offre attribuée à l'inscription | `abonnement.offreParDefaut` |
| Ratio de dépenses du tableau de bord | `finance.tauxDepensesEstime` |
| ETA par défaut, durée du créneau | `collecte.etaDefautMinutes`, `collecte.dureeCreneauHeures` |
| Crans de remplissage des bacs | `bac.niveauMaxTiers`, `bac.seuilAlerteTiers` |

> Si les référentiels sont vides, l'API répond **503** avec un message explicite plutôt
> que de retomber sur des valeurs implicites : une base non initialisée doit se voir
> tout de suite, pas en production.

---

## Suppression de compte

`DELETE /api/compte` supprime le compte **par anonymisation**.

**Pourquoi pas un `DELETE` en base** : les paiements et les pesées alimentent la
comptabilité et les rapports remis aux communes et aux bailleurs. Les effacer fausserait
des données déjà publiées et contreviendrait aux obligations de conservation comptable.

**Ce qui est réellement fait :**

- toutes les données personnelles sont écrasées — nom, téléphone, email, adresse,
  coordonnées GPS, photo, consignes d'accès au domicile ;
- le compte est désactivé : plus aucune connexion possible, et les jetons déjà émis
  sont rejetés (`supprimeLe` est vérifié à chaque requête) ;
- l'abonnement est résilié, les bacs sont libérés pour réaffectation ;
- le solde de points est remis à zéro et les mouvements supprimés ;
- missions et paiements restent, rattachés à un client devenu anonyme.

**Garde-fous** — mot de passe exigé, saisie exacte du mot `SUPPRIMER`, refus si un
paiement est en attente ou si une collecte est en cours. Le numéro de téléphone
redevient disponible pour une nouvelle inscription.

`GET /api/compte/donnees` permet d'exporter toutes ses données avant de supprimer.

---

## Deux mécanismes à connaître

### Idempotence des collectes

L'application collecteur travaille souvent **hors réseau**. Chaque collecte porte un
`clientRef` (UUID généré sur le téléphone avant l'envoi). Si la synchronisation est rejouée,
le serveur renvoie la mission déjà enregistrée au lieu d'en créer une seconde.

Voir `src/routes/missions.routes.js`, route `POST /:id/collecte`.

### Moteur Points Clean

`src/lib/points.js` centralise le barème, les bonus de niveau, le plafond mensuel
anti-fraude (25 kg) et le déclassement des lots contaminés à plus de 15 %.

Le crédit des points se fait **hors transaction** de la collecte : un incident sur les
points ne doit jamais annuler une collecte réellement effectuée.

---

## Passerelle SMS

`src/lib/sms.js` implémente NimbaSMS (OTP et notifications de passage).

Contrat **vérifié contre l'API** (`OPTIONS /v1/messages`) :

```
POST https://api.nimbasms.com/v1/messages
Authorization: Basic base64(SERVICE_ID:SECRET_TOKEN)

{ "sender_name": "…",   // obligatoire, SENSIBLE À LA CASSE, ≤ 100 caractères
  "to": ["224622123456"], // obligatoire, 1 à 30 numéros par requête
  "message": "…" }        // ≤ 1071 caractères (7 SMS)
```

Formats de numéro acceptés : `623XXXXXX`, `224623XXXXXX`, `+224623XXXXXX`.

| Fonction | Rôle |
|---|---|
| `envoyerSms(destinataires, message)` | Envoi, **découpé en lots de 30** et tronqué à 1071 caractères |
| `soldeSms()` | Crédit restant — `GET /v1/accounts` |
| `expediteursAutorises()` | Noms d'expéditeur au statut `accepted` |
| `genererOtp()` | Code à 6 chiffres tiré de `randomInt` |

**`SMS_SENDER_ID` doit correspondre exactement** à un nom accepté sur le compte : l'API est
sensible à la casse. Vérifiez avec `expediteursAutorises()`.

> **Surveiller le solde.** Sans crédit, les OTP ne partent plus et **plus personne ne peut
> s'inscrire**. Prévoyez une alerte sous un seuil (200 SMS par exemple) via `soldeSms()`.

Sans clés configurées, les messages sont **affichés dans la console** au lieu d'être envoyés :
le développement fonctionne sans compte SMS.

---

## Déploiement

Compatible Railway, Render ou toute plateforme Node. Sur Railway :

1. Renseigner les variables d'environnement du service.
2. Commande de build : `npm install && npx prisma generate`
3. Commande de démarrage : `npx prisma migrate deploy && npm start`
