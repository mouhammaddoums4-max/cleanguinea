# Clean Guinée — Back-office web

Interface de supervision : activité, collectes en cours, stock du centre de tri, ventes de
matières et résumé financier.

**Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · Recharts · TypeScript**

---

## Démarrage

```bash
cp .env.local.example .env.local
npm install
npm run dev            # http://localhost:3000
```

L'API doit tourner en parallèle (voir [`../backend/`](../backend/)).

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de l'API (défaut `http://localhost:4000`) |

### Compte de démonstration

| Rôle | Téléphone | Mot de passe |
|---|---|---|
| Administrateur | `+224621000000` | `cleanguinea2026` |

L'accès est refusé à tout compte dont le rôle n'est ni `ADMIN` ni `SUPERVISEUR` — contrôle
appliqué **côté serveur** sur chaque route, la vérification côté client n'étant qu'un confort.

---

## Tableau de bord

Le tableau de bord reprend la maquette bloc par bloc :

| Bloc | Source |
|---|---|
| 5 cartes (clients, abonnements, collectes, déchets, CA) | `GET /api/dashboard` |
| Courbe « Collectes sur la période » | `GET /api/dashboard/collectes-par-jour` |
| Anneau « Répartition des déchets » | `GET /api/dashboard/repartition-dechets` |
| « Top 5 des zones » | `GET /api/dashboard/top-zones` |
| Table « Collectes en cours » | `GET /api/dashboard/collectes-en-cours` |
| « Stock par catégorie » | `GET /api/tri/stock` |
| « Alertes & notifications » | `GET /api/dashboard/alertes` |
| « Résumé financier » | `GET /api/dashboard` |
| « Missions aujourd'hui » | `GET /api/dashboard/missions-du-jour` |

Chaque carte affiche son **évolution par rapport à la période précédente**, calculée côté
serveur sur une fenêtre de même durée.

---

## Organisation

```
app/
├── layout.tsx              Racine, polices, styles globaux
├── page.tsx                Redirige vers /tableau-de-bord
├── connexion/              Authentification du back-office
└── (back-office)/
    ├── layout.tsx          Enveloppe protégée (navigation + garde de session)
    ├── tableau-de-bord/    Écran complet
    └── clients · abonnements · collectes · collecteurs · dechets
        stock · ventes · finance · rapports · parametres

src/
├── lib/api.ts              Client HTTP, jeton, formatage GNF, types, couleurs
└── components/Coquille.tsx En-tête, navigation, garde d'accès, déconnexion
```

---

## État des modules

**Terminé** — Connexion, garde d'accès par rôle, navigation, tableau de bord complet.

**À construire** — Les dix autres entrées de navigation sont des pages d'attente. Chacune
indique l'endpoint déjà disponible côté API : pour la plupart, seule l'interface reste à
écrire. Les modules `Abonnements`, `Collecteurs` et `Rapports` demandent en plus l'ajout
de routes dans [`../backend/src/routes/`](../backend/src/routes/).

Ordre d'implémentation conseillé : **Collectes** → **Clients** → **Stock & Tri** →
**Ventes** → **Finance**, en suivant la valeur opérationnelle décroissante.

---

## Notes d'interface

- Le vert d'interface (`primaire`) vient des maquettes ; la palette `marque` reprend les
  teintes du logo (turquoise, lime, vert, ardoise) — voir `tailwind.config.ts`.
- Les couleurs des catégories de déchets sont définies une seule fois dans
  `src/lib/api.ts` (`CATEGORIES`) et partagées entre graphiques, tables et pastilles, pour
  qu'un plastique soit toujours de la même couleur d'un écran à l'autre.
- Les tableaux larges défilent dans leur propre conteneur (`.table-scroll`) : la page ne
  défile jamais horizontalement.

---

## Déploiement

Cible naturelle : **Vercel**. Définir `NEXT_PUBLIC_API_URL` sur l'URL publique de l'API et
ajouter cette origine à `CORS_ORIGINS` côté backend.
