import { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, espacement, rayon } from '../theme';
import type { Position } from '../geo';

/**
 * Carte des zones et des foyers.
 *
 * `react-native-maps` n'est pas embarqué dans Expo Go : il exige un build de
 * développement (`npx expo prebuild` puis `expo run:android`) et une clé Google
 * Maps sur Android. On le charge donc **dynamiquement** : si le module est
 * absent, le composant affiche un repli lisible au lieu de faire planter l'écran.
 *
 * Pour activer la vraie carte :
 *   1. npx expo install react-native-maps
 *   2. app.json → android.config.googleMaps.apiKey = "VOTRE_CLE"
 *   3. npx expo prebuild && npx expo run:android
 *
 * Voir appmobile/CARTE.md.
 */

export type Marqueur = {
  id: string;
  position: Position;
  titre: string;
  sousTitre?: string;
  couleur?: string;
  /** Un foyer déjà servi ou une zone terminée s'affiche en teinte atténuée. */
  attenue?: boolean;
};

type Props = {
  marqueurs: Marqueur[];
  /** Position du collecteur, affichée séparément. */
  moi?: Position | null;
  hauteur?: number;
  messageReplis?: string;
};

// Chargement optionnel : `require` échoue silencieusement si le module n'est pas installé.
function chargerMaps() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-maps');
  } catch {
    return null;
  }
}

const Maps = chargerMaps();

/** Cadre englobant tous les points, avec une marge pour ne pas coller aux bords. */
function region(points: Position[]) {
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);

  const latitude = (Math.min(...lats) + Math.max(...lats)) / 2;
  const longitude = (Math.min(...lons) + Math.max(...lons)) / 2;

  // Plancher de 0,01° (~1 km) : sinon un point unique donne un zoom absurde.
  return {
    latitude,
    longitude,
    latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 1.6, 0.01),
    longitudeDelta: Math.max((Math.max(...lons) - Math.min(...lons)) * 1.6, 0.01),
  };
}

export function CarteZones({ marqueurs, moi, hauteur = 260, messageReplis }: Props) {
  const points = useMemo(
    () => [...marqueurs.map((m) => m.position), ...(moi ? [moi] : [])],
    [marqueurs, moi],
  );

  if (points.length === 0) {
    return (
      <View style={[styles.repli, { height: hauteur }]}>
        <Text style={styles.repliTitre}>Aucun point à afficher</Text>
      </View>
    );
  }

  // Carte native indisponible (Expo Go, web, module non installé) : repli lisible.
  if (!Maps?.default || Platform.OS === 'web') {
    return (
      <View style={[styles.repli, { height: hauteur }]}>
        <Text style={styles.repliTitre}>
          {messageReplis ?? 'Carte indisponible dans Expo Go'}
        </Text>
        <Text style={styles.repliTexte}>
          {marqueurs.length} point{marqueurs.length > 1 ? 's' : ''} ·{' '}
          {points[0].latitude.toFixed(4)}, {points[0].longitude.toFixed(4)}
        </Text>
        <Text style={styles.repliAide}>
          Build de développement requis — voir CARTE.md
        </Text>
      </View>
    );
  }

  const MapView = Maps.default;
  const { Marker } = Maps;

  return (
    <View style={[styles.conteneur, { height: hauteur }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region(points)}
        showsUserLocation={!!moi}
        showsMyLocationButton
        toolbarEnabled={false}
      >
        {marqueurs.map((m) => (
          <Marker
            key={m.id}
            coordinate={m.position}
            title={m.titre}
            description={m.sousTitre}
            pinColor={m.attenue ? colors.texteTertiaire : (m.couleur ?? colors.primary)}
            opacity={m.attenue ? 0.6 : 1}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    borderRadius: rayon.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordure,
  },
  repli: {
    borderRadius: rayon.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: espacement.lg,
  },
  repliTitre: { fontSize: 14, fontWeight: '600', color: colors.texte },
  repliTexte: { fontSize: 12, color: colors.texteSecondaire },
  repliAide: { fontSize: 11, color: colors.texteTertiaire, marginTop: espacement.sm },
});
