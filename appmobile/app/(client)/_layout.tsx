import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BarreOnglets } from '../../src/components/BarreOnglets';

const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  accueil: 'home',
  collectes: 'cube',
  historique: 'calendar',
  profil: 'person',
};

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // Barre d'onglets sur mesure : elle lit l'inset bas du telephone pour ne
      // jamais passer sous la barre de navigation systeme (Android edge-to-edge).
      tabBar={(props) => <BarreOnglets {...props} icones={ICONES} />}
    >
      <Tabs.Screen name="accueil" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="collectes" options={{ title: 'Collectes' }} />
      <Tabs.Screen name="historique" options={{ title: 'Historique' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />

      {/* Ecrans accessibles depuis les onglets mais absents de la barre. */}
      <Tabs.Screen name="demande" options={{ href: null }} />
      <Tabs.Screen name="suivi" options={{ href: null }} />
      <Tabs.Screen name="paiements" options={{ href: null }} />
      <Tabs.Screen name="points" options={{ href: null }} />
    </Tabs>
  );
}
