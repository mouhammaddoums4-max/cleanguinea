import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BarreOnglets } from '../../src/components/BarreOnglets';
import { useI18n } from '../../src/i18n';

const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  missions: 'list',
  carte: 'map',
  historique: 'time',
  profil: 'person',
};

export default function CollecteurLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // Meme barre que cote client : l'inset bas du telephone est pris en compte,
      // la barre systeme ne recouvre jamais les onglets.
      tabBar={(props) => <BarreOnglets {...props} icones={ICONES} />}
    >
      <Tabs.Screen name="missions" options={{ title: t('onglets.missions') }} />
      <Tabs.Screen name="carte" options={{ title: t('onglets.carte') }} />
      <Tabs.Screen name="historique" options={{ title: t('onglets.historique') }} />
      <Tabs.Screen name="profil" options={{ title: t('onglets.profil') }} />

      <Tabs.Screen name="mission/[id]" options={{ href: null }} />
    </Tabs>
  );
}
