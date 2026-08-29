# Clean Guinée — Application mobile

Application unique portant **deux espaces** : le client (foyer ou professionnel) et le
collecteur. L'espace affiché dépend du rôle du compte connecté.

**Expo SDK 57 · React Native 0.81 · expo-router · TanStack Query · TypeScript**

---

## Démarrage

```bash
npm install
npx expo start        # scanner le QR code avec Expo Go
```

L'API doit tourner en parallèle (voir [`../backend/`](../backend/)).

### Adresse de l'API

`src/api.ts` la résout automatiquement :

1. `EXPO_PUBLIC_API_URL` si elle est définie ;
2. sinon, l'IP de la machine qui fait tourner Metro, port 4000 — car sur un téléphone
   physique, `localhost` désigne le téléphone et non le PC ;
3. sinon, la valeur de `extra.apiUrl` dans `app.json`.

Pour forcer une adresse :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start
```

### Comptes de démonstration

| Espace | Téléphone | Mot de passe |
|---|---|---|
| Client | `+224622123456` | `cleanguinea2026` |
| Collecteur | `+224623111222` | `cleanguinea2026` |

---

## Écrans

### Espace client

| Route | Écran |
|---|---|
| `(auth)/bienvenue` | Logo, connexion / inscription, bascule FR-EN |
| `(auth)/inscription` | Nom, téléphone, adresse, commune, quartier, CGU |
| `(client)/accueil` | Prochain passage, solde de points, mes 3 bacs, « Ma poubelle est pleine » |
| `(client)/demande` | Choix des bacs, demande immédiate ou programmée |
| `(client)/suivi` | Suivi temps réel : Acceptée → En route → Arrivé → Terminée, ETA |
| `(client)/collectes` | Déclaration du niveau de remplissage de chaque bac |
| `(client)/historique` | Collectes passées avec poids et statut |
| `(client)/paiements` | Abonnement, prochain prélèvement, historique |
| `(client)/points` | Solde, niveau, barème par matière, mouvements |
| `(client)/profil` | Informations, abonnement, bacs, aide, déconnexion |

### Espace collecteur

| Route | Écran |
|---|---|
| `(collecteur)/missions` | Compteurs du jour, prochaine mission, liste filtrable |
| `(collecteur)/mission/[id]` | Détail, notes client, avancement, pesée, confirmation |
| `(collecteur)/carte` | Tournée du jour regroupée par commune |
| `(collecteur)/historique` | Collectes réalisées et tonnage du jour |
| `(collecteur)/profil` | Matricule, véhicule, note moyenne |

---

## Barre de navigation Android

Le correctif du problème « la barre du téléphone cache la barre de l'application » est
documenté en détail dans **[NAVBAR.md](NAVBAR.md)**. En résumé :

- `SafeAreaProvider` enveloppe toute l'application ([`app/_layout.tsx`](app/_layout.tsx)) ;
- la barre d'onglets ajoute `useSafeAreaInsets().bottom` à sa hauteur
  ([`src/components/BarreOnglets.tsx`](src/components/BarreOnglets.tsx)) ;
- les écrans à onglets utilisent `<Ecran>` (haut seulement), les écrans empilés
  `<Ecran bas>` — **jamais les deux**, sinon la marge est comptée deux fois.

---

## Organisation

```
app/
├── _layout.tsx           SafeAreaProvider · React Query · Auth · barre système
├── index.tsx             Redirection selon le rôle
├── (auth)/               Bienvenue · Connexion · Inscription
├── (client)/             4 onglets + 4 écrans empilés
└── (collecteur)/         4 onglets + détail de mission

src/
├── api.ts                Client HTTP, stockage du jeton, types partagés
├── auth.tsx              Contexte de session
├── theme.ts              Couleurs, espacements, formatage GNF
└── components/
    ├── BarreOnglets.tsx  Barre d'onglets sûre pour Android
    ├── Logo.tsx          Moulinet de marque, dessiné sans image
    └── ui.tsx            Ecran · EnTete · Carte · Bouton · Champ · PastilleBac
```

---

## Points d'attention

**Mode hors ligne** — Chaque collecte envoie un `clientRef` (UUID). Si le réseau coupe et
que l'envoi est rejoué, le serveur ne compte pas la collecte deux fois.

**Icône et écran de démarrage** — `app.json` ne référence volontairement aucun asset binaire
pour garder le dépôt sans image. Avant publication, ajoutez `assets/icon.png` (1024×1024),
`assets/adaptive-icon.png` et `assets/splash.png`, puis rétablissez les clés `icon`,
`splash` et `android.adaptiveIcon`.

**Carte interactive** — L'écran de tournée liste les arrêts par commune. Le passage à
`react-native-maps` demande une clé Google Maps et un build natif (`expo prebuild`).

**Cache** — En cas de comportement inattendu après modification : `npx expo start -c`.
