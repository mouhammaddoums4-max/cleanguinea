import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type {
  BottomTabBarProps,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';

import { colors, espacement, rayon } from '../theme';
import { useResponsive } from '../responsive';

type NomIcone = keyof typeof Ionicons.glyphMap;

/**
 * Barre d'onglets qui ne passe JAMAIS sous la barre de navigation du telephone.
 *
 * LE PROBLEME
 * Depuis Expo SDK 54, Android impose le mode edge-to-edge : l'application se
 * dessine SOUS la barre systeme (trois boutons ou barre gestuelle). Une barre
 * d'onglets de hauteur fixe se retrouve donc partiellement masquee. La cle
 * `androidNavigationBar` de app.json est ignoree, et le `SafeAreaView` de
 * react-native (et non celui de safe-area-context) ne corrige rien.
 *
 * LA SOLUTION
 * Lire l'inset bas reel renvoye par le systeme et l'ajouter au padding :
 *   - navigation a trois boutons : ~48 px
 *   - navigation gestuelle       : ~16 px
 *   - appareil sans barre / web  : 0
 * Le calcul s'adapte a chaque telephone sans valeur codee en dur.
 *
 * MISE EN FORME
 * L'onglet actif recoit une pastille coloree derriere son icone. C'est plus
 * lisible qu'une simple teinte : la cible se repere du coin de l'oeil, sans
 * avoir a comparer deux nuances de gris.
 *
 * Au-dela de cinq onglets les libelles se chevauchent : on tronque plutot que
 * de laisser le texte deborder.
 *
 * ROUTES MASQUEES
 * `href: null` ne retire pas la route du navigateur : expo-router se contente
 * de poser `tabBarItemStyle: { display: 'none' }` et un `tabBarButton` qui
 * renvoie null. La barre par defaut respecte ces marqueurs — une barre sur
 * mesure doit le faire elle-meme, sinon elle affiche TOUS les ecrans du
 * dossier (treize au lieu de cinq, ici).
 */
const HAUTEUR_CONTENU = 58;
const MIN_PADDING_BAS = 8;
const MAX_ONGLETS_LISIBLES = 5;

type Props = BottomTabBarProps & {
  /** Icone Ionicons par nom de route, ex. { accueil: 'home', profil: 'person' } */
  icones: Record<string, NomIcone>;
};

/** Une route masquee par `href: null` porte `display: 'none'` sur son item. */
function estMasquee(options: BottomTabNavigationOptions) {
  const style = StyleSheet.flatten(options.tabBarItemStyle) as
    | { display?: string }
    | undefined;
  return style?.display === 'none';
}

export function BarreOnglets({ state, descriptors, navigation, icones }: Props) {
  const insets = useSafeAreaInsets();
  const r = useResponsive();

  const paddingBas = Math.max(insets.bottom, MIN_PADDING_BAS);

  // Seuls les onglets reellement affichables.
  const visibles = state.routes.filter((route) => !estMasquee(descriptors[route.key].options));
  const cleActive = state.routes[state.index]?.key;

  // Sur un ecran etroit, l'icone et le libelle retrecissent plutot que de se
  // chevaucher ; sur tablette ils gagnent un peu d'air.
  const tailleIcone = r.taille === 'compact' ? 19 : r.taille === 'tablette' ? 23 : 21;
  const largeurPastille = r.taille === 'compact' ? 40 : 46;

  if (__DEV__ && visibles.length > MAX_ONGLETS_LISIBLES) {
    console.warn(
      `BarreOnglets : ${visibles.length} onglets visibles pour ${MAX_ONGLETS_LISIBLES} lisibles. ` +
        'Masquez les moins utilises avec `href: null` et rendez-les accessibles depuis le profil.',
    );
  }

  return (
    <View
      style={[
        styles.conteneur,
        {
          // La hauteur totale inclut l'inset : le contenu garde ses 58 px utiles,
          // la zone systeme est simplement remplie par le fond de la barre.
          height: HAUTEUR_CONTENU + paddingBas,
          paddingBottom: paddingBas,
          // Encoches laterales en paysage : la barre doit rester atteignable.
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {visibles.map((route) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        // Comparaison par cle : l'index de `state` porte sur TOUTES les routes,
        // masquees comprises, et ne correspond donc pas a celui de `visibles`.
        const actif = route.key === cleActive;
        const icone = icones[route.name] ?? 'ellipse';

        const onPress = () => {
          const evenement = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!actif && !evenement.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.onglet}
            accessibilityRole="button"
            accessibilityState={actif ? { selected: true } : {}}
            accessibilityLabel={label}
            android_ripple={{ color: colors.primaryClair, borderless: true, radius: 44 }}
          >
            <View
              style={[
                styles.pastille,
                { width: largeurPastille },
                actif && styles.pastilleActive,
              ]}
            >
              <Ionicons
                name={actif ? icone : (`${icone}-outline` as NomIcone)}
                size={tailleIcone}
                color={actif ? colors.primary : colors.texteTertiaire}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.libelle,
                { fontSize: r.police(11) },
                actif && styles.libelleActif,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
    paddingTop: 6,
    paddingHorizontal: espacement.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  onglet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  pastille: {
    height: 30,
    borderRadius: rayon.plein,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleActive: { backgroundColor: colors.primaryClair },
  libelle: {
    fontWeight: '500',
    color: colors.texteTertiaire,
    paddingHorizontal: 2,
  },
  libelleActif: { color: colors.primary, fontWeight: '700' },
});
