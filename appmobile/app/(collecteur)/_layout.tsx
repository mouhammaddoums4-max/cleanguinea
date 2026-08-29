import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BarreOnglets } from '../../src/components/BarreOnglets';

const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  missions: 'list',
  carte: 'map',
  historique: 'time',
  profil: 'person',
};

export default function CollecteurLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // Meme barre que cote client : l'inset bas du telephone est pris en compte,
      // la barre systeme ne recouvre jamais les onglets.
      tabBar={(props) => <BarreOnglets {...props} icones={ICONES} />}
    >
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="carte" options={{ title: 'Carte' }} />
      <Tabs.Screen name="historique" options={{ title: 'Historique' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />

      <Tabs.Screen name="mission/[id]" options={{ href: null }} />
    </Tabs>
  );
}
