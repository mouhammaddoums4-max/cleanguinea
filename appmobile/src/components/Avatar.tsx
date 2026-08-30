import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

/**
 * Photo de profil ronde.
 *
 * Sans photo, on affiche les initiales sur un fond de couleur dérivé du nom :
 * la même personne garde toujours la même teinte, ce qui aide à la reconnaître
 * d'un coup d'œil dans une liste.
 */
const TEINTES = [
  '#16A34A', '#0FA085', '#2563EB', '#7C3AED',
  '#DC2626', '#F59E0B', '#4B5563', '#0E7490',
];

function teintePour(nom: string) {
  // Somme des codes de caractères : stable, et suffisante pour répartir.
  const somme = [...nom].reduce((s, c) => s + c.charCodeAt(0), 0);
  return TEINTES[somme % TEINTES.length];
}

function initiales(nom: string) {
  return nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((mot) => mot[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Avatar({
  nom = '',
  photoUrl,
  taille = 44,
  bordure = false,
}: {
  nom?: string;
  photoUrl?: string | null;
  taille?: number;
  bordure?: boolean;
}) {
  const style = {
    width: taille,
    height: taille,
    borderRadius: taille / 2,
    ...(bordure ? { borderWidth: 2, borderColor: colors.blanc } : null),
  };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.image, style]}
        accessibilityLabel={nom}
      />
    );
  }

  const lettres = initiales(nom);

  return (
    <View
      style={[styles.cercle, style, { backgroundColor: nom ? teintePour(nom) : colors.bordure }]}
      accessibilityRole="image"
      accessibilityLabel={nom}
    >
      <Text style={[styles.initiales, { fontSize: taille * 0.38 }]}>{lettres || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceAlt },
  cercle: { alignItems: 'center', justifyContent: 'center' },
  initiales: { color: colors.blanc, fontWeight: '700' },
});
