import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colors, rayon } from '../theme';

type NomIcone = keyof typeof Ionicons.glyphMap;

/**
 * Barre d'onglets qui ne passe JAMAIS sous la barre de navigation du telephone.
 *
 * LE PROBLEME
 * Depuis Expo SDK 54, Android impose le mode edge-to-edge : l'application se dessine
 * SOUS la barre systeme (trois boutons ou barre gestuelle). Une barre d'onglets de
 * hauteur fixe se retrouve donc partiellement masquee par la barre du telephone.
 * La cle `androidNavigationBar` de app.json est ignoree dans ce mode, et le
 * `SafeAreaView` de react-native (et non celui de safe-area-context) ne corrige rien.
 *
 * LA SOLUTION
 * Lire l'inset bas reel renvoye par le systeme et l'ajouter au padding de la barre :
 *   - navigation a trois boutons : inset ~48 px
 *   - navigation gestuelle       : inset ~16 px
 *   - appareil sans barre / web  : inset 0
 * Le calcul s'adapte donc a chaque telephone sans valeur codee en dur.
 *
 * MIN_PADDING_BAS garantit une zone tactile confortable quand l'inset est nul.
 */
const HAUTEUR_CONTENU = 56;
const MIN_PADDING_BAS = 8;

type Props = BottomTabBarProps & {
  /** Icone Ionicons par nom de route, ex. { accueil: 'home', profil: 'person' } */
  icones: Record<string, NomIcone>;
};

export function BarreOnglets({ state, descriptors, navigation, icones }: Props) {
  const insets = useSafeAreaInsets();
  const paddingBas = Math.max(insets.bottom, MIN_PADDING_BAS);

  return (
    <View
      style={[
        styles.conteneur,
        {
          // La hauteur totale inclut l'inset : le contenu garde ses 56 px utiles,
          // la zone systeme est simplement remplie par le fond de la barre.
          height: HAUTEUR_CONTENU + paddingBas,
          paddingBottom: paddingBas,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const actif = state.index === index;
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
            android_ripple={{ color: colors.primaryClair, borderless: true, radius: 40 }}
          >
            <Ionicons
              name={actif ? icone : (`${icone}-outline` as NomIcone)}
              size={22}
              color={actif ? colors.primary : colors.texteTertiaire}
            />
            <Text numberOfLines={1} style={[styles.libelle, actif && styles.libelleActif]}>
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
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 8 },
    }),
  },
  onglet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    borderRadius: rayon.md,
  },
  libelle: { fontSize: 11, fontWeight: '500', color: colors.texteTertiaire },
  libelleActif: { color: colors.primary, fontWeight: '700' },
});
