
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

import { AuthProvider } from '../src/auth';
import { I18nProvider } from '../src/i18n';
import { ConfigProvider } from '../src/config';
import { HorsLigneProvider } from '../src/hors-ligne';
import { useNotifications } from '../src/notifications';
import { colors } from '../src/theme';
import { verifierTransport } from '../src/securite';

// Fond de la vue racine. Appele au chargement du module, hors composant, comme
// le demande la documentation : dans un useEffect, la fenetre reste noire le
// temps du premier rendu, d'ou la bande sombre en haut de l'ecran.
SystemUI.setBackgroundColorAsync(colors.fond);

// Controle au chargement : une API en clair laisserait lire les jetons de
// session sur n'importe quel wifi partage.
verifierTransport();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  return (
    // SafeAreaProvider doit envelopper TOUTE l'application : sans lui,
    // useSafeAreaInsets() renvoie 0 et la barre d'onglets passe sous la barre systeme.
    // initialMetrics : sans elles, le premier rendu se fait avec des insets a
    // zero puis saute une fois mesure. Le contenu se decale visiblement.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/*
        Vue racine opaque et pleine hauteur. Sans elle, le fond de la fenetre
        (noir par defaut) apparait derriere la barre de statut.
      */}
      <View style={styles.racine}>
        <QueryClientProvider client={queryClient}>
          {/* I18n avant Config : la configuration est demandee dans la langue choisie. */}
          <I18nProvider>
            <ConfigProvider>
              <AuthProvider>
                <HorsLigneProvider>
                <Session />
                {/*
                  SDK 57 : StatusBar n'accepte plus que `style`. `translucent` et
                  `backgroundColor` ont disparu — l'edge-to-edge etant impose, la
                  barre est deja transparente et l'application dessine dessous.
                */}
                <StatusBar style="dark" />
                {/*
                  Android est en edge-to-edge obligatoire depuis le SDK 54 : l'application
                  se dessine SOUS la barre systeme, qu'on ne peut plus rendre opaque. On
                  garde au moins des icones sombres, lisibles sur notre fond clair.
                  Le decalage reel de la barre d'onglets est gere par BarreOnglets.
                  (`setButtonStyleAsync` a disparu en SDK 57 au profit de ce composant.)
                */}
                {Platform.OS === 'android' && <NavigationBar style="light" />}
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.fond },
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(client)" />
                  <Stack.Screen name="(collecteur)" />
                </Stack>
                </HorsLigneProvider>
              </AuthProvider>
            </ConfigProvider>
          </I18nProvider>
        </QueryClientProvider>
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Branche les notifications systeme.
 *
 * Composant separe parce que `useNotifications` lit la session : il doit donc
 * s'executer SOUS AuthProvider, ce que RootLayout ne peut pas faire lui-meme.
 */
function Session() {
  useNotifications();
  return null;
}

const styles = StyleSheet.create({
  racine: { flex: 1, backgroundColor: colors.fond },
});
