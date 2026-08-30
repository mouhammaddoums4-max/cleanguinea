'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recycle } from 'lucide-react';

import { api, ecrireJeton } from '@/lib/api';
import { useConfig } from '@/lib/config';

export default function Connexion() {
  const router = useRouter();
  const { t, langue, changerLangue } = useConfig();
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const rep = await api<{ token: string; utilisateur: { role: string } }>(
        '/api/auth/connexion',
        { method: 'POST', body: { telephone, motDePasse }, sansAuth: true },
      );

      if (!['ADMIN', 'SUPERVISEUR'].includes(rep.utilisateur.role)) {
        setErreur(t('accesRefuse'));
        return;
      }

      ecrireJeton(rep.token);
      router.replace('/tableau-de-bord');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Connexion impossible');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primaire-100">
            <Recycle className="h-7 w-7 text-primaire-500" />
          </span>
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Sényi</h1>
            <p className="text-xs text-gray-500">
              {langue === 'en' ? 'From waste to value' : 'Du déchet à la valeur'}
            </p>
          </div>

          <div className="flex items-center rounded-md border border-gray-200 text-xs">
            {(['fr', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => changerLangue(l)}
                className={`px-2.5 py-1 font-semibold uppercase transition ${
                  langue === l ? 'bg-primaire-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                } ${l === 'fr' ? 'rounded-l-md' : 'rounded-r-md'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={soumettre}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('backOffice')}</h2>
            <p className="text-xs text-gray-500">{t('reserveA')}</p>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">{t('telephone')}</span>
            <input
              type="tel"
              required
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+224 6XX XX XX XX"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primaire-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-600">{t('motDePasse')}</span>
            <input
              type="password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primaire-500"
            />
          </label>

          {erreur && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p>
          )}

          <button
            type="submit"
            disabled={envoi}
            className="w-full rounded-lg bg-primaire-500 py-2.5 text-sm font-semibold text-white transition hover:bg-primaire-600 disabled:opacity-50"
          >
            {envoi ? `${t('connexion')}…` : t('connexion')}
          </button>
        </form>
      </div>
    </div>
  );
}
