import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { api } from './api';
import { useAuth } from './auth';

/**
 * Notifications système.
 *
 * L'enregistrement du jeton se fait APRÈS la connexion : un jeton sans compte
 * ne sert à rien, et le serveur doit savoir à qui l'associer.
 *
 * Le jeton est aussi désactivé à la déconnexion. Sans cela, un téléphone
 * partagé — cas courant chez les collecteurs — continuerait de recevoir les
 * notifications du compte précédent.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Canal Android : sans lui, les notifications arrivent sans son ni priorité. */
async function preparerCanalAndroid() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Clean Guinée',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16A34A',
  });
}

async function obtenirJeton(): Promise<string | null> {
  // Un émulateur ne reçoit pas de push : inutile d'insister.
  if (!Device.isDevice) return null;

  const { status: existant } = await Notifications.getPermissionsAsync();
  let statut = existant;

  if (statut !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    statut = status;
  }
  if (statut !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return data;
  } catch {
    // Sans projectId EAS, le jeton ne peut pas être délivré. Ce n'est pas
    // bloquant : l'utilisateur voit ses notifications dans l'application.
    return null;
  }
}

/**
 * Branche les notifications sur la session.
 * À appeler une fois, dans le layout racine.
 */
export function useNotifications() {
  const { utilisateur } = useAuth();
  const router = useRouter();
  const jetonEnregistre = useRef<string | null>(null);

  // Enregistrement du jeton à la connexion.
  useEffect(() => {
    if (!utilisateur) return;

    (async () => {
      await preparerCanalAndroid();
      const jeton = await obtenirJeton();
      if (!jeton || jeton === jetonEnregistre.current) return;

      try {
        await api('/api/notifications/appareil', {
          method: 'POST',
          body: {
            jeton,
            plateforme: Platform.OS === 'ios' ? 'ios' : 'android',
            modele: Device.modelName ?? undefined,
          },
        });
        jetonEnregistre.current = jeton;
      } catch {
        // Enregistrement raté : les notifications restent consultables dans
        // l'application, seul le push manque.
      }
    })();
  }, [utilisateur]);

  // Ouverture de l'écran visé quand l'utilisateur touche une notification.
  useEffect(() => {
    const abonnement = Notifications.addNotificationResponseReceivedListener((reponse) => {
      const lien = reponse.notification.request.content.data?.lien;
      if (typeof lien === 'string' && lien.startsWith('/')) {
        router.push(lien as never);
      }
    });

    return () => abonnement.remove();
  }, [router]);
}

/** Désactive le jeton de cet appareil. À appeler avant de vider la session. */
export async function oublierAppareil() {
  try {
    const jeton = (await Notifications.getExpoPushTokenAsync().catch(() => null))?.data;
    if (!jeton) return;
    await api('/api/notifications/appareil', { method: 'DELETE', body: { jeton } });
  } catch {
    // Sans conséquence : le serveur désactivera le jeton au premier échec d'envoi.
  }
}
