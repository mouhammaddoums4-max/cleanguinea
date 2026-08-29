import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * URL de l'API.
 *
 * Sur un telephone physique, "localhost" designe le telephone lui-meme et non le PC :
 * on retombe donc sur l'hote du serveur Metro (l'IP de votre machine sur le reseau local),
 * qu'Expo expose dans hostUri. Definissez EXPO_PUBLIC_API_URL pour forcer une valeur.
 */
function resoudreUrlApi(): string {
  const forcee = process.env.EXPO_PUBLIC_API_URL;
  if (forcee) return forcee;

  const configuree = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  if (Platform.OS !== 'web') {
    const hote = Constants.expoConfig?.hostUri?.split(':')[0];
    if (hote) return `http://${hote}:4000`;
  }

  return configuree ?? 'http://localhost:4000';
}

export const URL_API = resoudreUrlApi();

const CLE_JETON = 'cleanguinea.token';

// SecureStore n'existe pas sur le web : on retombe sur localStorage.
export async function lireJeton(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CLE_JETON) ?? null;
  return SecureStore.getItemAsync(CLE_JETON);
}

export async function ecrireJeton(jeton: string): Promise<void> {
  if (Platform.OS === 'web') return void globalThis.localStorage?.setItem(CLE_JETON, jeton);
  await SecureStore.setItemAsync(CLE_JETON, jeton);
}

export async function effacerJeton(): Promise<void> {
  if (Platform.OS === 'web') return void globalThis.localStorage?.removeItem(CLE_JETON);
  await SecureStore.deleteItemAsync(CLE_JETON);
}

export class ErreurApi extends Error {
  constructor(
    message: string,
    public statut: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown; sansAuth?: boolean };

export async function api<T = unknown>(chemin: string, options: Options = {}): Promise<T> {
  const { body, sansAuth, headers, ...reste } = options;

  const entetes: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!sansAuth) {
    const jeton = await lireJeton();
    if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${URL_API}${chemin}`, {
      ...reste,
      headers: entetes,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ErreurApi(
      `Impossible de joindre le serveur (${URL_API}). Verifiez votre connexion.`,
      0,
    );
  }

  if (reponse.status === 204) return undefined as T;

  const donnees = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    throw new ErreurApi(
      (donnees as { erreur?: string })?.erreur ?? `Erreur ${reponse.status}`,
      reponse.status,
      (donnees as { details?: unknown })?.details,
    );
  }

  return donnees as T;
}

// ---------------------------------------------------------------------------
// Types partages avec l'API
// ---------------------------------------------------------------------------

export type Role = 'CLIENT' | 'COLLECTEUR' | 'SUPERVISEUR' | 'ADMIN';

export type Categorie =
  | 'PLASTIQUE' | 'METAL_FER' | 'AUTRES' | 'CARTON' | 'VERRE' | 'ORGANIQUE' | 'REFUS';

export type StatutMission =
  | 'EN_ATTENTE' | 'ACCEPTEE' | 'EN_ROUTE' | 'ARRIVE' | 'TERMINEE' | 'ANNULEE' | 'MANQUEE';

export type Utilisateur = {
  id: string;
  nom: string;
  telephone: string;
  role: Role;
  langue?: 'fr' | 'en';
};

export type Bac = {
  id: string;
  numero: number;
  categorie: Categorie;
  codeQr: string;
  niveauTiers: number;
  libelleNiveau?: string;
};

export type Mission = {
  id: string;
  reference: string;
  statut: StatutMission;
  datePlanifiee: string;
  fenetreFin: string | null;
  etaMinutes: number | null;
  poidsTotalKg: number;
  photoUrl: string | null;
  client: {
    id: string;
    adresse: string;
    notes: string | null;
    user: Utilisateur;
    quartier: { nom: string; commune: { nom: string } };
  };
  collecteur: { id: string; note: number; user: Utilisateur } | null;
  bacs: { bac: Bac }[];
  pesees: { categorie: Categorie; poidsKg: number }[];
};

export type Paiement = {
  id: string;
  reference: string;
  montantGnf: number;
  moyen: string;
  statut: 'EN_ATTENTE' | 'PAYE' | 'ECHOUE' | 'REMBOURSE';
  periodeDebut: string;
  payeLe: string | null;
};

export type SoldePoints = {
  solde: number;
  valeurGnf: number;
  cumule12Mois: number;
  niveau: string;
  niveauLibelle: string;
  bonusPct: number;
  prochainNiveau: { code: string; libelle: string; pointsRestants: number } | null;
  mouvements: { id: string; sens: 'CREDIT' | 'DEBIT'; points: number; motif: string; createdAt: string }[];
};
