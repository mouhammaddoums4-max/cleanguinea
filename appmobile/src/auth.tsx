import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';

import {
  api, ecrireJeton, effacerJeton, lireJeton, surSessionExpiree, type Utilisateur,
} from './api';

type Identifiants = {
  /** Numero d'abonnement (CG-...), numero employe (COL-...) ou telephone. */
  identifiant: string;
  motDePasse: string;
};

type Inscription = {
  nom: string;
  telephone: string;
  /** Position relevee par le telephone a l'inscription. */
  latitude?: number;
  longitude?: number;
  email?: string;
  motDePasse: string;
  /** Foyer ou societe : conditionne le suivi commercial cote back-office. */
  type?: 'PARTICULIER' | 'ENTREPRISE';
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
  inscription: (donnees: Inscription) => Promise<{ utilisateur: Utilisateur; codeClient: string }>;
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

  // Le serveur peut invalider une session a tout moment : mot de passe change
  // depuis un autre telephone, compte desactive par l'admin, jetons revoques.
  // On vide alors l'etat local, ce qui suffit au garde de navigation pour
  // ramener sur l'ecran de connexion.
  useEffect(() => surSessionExpiree(() => setUtilisateur(null)), []);

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
    const rep = await api<{
      token: string;
      utilisateur: Utilisateur;
      codeClient: string;
    }>('/api/auth/inscription', {
      method: 'POST',
      body: donnees,
      sansAuth: true,
    });
    await ecrireJeton(rep.token);
    setUtilisateur(rep.utilisateur);
    // Le code est remonte a l'appelant : l'ecran d'inscription l'affiche
    // avant d'entrer dans l'application.
    return { utilisateur: rep.utilisateur, codeClient: rep.codeClient };
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

    // expo-router type les segments comme un tuple non vide, alors qu'ils le
    // sont a la toute premiere passe : on compare sur un number pour garder le
    // garde d'execution sans mentir au typage.
    const nbSegments: number = segments.length;

    if (dansAuth || nbSegments === 0) {
      router.replace(
        utilisateur.role === 'CLIENT'
          ? '/(client)/accueil'
          : '/(collecteur)/tableau-de-bord',
      );
    }
  }, [utilisateur, chargement, segments, router]);
}
