'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Search, Trash2, X } from 'lucide-react';

import { api, type ClientDetail, type ClientResume, type PageClients } from '@/lib/api';
import { useConfig, useFormat } from '@/lib/config';

const PAR_PAGE = 25;

export default function Clients() {
  const { t, statut } = useConfig();
  const format = useFormat();

  const [recherche, setRecherche] = useState('');
  const [rechercheAppliquee, setRechercheAppliquee] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreCommune, setFiltreCommune] = useState('');
  const [avecSupprimes, setAvecSupprimes] = useState(false);
  const [page, setPage] = useState(1);

  const [communes, setCommunes] = useState<string[]>([]);
  const [donnees, setDonnees] = useState<PageClients | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  useEffect(() => {
    api<string[]>('/api/clients/communes')
      .then(setCommunes)
      .catch(() => setCommunes([]));
  }, []);

  // La saisie ne doit pas declencher une requete par caractere.
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setRechercheAppliquee(recherche.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  const charger = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), parPage: String(PAR_PAGE) });
    if (rechercheAppliquee) params.set('recherche', rechercheAppliquee);
    if (filtreStatut) params.set('statut', filtreStatut);
    if (filtreCommune) params.set('commune', filtreCommune);
    if (avecSupprimes) params.set('inclureSupprimes', 'true');

    setChargement(true);
    api<PageClients>('/api/clients?' + params.toString())
      .then((rep) => {
        setDonnees(rep);
        setErreur(null);
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setChargement(false));
  }, [page, rechercheAppliquee, filtreStatut, filtreCommune, avecSupprimes]);

  useEffect(charger, [charger]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('clients')}</h1>
          <p className="text-sm text-gray-500">{t('annuaireClients')}</p>
        </div>
        {donnees && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{format.nombre(donnees.total)}</span>{' '}
            {t('clientsTrouves')}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={t('rechercherClient')}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primaire-500"
          />
        </label>

        <select
          value={filtreStatut}
          onChange={(e) => {
            setFiltreStatut(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primaire-500"
        >
          <option value="">{t('tousStatuts')}</option>
          {['ACTIF', 'SUSPENDU', 'RESILIE'].map((s) => (
            <option key={s} value={s}>
              {statut(s)}
            </option>
          ))}
        </select>

        <select
          value={filtreCommune}
          onChange={(e) => {
            setFiltreCommune(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primaire-500"
        >
          <option value="">{t('toutesZones')}</option>
          {communes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={avecSupprimes}
            onChange={(e) => {
              setAvecSupprimes(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-gray-300 accent-primaire-500"
          />
          {t('inclureSupprimes')}
        </label>
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {erreur}
        </div>
      )}

      {/* Annuaire */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="pb-2 pr-3 font-medium">{t('codeClient')}</th>
                <th className="pb-2 pr-3 font-medium">{t('client')}</th>
                <th className="pb-2 pr-3 font-medium">{t('zone')}</th>
                <th className="pb-2 pr-3 font-medium">{t('adresse')}</th>
                <th className="pb-2 pr-3 font-medium">{t('offre')}</th>
                <th className="pb-2 pr-3 font-medium">{t('bacs')}</th>
                <th className="pb-2 pr-3 font-medium">{t('inscritLe')}</th>
                <th className="pb-2 font-medium">{t('statut')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {donnees?.clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setOuvert(c.id)}
                  className="cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="py-2.5 pr-3 font-medium text-gray-900">{c.reference ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primaire-100 text-xs font-bold text-primaire-600">
                        {initiales(c.nom)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-gray-900">{c.nom}</span>
                        <span className="block text-xs text-gray-500">{c.telephone}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">
                    {c.commune}
                    <span className="block text-xs text-gray-500">{c.quartier}</span>
                  </td>
                  <td className="max-w-48 truncate py-2.5 pr-3 text-gray-500">{c.adresse}</td>
                  <td className="py-2.5 pr-3 text-gray-700">
                    {c.offre ?? '—'}
                    {c.tarifMensuelGnf !== null && (
                      <span className="block text-xs text-gray-500">
                        {format.montant(c.tarifMensuelGnf)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">{c.nbBacs}</td>
                  <td className="py-2.5 pr-3 text-gray-500">{format.dateCourte(c.inscritLe)}</td>
                  <td className="py-2.5">
                    <Pastille client={c} libelle={statut} supprime={t('compteSupprime')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {chargement && !donnees && (
            <p className="py-10 text-center text-sm text-gray-500">{t('chargement')}</p>
          )}
          {donnees?.clients.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">{t('aucunClient')}</p>
          )}
        </div>

        {donnees && donnees.nbPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 text-sm">
            <span className="text-gray-500">
              {t('pageSur')
                .replace('{p}', String(donnees.page))
                .replace('{n}', String(donnees.nbPages))}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={donnees.page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                {t('precedent')}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(donnees.nbPages, p + 1))}
                disabled={donnees.page >= donnees.nbPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                {t('suivant')}
              </button>
            </div>
          </div>
        )}
      </div>

      {ouvert && <Fiche id={ouvert} fermer={() => setOuvert(null)} />}
    </div>
  );
}

/** Statut de l'abonnement — la mention "compte supprime" prime sur tout. */
function Pastille({
  client,
  libelle,
  supprime,
}: {
  client: ClientResume;
  libelle: (code: string) => string;
  supprime: string;
}) {
  if (client.supprime) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        <Trash2 className="h-3 w-3" />
        {supprime}
      </span>
    );
  }

  if (!client.statutAbonnement) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const teintes: Record<string, string> = {
    ACTIF: 'bg-primaire-100 text-primaire-700',
    SUSPENDU: 'bg-amber-50 text-amber-600',
    RESILIE: 'bg-red-50 text-red-600',
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${teintes[client.statutAbonnement]}`}
    >
      {libelle(client.statutAbonnement)}
    </span>
  );
}

/** Panneau lateral : fiche complete du client selectionne. */
function Fiche({ id, fermer }: { id: string; fermer: () => void }) {
  const { t, statut, categorie } = useConfig();
  const format = useFormat();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api<ClientDetail>('/api/clients/' + id)
      .then(setClient)
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Erreur'));
  }, [id]);

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
    };
    document.addEventListener('keydown', auClavier);
    return () => document.removeEventListener('keydown', auClavier);
  }, [fermer]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/40" onClick={fermer}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-400">{t('ficheClient')}</p>
            <h2 className="truncate text-xl font-bold text-gray-900">
              {client?.nom ?? t('chargement')}
            </h2>
            {client && <p className="text-sm text-gray-500">{client.reference ?? '—'}</p>}
          </div>
          <button
            onClick={fermer}
            aria-label={t('fermer')}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {erreur && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erreur}
          </div>
        )}

        {client && (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <Champ libelle={t('telephone')} valeur={client.telephone} />
              <Champ libelle={t('email')} valeur={client.email ?? t('nonRenseigne')} />
              <Champ libelle={t('adresse')} valeur={client.adresse} />
              <Champ libelle={t('zone')} valeur={`${client.quartier}, ${client.commune}`} />
              <Champ libelle={t('foyer')} valeur={`${client.nbPersonnes} ${t('personnes')}`} />
              <Champ libelle={t('inscritLe')} valeur={format.dateCourte(client.inscritLe)} />
            </section>

            {client.notes && (
              <Bloc titre={t('notes')}>
                <p className="text-sm text-gray-700">{client.notes}</p>
              </Bloc>
            )}

            {client.latitude !== null && client.longitude !== null && (
              <Bloc titre={t('localisation')}>
                <a
                  href={`https://www.google.com/maps?q=${client.latitude},${client.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primaire-600 hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  {client.latitude.toFixed(5)}, {client.longitude.toFixed(5)} — {t('voirSurCarte')}
                </a>
              </Bloc>
            )}

            <Bloc titre={t('bacs')}>
              {client.bacs.length === 0 ? (
                <p className="text-sm text-gray-400">{t('aucuneDonnee')}</p>
              ) : (
                <ul className="space-y-2">
                  {client.bacs.map((b) => {
                    const cat = categorie(b.categorie);
                    return (
                      <li key={b.numero} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.couleur }}
                        />
                        <span className="font-medium text-gray-900">Bac {b.numero}</span>
                        <span className="text-gray-500">{cat.libelle}</span>
                        <span className="ml-auto text-xs text-gray-400">{b.codeQr}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Bloc>

            <Bloc titre={t('historiqueAbonnements')}>
              {client.abonnements.length === 0 ? (
                <p className="text-sm text-gray-400">{t('aucunAbonnement')}</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {client.abonnements.map((a) => (
                    <li key={a.reference} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{a.offre}</span>
                        <span className="block text-xs text-gray-500">
                          {a.reference} · {format.montant(a.tarifMensuelGnf)}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">{statut(a.statut)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloc>

            <Bloc titre={t('dernieresCollectes')}>
              {client.dernieresMissions.length === 0 ? (
                <p className="text-sm text-gray-400">{t('aucuneDonnee')}</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {client.dernieresMissions.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{m.reference}</span>
                        <span className="block text-xs text-gray-500">
                          {format.dateCourte(m.datePlanifiee)}
                          {m.collecteur ? ` · ${m.collecteur}` : ''}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">{statut(m.statut)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloc>

            <Bloc titre={t('derniersPaiements')}>
              {client.derniersPaiements.length === 0 ? (
                <p className="text-sm text-gray-400">{t('aucuneDonnee')}</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {client.derniersPaiements.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">
                          {format.montant(p.montantGnf)}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {statut(p.moyen)} · {format.dateCourte(p.payeLe ?? p.createdAt)}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">{statut(p.statut)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Bloc>
          </div>
        )}

        {!client && !erreur && (
          <p className="py-10 text-center text-sm text-gray-500">{t('chargement')}</p>
        )}
      </aside>
    </div>
  );
}

function Champ({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{libelle}</div>
      <div className="mt-0.5 break-words text-sm font-medium text-gray-900">{valeur}</div>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{titre}</h3>
      {children}
    </section>
  );
}

function initiales(nom: string) {
  const lettres = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('');
  return lettres || '?';
}
