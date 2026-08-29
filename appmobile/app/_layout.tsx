import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

import { AuthProvider } from '../src/auth';
import { colors } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.fond);

    // Android est en edge-to-edge obligatoire depuis Expo SDK 54 : l'application se
    // dessine SOUS la barre de navigation du systeme. On ne peut plus la rendre opaque,
    // mais on garde des boutons systeme lisibles sur notre fond clair.
    // Le decalage reel de la barre d'onglets est gere dans app/(tabs)/_layout.tsx.
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('dark').catch(() => {
        // Ignore : indisponible sur certains lanceurs et en mode gestuel.
      });
    }
  }, []);

  return (
    // SafeAreaProvider doit envelopper TOUTE l'application : sans lui,
    // useSafeAreaInsets() renvoie 0 et la barre d'onglets passe sous la barre systeme.
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
