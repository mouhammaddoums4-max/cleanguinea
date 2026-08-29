# Barre de navigation Android — le correctif appliqué

> **Le problème** : sur Android, la barre du téléphone (les trois boutons ou la barre
> gestuelle) recouvrait la barre d'onglets de l'application.

---

## 1. Pourquoi cela arrive

Depuis **Expo SDK 54**, le mode **edge-to-edge** est imposé sur Android et ne peut plus
être désactivé. L'application se dessine désormais **sous** les barres système : la barre
de statut en haut, la barre de navigation en bas.

Conséquence : une barre d'onglets de hauteur fixe (56 px par exemple) est dessinée tout en
bas de l'écran, donc **partiellement cachée** par la barre du téléphone. Les libellés
disparaissent, et les zones tactiles tombent sous les boutons du système.

### Ce qui ne fonctionne pas / plus

| Tentative | Pourquoi ça échoue |
|---|---|
| `androidNavigationBar` dans `app.json` | **Ignoré** en mode edge-to-edge |
| `edgeToEdgeEnabled: false` | N'est plus honoré à partir du SDK 54 |
| `SafeAreaView` de `react-native` | Ne gère que iOS ; ne renvoie rien en bas sur Android |
| `paddingBottom: 48` en dur | Faux sur les téléphones en navigation gestuelle (~16 px) et sur ceux sans barre (0) |
| `NavigationBar.setBackgroundColorAsync()` | Sans effet en edge-to-edge |

---

## 2. La solution retenue

Lire l'**inset bas réel** que le système annonce, et l'ajouter à la barre d'onglets.

| Configuration du téléphone | `insets.bottom` |
|---|---:|
| Navigation à trois boutons | ≈ 48 px |
| Navigation gestuelle | ≈ 16 px |
| Aucune barre système / web | 0 px |

Le calcul s'adapte donc tout seul, sans valeur codée en dur.

### Étape 1 — `SafeAreaProvider` autour de toute l'application

[`app/_layout.tsx`](app/_layout.tsx)

```tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* ... reste de l'application ... */}
    </SafeAreaProvider>
  );
}
```

**Sans ce provider, `useSafeAreaInsets()` renvoie 0 partout** et le correctif ne peut pas
fonctionner. C'est l'oubli le plus fréquent.

### Étape 2 — La barre d'onglets absorbe l'inset

[`src/components/BarreOnglets.tsx`](src/components/BarreOnglets.tsx)

```tsx
const HAUTEUR_CONTENU = 56;
const MIN_PADDING_BAS = 8;

export function BarreOnglets({ state, descriptors, navigation, icones }: Props) {
  const insets = useSafeAreaInsets();
  const paddingBas = Math.max(insets.bottom, MIN_PADDING_BAS);

  return (
    <View
      style={[
        styles.conteneur,
        {
          // La hauteur totale inclut l'inset : le contenu garde ses 56 px utiles,
          // la zone système est remplie par le fond de la barre.
          height: HAUTEUR_CONTENU + paddingBas,
          paddingBottom: paddingBas,
        },
      ]}
    >
      {/* ... onglets ... */}
    </View>
  );
}
```

`MIN_PADDING_BAS` garantit une zone tactile confortable quand l'inset vaut 0.

### Étape 3 — Brancher la barre sur `Tabs`

[`app/(client)/_layout.tsx`](app/(client)/_layout.tsx)

```tsx
<Tabs
  screenOptions={{ headerShown: false }}
  tabBar={(props) => <BarreOnglets {...props} icones={ICONES} />}
>
```

### Étape 4 — Ne pas compter l'inset deux fois

C'est **le piège qui suit immédiatement le premier correctif**. Si un écran à onglets
utilise aussi `SafeAreaView edges={['bottom']}`, la marge est appliquée deux fois : un vide
apparaît entre le contenu et la barre.

[`src/components/ui.tsx`](src/components/ui.tsx) rend la règle explicite :

```tsx
export function Ecran({ children, bas = false, style }) {
  // bas: false -> écran à onglets  : la BarreOnglets gère déjà l'inset
  // bas: true  -> écran empilé      : c'est ici qu'il faut le gérer
  const edges: Edge[] = bas ? ['top', 'bottom'] : ['top'];
  return <SafeAreaView edges={edges} style={[styles.ecran, style]}>{children}</SafeAreaView>;
}
```

| Type d'écran | À utiliser |
|---|---|
| Écran d'un onglet (Accueil, Collectes, Profil...) | `<Ecran>` |
| Écran empilé sans barre d'onglets (Connexion, Suivi, Détail mission...) | `<Ecran bas>` |

### Étape 5 — Lisibilité des boutons système

[`app/_layout.tsx`](app/_layout.tsx)

```tsx
if (Platform.OS === 'android') {
  NavigationBar.setButtonStyleAsync('dark').catch(() => {
    // Indisponible sur certains lanceurs et en mode gestuel : sans conséquence.
  });
}
```

En edge-to-edge on ne peut plus colorer le fond de la barre système, mais on peut forcer
des icônes sombres, lisibles sur notre fond clair.

---

## 3. Configuration `app.json`

```json
"android": {
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false
}
```

`edgeToEdgeEnabled: true` est déclaré explicitement : c'est le comportement réel, autant
que le fichier le dise. La clé `androidNavigationBar` est **volontairement absente** — elle
serait ignorée.

---

## 4. Vérifier que c'est corrigé

Sur un appareil ou un émulateur Android :

1. **Navigation à trois boutons** (Paramètres › Système › Navigation) — les libellés des
   onglets doivent rester entièrement visibles au-dessus des trois boutons.
2. **Navigation gestuelle** — la barre d'onglets doit remonter juste au-dessus du trait
   de navigation, sans vide excessif.
3. **Basculer de l'une à l'autre pendant que l'application tourne** — la barre doit se
   réajuster immédiatement, sans redémarrage.
4. **Écran empilé** (Connexion, Détail mission) — le bouton du bas ne doit pas être
   recouvert.
5. **Faire défiler une liste jusqu'en bas** — le dernier élément doit être atteignable.

---

## 5. Si le problème réapparaît

| Symptôme | Cause la plus probable |
|---|---|
| La barre repasse sous les boutons système | `SafeAreaProvider` retiré ou placé trop bas dans l'arbre |
| Un vide gris sous la barre d'onglets | Un écran à onglets utilise `<Ecran bas>` — l'inset est compté deux fois |
| Correct en développement, cassé en build | `react-native-safe-area-context` absent des dépendances natives : refaire un `expo prebuild` |
| Le contenu passe sous la barre de statut | L'écran n'utilise pas `<Ecran>` (qui applique `edges: ['top']`) |
| Rien ne bouge après modification | Vider le cache : `npx expo start -c` |
