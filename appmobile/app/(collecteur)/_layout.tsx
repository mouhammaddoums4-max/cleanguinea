import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BarreOnglets } from '../../src/components/BarreOnglets';
import { useI18n } from '../../src/i18n';

const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  'tableau-de-bord': 'stats-chart',
  zones: 'location',
  scanner: 'qr-code',
  historique: 'time',
  profil: 'person',
};

/**
 * Espace collecteur : tableau de bord, zones a collecter, carte, profil.
 * Volontairement different de l'espace client : le collecteur ne voit ni
 * abonnement, ni points, ni bacs individuels.
 */
export default function CollecteurLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // Meme barre que cote client : l'inset bas du telephone est pris en compte,
      // la barre systeme ne recouvre jamais les onglets.
      tabBar={(props) => <BarreOnglets {...props} icones={ICONES} />}
    >
      <Tabs.Screen name="tableau-de-bord" options={{ title: t('onglets.tableauDeBord') }} />
      <Tabs.Screen name="zones" options={{ title: t('onglets.zones') }} />
      <Tabs.Screen name="scanner" options={{ title: t('onglets.scanner') }} />
      <Tabs.Screen name="historique" options={{ title: t('onglets.historique') }} />
      <Tabs.Screen name="profil" options={{ title: t('onglets.profil') }} />

      {/* Ecrans empiles, absents de la barre. */}
      <Tabs.Screen name="zone" options={{ href: null }} />
      <Tabs.Screen name="carte" options={{ href: null }} />
    </Tabs>
  );
}
