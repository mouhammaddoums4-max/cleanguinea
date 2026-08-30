import { StyleSheet, View } from 'react-native';

import { brand } from '../theme';

/**
 * Moulinet Sényi, compose de cinq pales dans les teintes du logo.
 *
 * Dessine avec des Views plutot qu'importe comme image : le depot reste sans
 * binaire, le rendu est net a toutes les tailles, et aucune dependance SVG
 * supplementaire n'est necessaire.
 *
 * Pour utiliser le vrai logo, remplacez ce composant par :
 *   <Image source={require('../../assets/logo.png')} style={{ width: taille, height: taille }} />
 */
const PALES = [
  { couleur: brand.teal, rotation: 0 },
  { couleur: brand.lime, rotation: 72 },
  { couleur: brand.vert, rotation: 144 },
  { couleur: brand.ardoise, rotation: 216 },
  { couleur: brand.tealFonce, rotation: 288 },
];

export function Logo({ taille = 120 }: { taille?: number }) {
  const rayonPale = taille * 0.42;

  return (
    <View
      style={[styles.conteneur, { width: taille, height: taille }]}
      accessibilityRole="image"
      accessibilityLabel="Logo Sényi"
    >
      {PALES.map(({ couleur, rotation }) => (
        <View
          key={rotation}
          style={[
            styles.pale,
            {
              width: rayonPale,
              height: rayonPale,
              backgroundColor: couleur,
              // Chaque pale est un quart de disque, decale puis pivote autour du centre.
              borderTopLeftRadius: rayonPale,
              borderBottomRightRadius: rayonPale * 0.35,
              transform: [
                { rotate: `${rotation}deg` },
                { translateX: -rayonPale * 0.36 },
                { translateY: -rayonPale * 0.36 },
              ],
            },
          ]}
        />
      ))}
      {/* Coeur blanc : c'est lui qui donne la forme de moulinet. */}
      <View
        style={{
          position: 'absolute',
          width: taille * 0.26,
          height: taille * 0.26,
          borderRadius: taille * 0.13,
          backgroundColor: '#FFFFFF',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { alignItems: 'center', justifyContent: 'center' },
  pale: { position: 'absolute' },
});
