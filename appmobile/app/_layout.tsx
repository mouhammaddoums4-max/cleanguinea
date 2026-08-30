import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

import { AuthProvider } from '../src/auth';
import { I18nProvider } from '../src/i18n';
import { ConfigProvider } from '../src/config';
import { colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.fond);
  }, []);

  return (
    // SafeAreaProvider doit envelopper TOUTE l'application : sans lui,
    // useSafeAreaInsets() renvoie 0 et la barre d'onglets passe sous la barre systeme.
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* I18n avant Config : la configuration est demandee dans la langue choisie. */}
        <I18nProvider>
          <ConfigProvider>
            <AuthProvider>
              {/* translucent + fond transparent : l'application dessine sous la barre. */}
              <StatusBar style="dark" translucent backgroundColor="transparent" />
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
            </AuthProvider>
          </ConfigProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
