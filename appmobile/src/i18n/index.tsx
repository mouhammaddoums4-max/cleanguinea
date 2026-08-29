import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { api } from '../api';
import { fr } from './fr';
import { en } from './en';

export type Langue = 'fr' | 'en';

const DICTIONNAIRES = { fr, en } as const;
const CLE_STOCKAGE = 'cleanguinea.langue';

type Section = keyof typeof fr;

type ContexteI18n = {
  langue: Langue;
  changerLangue: (l: Langue) => Promise<void>;
  /** t('accueil.bonjour') · t('points.encorePts', { n: 120, niveau: 'Or' }) */
  t: (chemin: string, variables?: Record<string, string | number>) => string;
  /** Pour les clés dont la valeur est une liste (ex. suppression.listeSupprime). */
  tListe: (chemin: string) => string[];
  pret: boolean;
};

const Contexte = createContext<ContexteI18n | null>(null);

/** Langue du téléphone si elle est supportée, français sinon. */
function langueParDefaut(): Langue {
  const code = Localization.getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'fr';
}

function lire(dictionnaire: unknown, chemin: string): unknown {
  return chemin.split('.').reduce<unknown>(
    (courant, cle) =>
      courant && typeof courant === 'object' ? (courant as Record<string, unknown>)[cle] : undefined,
    dictionnaire,
  );
}

function interpoler(texte: string, variables?: Record<string, string | number>) {
  if (!variables) return texte;
  return texte.replace(/\{(\w+)\}/g, (brut, cle) =>
    cle in variables ? String(variables[cle]) : brut,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [langue, setLangue] = useState<Langue>(langueParDefaut);
  const [pret, setPret] = useState(false);

  // Préférence enregistrée sur l'appareil : elle survit à la déconnexion,
  // pour que l'écran de connexion soit déjà dans la bonne langue.
  useEffect(() => {
    (async () => {
      try {
        const stockee = await AsyncStorage.getItem(CLE_STOCKAGE);
        if (stockee === 'fr' || stockee === 'en') setLangue(stockee);
      } finally {
        setPret(true);
      }
    })();
  }, []);

  const changerLangue = useCallback(async (nouvelle: Langue) => {
    setLangue(nouvelle);
    await AsyncStorage.setItem(CLE_STOCKAGE, nouvelle);

    // Le compte mémorise aussi la langue, pour les SMS et notifications envoyés
    // par le serveur. Un échec ici (hors ligne, non connecté) est sans gravité.
    try {
      await api('/api/compte/langue', { method: 'PATCH', body: { langue: nouvelle } });
    } catch {
      // silencieux : la préférence locale prime pour l'affichage
    }
  }, []);

  const t = useCallback(
    (chemin: string, variables?: Record<string, string | number>) => {
      const valeur = lire(DICTIONNAIRES[langue], chemin) ?? lire(DICTIONNAIRES.fr, chemin);
      // Renvoyer la clé rend une traduction manquante visible plutôt que muette.
      if (typeof valeur !== 'string') return chemin;
      return interpoler(valeur, variables);
    },
    [langue],
  );

  const tListe = useCallback(
    (chemin: string) => {
      const valeur = lire(DICTIONNAIRES[langue], chemin) ?? lire(DICTIONNAIRES.fr, chemin);
      return Array.isArray(valeur) ? (valeur as string[]) : [];
    },
    [langue],
  );

  const valeur = useMemo(
    () => ({ langue, changerLangue, t, tListe, pret }),
    [langue, changerLangue, t, tListe, pret],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useI18n() {
  const contexte = useContext(Contexte);
  if (!contexte) throw new Error('useI18n doit être utilisé dans I18nProvider');
  return contexte;
}

/** Formatage des nombres et dates dans la locale courante. */
export function useFormat() {
  const { langue } = useI18n();
  const locale = langue === 'en' ? 'en-GB' : 'fr-FR';

  return useMemo(
    () => ({
      nombre: (v: number) => v.toLocaleString(locale).replace(/ | /g, ' '),
      montant: (v: number, devise = 'GNF') =>
        `${v.toLocaleString(locale).replace(/ | /g, ' ')} ${devise}`,
      date: (v: string | Date) =>
        new Date(v).toLocaleDateString(locale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      dateLongue: (v: string | Date) =>
        new Date(v).toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
      heure: (v: string | Date) =>
        new Date(v).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    }),
    [locale],
  );
}

export const LANGUES: { code: Langue; libelle: string }[] = [
  { code: 'fr', libelle: 'Français' },
  { code: 'en', libelle: 'English' },
];
