import { Stack } from 'expo-router';

import { colors } from '../../../src/theme';

/**
 * Pile de la messagerie.
 *
 * Comme pour le detail de zone cote collecteur : sans ce layout, expo-router
 * rattacherait chaque ecran du dossier au navigateur a onglets, qui afficherait
 * un onglet « support » en trop. Ici le dossier devient une seule route,
 * masquee par `href: null` dans app/(client)/_layout.tsx.
 */
export default function SupportLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fond } }}
    />
  );
}
