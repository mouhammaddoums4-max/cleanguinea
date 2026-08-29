import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { api, ecrireJeton, effacerJeton, lireJeton, type Utilisateur } from './api';

type Identifiants = { telephone: string; motDePasse: string };

type Inscription = {
  nom: string;
  telephone: string;
  email?: string;
  motDePasse: string;
  adresse: string;
  commune: string;
  quartier: string;
  langue?: 'fr' | 'en';
  cguAcceptees: true;
};

type ContexteAuth = {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  connexion: (id: Identifiants) => Promise<Utilisateur>;
  inscription: (donnees: Inscription) => Promise<Utilisateur>;
  deconnexion: () => Promise<void>;
};

const Contexte = createContext<ContexteAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  // Au demarrage : si un jeton est stocke, on revalide la session aupres de l'API.
  useEffect(() => {
    (async () => {
      try {
        if (await lireJeton()) {
          const { utilisateur } = await api<{ utilisateur: Utilisateur }>('/api/auth/moi');
          setUtilisateur(utilisateur);
        }
      } catch {
        // Jeton expire ou serveur injoignable : on repart d'une session vierge.
        await effacerJeton();
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const connexion = useCallback(async (identifiants: Identifiants) => {
    const rep = await api<{ token: string; utilisateur: Utilisateur }>('/api/auth/connexion', {
      method: 'POST',
      body: identifiants,
      sansAuth: true,
    });
    await ecrireJeton(rep.token);
    setUtilisateur(rep.utilisateur);
    return rep.utilisateur;
  }, []);

  const inscription = useCallback(async (donnees: Inscription) => {
    const rep = await api<{ token: string; utilisateur: Utilisateur }>('/api/auth/inscription', {
      method: 'POST',
      body: donnees,
      sansAuth: true,
    });
    await ecrireJeton(rep.token);
    setUtilisateur(rep.utilisateur);
    return rep.utilisateur;
  }, []);

  const deconnexion = useCallback(async () => {
    await effacerJeton();
    setUtilisateur(null);
  }, []);

  const valeur = useMemo(
    () => ({ utilisateur, chargement, connexion, inscription, deconnexion }),
    [utilisateur, chargement, connexion, inscription, deconnexion],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useAuth() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useAuth doit etre utilise dans AuthProvider');
  return contexte;
}

/** Redirige vers l'espace correspondant au role, ou vers l'accueil public. */
export function useRedirectionSelonRole() {
  const { utilisateur, chargement } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (chargement) return;

    const dansAuth = segments[0] === '(auth)';

    if (!utilisateur) {
      if (!dansAuth) router.replace('/(auth)/bienvenue');
      return;
    }

    const espace = utilisateur.role === 'CLIENT' ? '(client)' : '(collecteur)';
    if (dansAuth || segments.length === 0) {
      router.replace(espace === '(client)' ? '/(client)/accueil' : '/(collecteur)/missions');
    }
  }, [utilisateur, chargement, segments, router]);
}
