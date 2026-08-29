import { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api } from './api';
import { useI18n } from './i18n';

/**
 * Configuration servie par l'API (`GET /api/config`).
 *
 * Libellés de catégories, couleurs, offres, taux de conversion, niveaux de
 * fidélité et paramètres : rien de tout cela n'est écrit dans l'application.
 * Une modification depuis le back-office se propage sans nouvelle version.
 */

export type CategorieConfig = {
  code: string;
  libelle: string;
  couleur: string;
  couleurFond: string;
  icone: string;
  recyclable: boolean;
};

export type ConversionConfig = {
  type: string;
  libelle: string;
  pointsPour1000Gnf: number;
  plafondMensuelGnf: number | null;
  soldeMinimumPoints: number;
};

export type NiveauConfig = {
  code: string;
  libelle: string;
  seuil: number;
  bonusPct: number;
};

export type OffreConfig = {
  id: string;
  type: string;
  libelle: string;
  tarifMensuelGnf: number;
  passagesParSemaine: number;
  nbBacsFournis: number;
};

export type Config = {
  langue: string;
  categories: CategorieConfig[];
  conversions: ConversionConfig[];
  niveaux: NiveauConfig[];
  offres: OffreConfig[];
  parametres: Record<string, string | number | boolean | string[]>;
};

/** Repli neutre le temps du chargement : ni libellé ni couleur inventés. */
const CATEGORIE_INCONNUE: CategorieConfig = {
  code: '',
  libelle: '—',
  couleur: '#9CA3AF',
  couleurFond: '#F3F4F6',
  icone: 'trash',
  recyclable: false,
};

type ContexteConfig = {
  config: Config | null;
  chargement: boolean;
  erreur: Error | null;
  categorie: (code: string) => CategorieConfig;
  parametre: <T = string | number | boolean>(cle: string, defaut: T) => T;
  devise: string;
  indicatif: string;
  slogan: string;
};

const Contexte = createContext<ContexteConfig | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { langue } = useI18n();

  const requete = useQuery({
    queryKey: ['config', langue],
    queryFn: () => api<Config>(`/api/config?langue=${langue}`, { sansAuth: true }),
    // La configuration change rarement : inutile de la redemander souvent.
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const valeur = useMemo<ContexteConfig>(() => {
    const config = requete.data ?? null;

    const parCode = new Map(config?.categories.map((c) => [c.code, c]) ?? []);

    const parametre = <T,>(cle: string, defaut: T): T => {
      const v = config?.parametres?.[cle];
      return (v === undefined ? defaut : v) as T;
    };

    return {
      config,
      chargement: requete.isLoading,
      erreur: (requete.error as Error) ?? null,
      categorie: (code) => parCode.get(code) ?? { ...CATEGORIE_INCONNUE, code },
      parametre,
      devise: parametre('app.deviseCode', 'GNF'),
      indicatif: parametre('app.indicatifTelephonique', '+224'),
      slogan: langue === 'en'
        ? parametre('app.sloganEn', 'From waste to value')
        : parametre('app.slogan', 'Du déchet à la valeur'),
    };
  }, [requete.data, requete.isLoading, requete.error, langue]);

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useConfig() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useConfig doit être utilisé dans ConfigProvider');
  return contexte;
}

/** Raccourci : configuration d'affichage d'une catégorie de déchet. */
export function useCategorie(code: string) {
  return useConfig().categorie(code);
}
