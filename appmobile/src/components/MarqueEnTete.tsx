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
      <Text style={styles.nom}>CLEAN</Text>
      <Text style={styles.nomSecond}>GUINÉE</Text>
      {avecSlogan && <Text style={styles.slogan}>{slogan} ♻</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { alignItems: 'center', gap: 2, paddingVertical: espacement.md },
  nom: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    marginTop: espacement.md,
  },
  nomSecond: { fontSize: 14, fontWeight: '700', color: colors.primary, letterSpacing: 4 },
  slogan: { fontSize: 12, color: colors.texteSecondaire, marginTop: 6 },
});
