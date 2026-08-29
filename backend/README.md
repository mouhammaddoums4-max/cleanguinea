# Clean Guinée — API

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
