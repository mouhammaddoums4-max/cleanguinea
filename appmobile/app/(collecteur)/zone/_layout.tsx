import { Stack } from 'expo-router';

import { colors } from '../../../src/theme';

/**
 * Pile du detail de zone.
 *
 * Sans ce layout, expo-router rattache `zone/[id]` directement au navigateur a
 * onglets, qui peut alors afficher un onglet « zone » en trop. Avec lui, le
 * dossier devient une seule route enfant, masquee par `href: null` dans
 * app/(collecteur)/_layout.tsx.
 */
export default function ZoneLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.fond } }}
    />
  );
}
