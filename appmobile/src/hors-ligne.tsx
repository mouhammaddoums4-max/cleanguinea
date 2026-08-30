import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';

import { api } from './api';

/**
 * File d'attente hors ligne.
 *
 * Le collecteur travaille souvent sans couverture : il scanne, pèse, confirme,
 * et tout doit partir quand le réseau revient. Chaque geste est donc écrit
 * LOCALEMENT d'abord, puis envoyé — jamais l'inverse. Une opération perdue
 * parce que le réseau a coupé pendant l'envoi serait une collecte non facturée.
 *
 * Trois propriétés tiennent l'ensemble :
 *
 * IDEMPOTENCE. Chaque opération porte un `clientRef` (UUID) généré ici, avant
 * tout envoi. Le serveur s'en sert pour ne l'appliquer qu'une fois, même si
 * l'application renvoie le lot parce qu'elle n'a jamais reçu la réponse.
 *
 * HORODATAGE LOCAL. `faiteA` est l'heure de l'appareil au moment du geste, pas
 * de l'envoi. C'est le seul moyen de reconstituer l'ordre réel d'une tournée
 * synchronisée trois heures plus tard.
 *
 * RETRAIT SELECTIF. On ne vide la file que des opérations réellement traitées.
 * Une erreur de données (bac inconnu) est définitive et sort de la file ; une
 * panne serveur reste et sera rejouée.
 */

const CLE_FILE = 'cleanguinea.file-sync';
const MAX_TENTATIVES = 5;

export type TypeOperation =
  | 'scan_bac'
  | 'niveau_bac'
  | 'demarrer_zone'
  | 'confirmer_zone'
  | 'collecte_mission';

export type Operation = {
  clientRef: string;
  type: TypeOperation;
  faiteA: string;
  charge: Record<string, unknown>;
  tentatives: number;
  derniereErreur?: string;
};

type Resultat = {
  clientRef: string;
  statut: 'APPLIQUEE' | 'DEJA_TRAITEE' | 'ECHOUEE';
  erreur?: string;
  rejouable?: boolean;
};

type ContexteHorsLigne = {
  /** true quand l'appareil a une connexion utilisable. */
  enLigne: boolean;
  /** Opérations en attente d'envoi. */
  enAttente: Operation[];
  /** Enfile une opération et tente de l'envoyer tout de suite si possible. */
  enfiler: (type: TypeOperation, charge: Record<string, unknown>) => Promise<string>;
  /** Force une tentative de synchronisation. */
  synchroniser: () => Promise<void>;
  synchronisation: boolean;
  /** Opérations abandonnées après trop d'échecs, à montrer au support. */
  echecs: Operation[];
  viderEchecs: () => Promise<void>;
};

const Contexte = createContext<ContexteHorsLigne | null>(null);

async function lireFile(): Promise<Operation[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_FILE);
    return brut ? (JSON.parse(brut) as Operation[]) : [];
  } catch {
    // File illisible : mieux vaut repartir vide que planter au démarrage.
    return [];
  }
}

async function ecrireFile(file: Operation[]) {
  await AsyncStorage.setItem(CLE_FILE, JSON.stringify(file)).catch(() => {});
}

