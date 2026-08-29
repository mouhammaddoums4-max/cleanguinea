export const URL_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const CLE_JETON = 'cleanguinea.admin.token';

export function lireJeton(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CLE_JETON);
}

export function ecrireJeton(jeton: string) {
  window.localStorage.setItem(CLE_JETON, jeton);
}

export function effacerJeton() {
  window.localStorage.removeItem(CLE_JETON);
}

export class ErreurApi extends Error {
  constructor(
    message: string,
    public statut: number,
  ) {
    super(message);
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
    const jeton = lireJeton();
    if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  }

  let reponse: Response;
  try {
    reponse = await fetch(`${URL_API}${chemin}`, {
      ...reste,
      headers: entetes,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ErreurApi(`Serveur injoignable (${URL_API})`, 0);
  }

  if (reponse.status === 204) return undefined as T;

  const donnees = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    // Jeton expire : on nettoie pour forcer une reconnexion propre.
    if (reponse.status === 401 && typeof window !== 'undefined') effacerJeton();
    throw new ErreurApi(
      (donnees as { erreur?: string })?.erreur ?? `Erreur ${reponse.status}`,
      reponse.status,
    );
  }

  return donnees as T;
}

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------

export function gnf(montant: number): string {
  return `${montant.toLocaleString('fr-FR').replace(/ | /g, ' ')} GNF`;
}

export function nombre(valeur: number): string {
  return valeur.toLocaleString('fr-FR').replace(/ | /g, ' ');
}

export function dateCourte(valeur: string | Date): string {
  return new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function heure(valeur: string | Date): string {
  return new Date(valeur).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Carte = { valeur: number; evolution: number | null };

export type Dashboard = {
  periode: { debut: string; fin: string };
  cartes: {
    clientsActifs: Carte;
    abonnementsActifs: Carte;
    collectesRealisees: Carte;
    dechetsCollectesTonnes: Carte;
    chiffreAffairesGnf: Carte;
  };
  resumeFinancier: {
    revenusAbonnements: number;
    revenusRecyclage: number;
    depenses: number;
    beneficeNet: number;
  };
};

export type PointCourbe = { date: string; collectes: number };

export type Repartition = {
  totalTonnes: number;
  categories: { categorie: string; tonnes: number; pourcentage: number }[];
};

export type Zone = { zone: string; tonnes: number };

export type MissionsDuJour = {
  total: number;
  enCours: number;
  terminees: number;
  annulees: number;
};

export type CollecteEnCours = {
  id: string;
  reference: string;
  client: string;
  zone: string;
  bacs: { numero: number; categorie: string }[];
  collecteur: string | null;
  heurePlanifiee: string;
  statut: string;
};

export type Stock = {
  id: string;
  categorie: string;
  quantiteKg: number;
  tonnes: number;
  tauxRemplissage: number;
  capaciteRestantePct: number;
};

export type Alerte = {
  id: string;
  niveau: 'INFO' | 'ATTENTION' | 'CRITIQUE';
  titre: string;
  message: string;
  createdAt: string;
};

/** Libelles et couleurs des categories, alignes sur l'application mobile. */
export const CATEGORIES: Record<string, { libelle: string; couleur: string }> = {
  PLASTIQUE: { libelle: 'Plastiques', couleur: '#2563EB' },
  METAL_FER: { libelle: 'Métaux / Fer', couleur: '#F59E0B' },
  CARTON: { libelle: 'Carton', couleur: '#16A34A' },
  ORGANIQUE: { libelle: 'Déchets organiques', couleur: '#DC2626' },
  VERRE: { libelle: 'Verre', couleur: '#7C3AED' },
  AUTRES: { libelle: 'Autres déchets', couleur: '#4B5563' },
  REFUS: { libelle: 'Refus', couleur: '#9CA3AF' },
};

export function categorie(cle: string) {
  return CATEGORIES[cle] ?? { libelle: cle, couleur: '#9CA3AF' };
}
