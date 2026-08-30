import { StyleSheet, Text, View } from 'react-native';

import { Logo } from './Logo';
import { useConfig } from '../config';
import { colors, espacement } from '../theme';

/**
 * Bloc de marque : logo, nom, slogan.
 *
 * Partagé par les écrans d'authentification pour que le logo apparaisse
 * partout de la même façon, sans le dupliquer d'un fichier à l'autre.
 */
export function MarqueEnTete({
  taille = 72,
  avecSlogan = true,
}: {
  taille?: number;
  avecSlogan?: boolean;
}) {
  const { slogan } = useConfig();

  return (
    <View style={styles.bloc}>
      <Logo taille={taille} />
      <Text style={styles.nom}>SÉNYI</Text>
      {avecSlogan && <Text style={styles.slogan}>{slogan} ♻</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { alignItems: 'center', gap: 2, paddingVertical: espacement.md },
  nom: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 3,
    marginTop: espacement.md,
  },
  slogan: { fontSize: 12, color: colors.texteSecondaire, marginTop: 6 },
});