export function HorsLigneProvider({ children }: { children: React.ReactNode }) {
  const [enLigne, setEnLigne] = useState(true);
  const [enAttente, setEnAttente] = useState<Operation[]>([]);
  const [echecs, setEchecs] = useState<Operation[]>([]);
  const [synchronisation, setSynchronisation] = useState(false);

  // Verrou : deux synchronisations simultanées enverraient le même lot deux
  // fois. Le serveur le rattraperait, mais autant ne pas l'appeler pour rien.
  const enCours = useRef(false);
  const file = useRef<Operation[]>([]);

  useEffect(() => {
    lireFile().then((f) => {
      file.current = f;
      setEnAttente(f);
    });
  }, []);

  const majFile = useCallback(async (suivante: Operation[]) => {
    file.current = suivante;
    setEnAttente(suivante);
    await ecrireFile(suivante);
  }, []);

  const synchroniser = useCallback(async () => {
    if (enCours.current || file.current.length === 0) return;

    enCours.current = true;
    setSynchronisation(true);

    try {
      const lot = file.current.slice(0, 200);

      const reponse = await api<{ resultats: Resultat[] }>('/api/sync', {
        method: 'POST',
        body: {
          operations: lot.map(({ tentatives, derniereErreur, ...o }) => o),
        },
      });

      const parRef = new Map(reponse.resultats.map((r) => [r.clientRef, r]));
      const restantes: Operation[] = [];
      const abandonnees: Operation[] = [];

      for (const operation of file.current) {
        const resultat = parRef.get(operation.clientRef);

        // Pas dans la réponse : l'opération n'était pas dans ce lot.
        if (!resultat) {
          restantes.push(operation);
          continue;
        }

        if (resultat.statut === 'APPLIQUEE' || resultat.statut === 'DEJA_TRAITEE') continue;

        // Une erreur de données ne se résoudra pas en réessayant : on sort
        // l'opération de la file plutôt que de la rejouer indéfiniment.
        if (resultat.rejouable === false) {
          abandonnees.push({ ...operation, derniereErreur: resultat.erreur });
          continue;
        }

        const tentatives = operation.tentatives + 1;
        if (tentatives >= MAX_TENTATIVES) {
          abandonnees.push({ ...operation, tentatives, derniereErreur: resultat.erreur });
        } else {
          restantes.push({ ...operation, tentatives, derniereErreur: resultat.erreur });
        }
      }

      await majFile(restantes);
      if (abandonnees.length > 0) setEchecs((e) => [...e, ...abandonnees]);
    } catch {
      // Serveur injoignable : la file reste intacte, on réessaiera.
    } finally {
      enCours.current = false;
      setSynchronisation(false);
    }
  }, [majFile]);

  // Surveillance du réseau. La transition hors ligne → en ligne déclenche
  // l'envoi : c'est le moment exact où le collecteur retrouve du signal.
  useEffect(() => {
    let actif = true;

    const verifier = async () => {
      try {
        const etat = await Network.getNetworkStateAsync();
        const disponible = Boolean(etat.isConnected && etat.isInternetReachable !== false);
        if (!actif) return;

        setEnLigne((precedent) => {
          if (!precedent && disponible) synchroniser();
          return disponible;
        });
      } catch {
        // État réseau indisponible : on suppose en ligne plutôt que de bloquer
        // l'utilisateur sur un doute.
        if (actif) setEnLigne(true);
      }
    };

    verifier();
    const minuterie = setInterval(verifier, 15_000);

    return () => {
      actif = false;
      clearInterval(minuterie);
    };
  }, [synchroniser]);

  const enfiler = useCallback(
    async (type: TypeOperation, charge: Record<string, unknown>) => {
      const operation: Operation = {
        clientRef: Crypto.randomUUID(),
        type,
        // Heure du geste, pas de l'envoi.
        faiteA: new Date().toISOString(),
        charge,
        tentatives: 0,
      };

      await majFile([...file.current, operation]);

      // Envoi immédiat si le réseau le permet : hors ligne n'est pas le cas
      // courant, seulement celui qui ne doit rien perdre.
      if (enLigne) synchroniser();

      return operation.clientRef;
    },
    [enLigne, majFile, synchroniser],
  );

  const viderEchecs = useCallback(async () => setEchecs([]), []);

  const valeur = useMemo(
    () => ({ enLigne, enAttente, enfiler, synchroniser, synchronisation, echecs, viderEchecs }),
    [enLigne, enAttente, enfiler, synchroniser, synchronisation, echecs, viderEchecs],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useHorsLigne() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useHorsLigne doit être utilisé dans HorsLigneProvider');
  return contexte;
}
