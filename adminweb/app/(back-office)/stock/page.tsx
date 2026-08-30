'use client';

import { useEffect, useState } from 'react';
import { Printer, QrCode, Search, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import { useConfig } from '@/lib/config';

type Bac = {
  id: string;
  codeQr: string;
  numero: number;
  categorie: string;
  volumeLitres: number;
  etat: 'BON' | 'ABIME' | 'PERDU' | 'REMPLACE';
  enService: boolean;
  imprimeLe: string | null;
  client: {
    user: { nom: string; telephone: string };
    quartier: { nom: string; commune: { nom: string } };
  } | null;
};

type Stock = {
  id: string;
  categorie: string;
  tonnes: number;
  tauxRemplissage: number;
  capaciteRestantePct: number;
};

const ETATS: Record<Bac['etat'], { libelle: string; classe: string }> = {
  BON: { libelle: 'Bon état', classe: 'bg-primaire-100 text-primaire-700' },
  ABIME: { libelle: 'Abîmé', classe: 'bg-amber-50 text-amber-700' },
  PERDU: { libelle: 'Perdu', classe: 'bg-red-50 text-red-700' },
  REMPLACE: { libelle: 'Remplacé', classe: 'bg-gray-100 text-gray-500' },
};

/** Stock du centre de tri et parc de bacs, les deux inventaires de l'exploitation. */
export default function StockEtBacs() {
  const { t, categorie } = useConfig();

  const [onglet, setOnglet] = useState<'stock' | 'bacs'>('stock');
  const [stock, setStock] = useState<Stock[] | null>(null);
  const [bacs, setBacs] = useState<{ total: number; bacs: Bac[] } | null>(null);
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    try {
      const [s, b] = await Promise.all([
        api<Stock[]>('/api/tri/stock'),
        api<{ total: number; bacs: Bac[] }>('/api/bacs?taille=200'),
      ]);
      setStock(s);
      setBacs(b);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function changerEtat(bac: Bac, etat: Bac['etat']) {
    try {
      await api(`/api/bacs/${bac.id}`, { method: 'PUT', body: { etat } });
      charger();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action impossible');
    }
  }

  if (erreur) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {erreur}
      </div>
    );
  }

  if (!stock || !bacs) {
    return <div className="py-20 text-center text-sm text-gray-500">{t('chargement')}</div>;
  }

  const terme = recherche.trim().toLowerCase();
  const bacsFiltres = terme
    ? bacs.bacs.filter(
        (b) =>
          b.codeQr.toLowerCase().includes(terme) ||
          b.client?.user.nom.toLowerCase().includes(terme),
      )
    : bacs.bacs;

  const horsService = bacs.bacs.filter((b) => !b.enService).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('stock')}</h1>
        <p className="text-sm text-gray-500">
          {bacs.total} bacs · {horsService} hors service
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(
          [
            ['stock', t('stockParCategorie')],
            ['bacs', 'Parc de bacs'],
          ] as const
        ).map(([cle, libelle]) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              onglet === cle ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === 'stock' ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">{t('quantiteEnStock')}</h2>
          <ul className="mt-4 space-y-4">
            {stock.map((s) => {
              const meta = categorie(s.categorie);
              // Au-delà de 90 %, il faut expédier : un centre saturé arrête la collecte.
              const sature = s.tauxRemplissage > 90;
              return (
                <li key={s.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: meta.couleur }}
                    />
                    <span className="flex-1 text-gray-600">{meta.libelle}</span>
                    <span className="font-semibold text-gray-900">{s.tonnes} t</span>
                    <span
                      className={`w-14 text-right text-xs ${
                        sature ? 'font-semibold text-red-600' : 'text-gray-400'
                      }`}
                    >
                      {s.tauxRemplissage} %
                    </span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(s.tauxRemplissage, 100)}%`,
                        backgroundColor: sature ? '#DC2626' : meta.couleur,
                      }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Code QR ou nom du client…"
                className="w-72 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primaire-500"
              />
            </div>
            <span className="text-xs text-gray-500">{bacsFiltres.length} bacs</span>
          </div>

          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Code QR</th>
                  <th className="pb-2 pr-3 font-medium">Client</th>
                  <th className="pb-2 pr-3 font-medium">Zone</th>
                  <th className="pb-2 pr-3 font-medium">Catégorie</th>
                  <th className="pb-2 pr-3 font-medium">État</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bacsFiltres.slice(0, 60).map((b) => {
                  const meta = categorie(b.categorie);
                  const e = ETATS[b.etat];
                  return (
                    <tr key={b.id} className={b.enService ? '' : 'opacity-50'}>
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-1.5 font-mono text-xs font-medium text-gray-900">
                          <QrCode className="h-3.5 w-3.5 text-gray-400" />
                          {b.codeQr}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-700">
                        {b.client?.user.nom ?? <span className="text-gray-400">Non affecté</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500">
                        {b.client ? `${b.client.quartier.nom}, ${b.client.quartier.commune.nom}` : '—'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: meta.couleur }}
                          />
                          <span className="text-gray-700">{meta.libelle}</span>
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.classe}`}>
                          {e.libelle}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            title="Marquer imprimé"
                            onClick={() =>
                              api(`/api/bacs/${b.id}`, {
                                method: 'PUT',
                                body: { imprimeLe: new Date().toISOString() },
                              }).then(charger)
                            }
                            className={`rounded p-1.5 hover:bg-gray-100 ${
                              b.imprimeLe ? 'text-primaire-600' : 'text-gray-400'
                            }`}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {b.etat !== 'PERDU' && (
                            <button
                              title="Déclarer perdu"
                              onClick={() => {
                                if (confirm(`Déclarer ${b.codeQr} perdu ?`)) {
                                  changerEtat(b, 'PERDU');
                                }
                              }}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {bacsFiltres.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">Aucun bac trouvé</p>
            )}
            {bacsFiltres.length > 60 && (
              <p className="pt-3 text-center text-xs text-gray-400">
                60 premiers affichés sur {bacsFiltres.length}. Affinez la recherche.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
