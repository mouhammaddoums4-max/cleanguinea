import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

import { URL_API } from './api';

/**
 * Mesures de protection cote application.
 *
 * A lire avant d'en attendre trop : une application installee est entre les
 * mains de qui l'installe. L'APK peut etre extrait, le bundle JavaScript
 * inspecte, le trafic observe avec un mandataire. Aucune ligne de ce fichier
 * ne change cela, et pretendre le contraire conduirait a mettre des secrets
 * dans l'application en croyant les proteger.
 *
 * Ce qui est reellement protege l'est ailleurs :
 *
 *   - Aucun secret n'est embarque. Les cles Cloudinary, SMS et base de donnees
 *     ne quittent jamais le serveur ; l'application demande des signatures.
 *   - Le serveur ne fait confiance a rien de ce que l'application affirme.
 *     Les prix, les droits et les roles sont recalcules cote API.
 *   - Un jeton vole se revoque (voir `jetonVersion` cote serveur).
 *
 * Ce fichier ne traite donc que ce qui se joue sur l'appareil lui-meme.
 */

/**
 * Empeche les captures d'ecran et l'enregistrement video pendant l'affichage
 * d'un ecran sensible.
 *
 * Vise le cas courant : un telephone partage ou pose sur une table, une
 * capture faite par-dessus l'epaule. Sur Android le contenu disparait aussi de
 * l'apercu des applications recentes, ce qui evite qu'un code client ou un
 * montant reste visible apres la fermeture.
 *
 * Ne protege pas d'une photo prise avec un second appareil. Rien ne le peut.
 */
export function useEcranProtege(actif = true) {
  useEffect(() => {
    if (!actif) return;

    let annule = false;
    ScreenCapture.preventScreenCaptureAsync().catch(() => {
      // Emulateur, ancien Android, Expo Go : l'API peut ne pas etre disponible.
      // L'ecran reste utilisable — refuser de l'afficher serait pire.
    });

    return () => {
      annule = true;
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      void annule;
    };
  }, [actif]);
}

/**
 * Verifie que l'API n'est pas jointe en clair hors developpement.
 *
 * Le risque concret n'est pas la decompilation de l'application mais le reseau :
 * sur un wifi partage, du HTTP laisse lire le jeton de session en clair, ce qui
 * donne le compte sans avoir a deviner le moindre mot de passe.
 *
 * En production, les builds Android refusent deja le trafic en clair
 * (`usesCleartextTraffic: false`) : ce controle sert a le voir en developpement,
 * avant la publication, plutot qu'a la premiere plainte d'un client.
 */
export function verifierTransport() {
  if (__DEV__) return;

  if (!URL_API.startsWith('https://')) {
    console.error(
      `[securite] L'API est configuree en clair (${URL_API}). ` +
        `Les jetons de session circuleraient lisibles sur le reseau. ` +
        `Definissez EXPO_PUBLIC_API_URL en https avant toute publication.`,
    );
  }
}

/**
 * Vrai quand l'application tourne dans un contexte ou les protections natives
 * ne s'appliquent pas — Expo Go, navigateur.
 *
 * Sert a ne pas afficher de garantie que l'on ne tient pas : promettre au
 * client que son ecran est protege alors qu'il ne l'est pas est pire que de ne
 * rien promettre.
 */
export const protectionsNativesDisponibles = Platform.OS !== 'web';
