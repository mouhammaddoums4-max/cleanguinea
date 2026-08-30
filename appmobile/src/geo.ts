import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Géolocalisation : relevé de position et ouverture d'un itinéraire.
 *
 * L'itinéraire délègue à l'application de cartes du téléphone (Google Maps,
 * Waze, Plans) plutôt que d'embarquer un moteur de navigation : c'est gratuit,
 * ça ne demande aucune clé d'API, et le collecteur retrouve l'outil qu'il
 * utilise déjà tous les jours.
 */

export type Position = { latitude: number; longitude: number };

/**
 * Demande la permission et relève la position.
 * Renvoie null si l'utilisateur refuse ou si le GPS est indisponible — l'appelant
 * doit toujours pouvoir continuer sans position.
 */
export async function relevePosition(): Promise<Position | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    return null;
  }
}

/** true si la permission est déjà accordée, sans rien demander à l'utilisateur. */
export async function positionAutorisee(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/** Ouvre l'itinéraire vers un point dans l'application de cartes du téléphone. */
export async function ouvrirItineraire(
  { latitude, longitude }: Position,
  libelle?: string,
) {
  // Schéma de navigation natif d'abord, lien web universel en repli.
  const natif = Platform.select({
    ios: `maps://?daddr=${latitude},${longitude}&dirflg=d`,
    android: `google.navigation:q=${latitude},${longitude}`,
    default: '',
  });

  const web =
    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}` +
    `&travelmode=driving`;

  try {
    if (natif && (await Linking.canOpenURL(natif))) {
      await Linking.openURL(natif);
      return;
    }
    await Linking.openURL(web);
  } catch {
    Alert.alert(
      libelle ?? 'Itinéraire',
      `Coordonnées : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    );
  }
}

/**
 * Distance à vol d'oiseau entre deux points, en mètres (formule de haversine).
 * Suffisant pour trier des foyers d'un même quartier ; ce n'est pas une distance routière.
 */
export function distanceM(a: Position, b: Position): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;

  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;

  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** "480 m" ou "2,4 km" */
export function formaterDistance(metres: number): string {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`;
}
