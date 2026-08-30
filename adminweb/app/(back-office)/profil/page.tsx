'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, UserRound } from 'lucide-react';

import { api } from '@/lib/api';
import { useConfig, type CleTexte, type Langue } from '@/lib/config';

type Utilisateur = {
  nom: string;
  role: string;
  telephone: string;
  email: string | null;
  identifiant: string | null;
  createdAt: string;
};

const LANGUES: Langue[] = ['fr', 'en'];

/** Fiche du compte connecté, ouverte depuis le menu utilisateur de l'en-tête. */
export default function Page() {
  const { t, langue, changerLangue, theme, changerTheme } = useConfig();
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);

  useEffect(() => {
    api<{ utilisateur: Utilisateur }>('/api/auth/moi')
      .then((rep) => setUtilisateur(rep.utilisateur))
      .catch(() => setUtilisateur(null));
  }, []);

  const locale = langue === 'en' ? 'en-GB' : 'fr-FR';
  const sombre = theme === 'sombre';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primaire-100">
          <UserRound className="h-7 w-7 text-primaire-600" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {utilisateur?.nom ?? t('chargement')}
          </h1>
          <p className="text-sm text-gray-500">
            {utilisateur
              ? utilisateur.role === 'ADMIN'
                ? t('administrateur')
                : t('superviseur')
              : ''}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">{t('informationsCompte')}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Champ libelle="nom" valeur={utilisateur?.nom} />
          <Champ libelle="identifiant" valeur={utilisateur?.identifiant} />
          <Champ libelle="telephone" valeur={utilisateur?.telephone} />
          <Champ libelle="email" valeur={utilisateur?.email} />
          <Champ
            libelle="membreDepuis"
            valeur={
              utilisateur &&
              new Date(utilisateur.createdAt).toLocaleDateString(locale, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            }
          />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">{t('preferences')}</h2>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            {sombre ? (
              <Moon className="h-4 w-4 text-gray-500" />
            ) : (
              <Sun className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-700">{t('apparence')}</span>
          </div>
          <div className="flex items-center rounded-md border border-gray-200 text-xs">
            <Bascule actif={!sombre} onClick={() => changerTheme('clair')} arrondi="gauche">
              {t('modeClair')}
            </Bascule>
            <Bascule actif={sombre} onClick={() => changerTheme('sombre')} arrondi="droite">
              {t('modeSombre')}
            </Bascule>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-700">{t('langueLibelle')}</span>
          <div className="flex items-center rounded-md border border-gray-200 text-xs">
            {LANGUES.map((l, i) => (
              <Bascule
                key={l}
                actif={langue === l}
                onClick={() => changerLangue(l)}
                arrondi={i === 0 ? 'gauche' : 'droite'}
              >
                {l.toUpperCase()}
              </Bascule>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Champ({ libelle, valeur }: { libelle: CleTexte; valeur?: string | null }) {
  const { t } = useConfig();
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{t(libelle)}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{valeur || t('nonRenseigne')}</dd>
    </div>
  );
}

function Bascule({
  actif,
  onClick,
  arrondi,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  arrondi: 'gauche' | 'droite';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={[
        'px-3 py-1.5 font-semibold transition',
        actif ? 'bg-primaire-500 text-white' : 'text-gray-500 hover:bg-gray-50',
        arrondi === 'gauche' ? 'rounded-l-md' : 'rounded-r-md',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
