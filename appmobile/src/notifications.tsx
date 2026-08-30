import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';

import { api } from './api';
import { useAuth } from './auth';

/**
 * Notifications système.
 *
 * EXPO GO. Depuis le SDK 53, expo-notifications n'a plus de push sur Android
 * dans Expo Go, et le module leve une erreur DES SON CHARGEMENT : un import en
 * tete de fichier suffisait a empecher toute l'application de demarrer, sans
 * meme afficher l'ecran de connexion. Le module est donc charge a la demande,
 * et seulement hors d'Expo Go. Dans Expo Go tout devient inerte : on perd les
 * push, rien d'autre — les notifications restent consultables dans l'ecran
 * dedie, qui les lit depuis l'API.
 *
 * L'enregistrement du jeton se fait APRÈS la connexion : un jeton sans compte
 * ne sert à rien, et le serveur doit savoir à qui l'associer.
 *
 * Le jeton est aussi désactivé à la déconnexion. Sans cela, un téléphone
 * partagé — cas courant chez les collecteurs — continuerait de recevoir les
 * notifications du compte précédent.
 */

type ModuleNotifications = typeof import('expo-notifications');

const DANS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// `undefined` = pas encore tente ; `null` = indisponible ici.
let module: ModuleNotifications | null | undefined;

/** Charge expo-notifications, ou renvoie null la ou il ne peut pas vivre. */
function notifications(): ModuleNotifications | null {
  if (module !== undefined) return module;

  if (DANS_EXPO_GO) {
    if (__DEV__) {
      console.warn(
        'Notifications push desactivees : Expo Go ne les supporte plus depuis le SDK 53. ' +
          'Elles fonctionneront dans un build de developpement.',
      );
    }
    module = null;
    return module;
  }

  try {
    // require et non import : l'evaluation du module doit rester conditionnelle.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    module = require('expo-notifications') as ModuleNotifications;
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    module = null;
  }

  return module;
}

/** Canal Android : sans lui, les notifications arrivent sans son ni priorité. */
async function preparerCanalAndroid(N: ModuleNotifications) {
  if (Platform.OS !== 'android') return;

  await N.setNotificationChannelAsync('default', {
    name: 'Sényi',
    importance: N.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16A34A',
  });
}

async function obtenirJeton(N: ModuleNotifications): Promise<string | null> {
  // Un émulateur ne reçoit pas de push : inutile d'insister.
  if (!Device.isDevice) return null;

  const { status: existant } = await N.getPermissionsAsync();
  let statut = existant;

  if (statut !== 'granted') {
    const { status } = await N.requestPermissionsAsync();
    statut = status;
  }
  if (statut !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  try {
    const { data } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
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
    const N = notifications();
    if (!N || !utilisateur) return;

    (async () => {
      await preparerCanalAndroid(N);
      const jeton = await obtenirJeton(N);
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
    const N = notifications();
    if (!N) return;

    const abonnement = N.addNotificationResponseReceivedListener((reponse) => {
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
  const N = notifications();
  if (!N) return;

  try {
    const jeton = (await N.getExpoPushTokenAsync().catch(() => null))?.data;
    if (!jeton) return;
    await api('/api/notifications/appareil', { method: 'DELETE', body: { jeton } });
  } catch {
    // Sans conséquence : le serveur désactivera le jeton au premier échec d'envoi.
  }
}
