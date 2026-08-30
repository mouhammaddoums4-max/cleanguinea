'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, Loader2, Phone, Plus, RotateCcw, Search, ShieldAlert, UserRound, X,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useConfig, useFormat } from '@/lib/config';

type Collecteur = {
  id: string;
  matricule: string;
  statut: 'ACTIF' | 'CONGE' | 'SUSPENDU' | 'SORTI';
  photoUrl: string | null;
  adresse: string | null;
  vehicule: string | null;
  typeContrat: string | null;
  note: number;
  nbEvaluations: number;
  urgenceNom: string | null;
  urgenceTelephone: string | null;
  urgenceLien: string | null;
  dateEmbauche: string | null;
  user: { nom: string; telephone: string; email: string | null; actif: boolean };
  quartier: { nom: string; commune: { nom: string } } | null;
  zonesDuJour: { total: number; terminees: number };
};

type Fiche = {
  collecteur: Collecteur;
  historique: {
    id: string;
    reference: string;
    date: string;
    statut: string;
    nbFoyersServis: number;
    poidsTotalKg: number;
    quartier: { nom: string; commune: { nom: string } };
  }[];
  cumul: { jours: number; zones: number; poidsTotalKg: number; foyersServis: number; nonTerminees: number };
};

const STATUTS: Record<Collecteur['statut'], { libelle: string; classe: string }> = {
  ACTIF: { libelle: 'Actif', classe: 'bg-primaire-100 text-primaire-700' },
  CONGE: { libelle: 'En congé', classe: 'bg-blue-50 text-blue-700' },
  SUSPENDU: { libelle: 'Suspendu', classe: 'bg-amber-50 text-amber-700' },
  SORTI: { libelle: 'Sorti', classe: 'bg-gray-100 text-gray-500' },
};

export default function Collecteurs() {
  const { t } = useConfig();
  const format = useFormat();

  const [liste, setListe] = useState<Collecteur[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [creation, setCreation] = useState(false);

  async function charger() {
    try {
      setListe(await api<Collecteur[]>('/api/collecteurs'));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }

  useEffect(() => {
    charger();
  }, []);

  if (erreur) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {erreur}
      </div>
    );
  }

  if (!liste) {
    return <div className="py-20 text-center text-sm text-gray-500">{t('chargement')}</div>;
  }

  const terme = recherche.trim().toLowerCase();
  const filtres = terme
    ? liste.filter(
        (c) =>
          c.user.nom.toLowerCase().includes(terme) ||
          c.matricule.toLowerCase().includes(terme) ||
          c.user.telephone.includes(terme),
      )
    : liste;

  const actifs = liste.filter((c) => c.statut === 'ACTIF').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('collecteurs')}</h1>
          <p className="text-sm text-gray-500">
            {actifs} actif{actifs > 1 ? 's' : ''} sur {liste.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Nom, matricule, téléphone…"
              className="w-64 rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primaire-500"
            />
          </div>

          <button
            onClick={() => setCreation(true)}
            className="flex items-center gap-2 rounded-lg bg-primaire-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaire-600"
          >
            <Plus className="h-4 w-4" />
            Nouveau collecteur
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtres.map((c) => {
          const s = STATUTS[c.statut];
          return (
            <button
              key={c.id}
              onClick={async () => setFiche(await api<Fiche>(`/api/collecteurs/${c.id}`))}
              className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-primaire-500"
            >
              <div className="flex items-start gap-3">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrl}
                    alt={c.user.nom}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primaire-100 text-primaire-700">
                    <UserRound className="h-6 w-6" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-gray-900">{c.user.nom}</div>
                  <div className="text-xs text-gray-500">{c.matricule}</div>
                </div>

                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.classe}`}>
                  {s.libelle}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {c.user.telephone}
                </span>
                <span>★ {c.note.toFixed(1)}</span>
              </div>

              {/* Zones du jour : le seul chiffre qui dit si la tournée avance. */}
              <div className="mt-3 flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className="block h-full rounded-full bg-primaire-500"
                    style={{
                      width: `${
                        c.zonesDuJour.total
                          ? (c.zonesDuJour.terminees / c.zonesDuJour.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </span>
                <span className="text-xs text-gray-500">
                  {c.zonesDuJour.terminees}/{c.zonesDuJour.total} zones
                </span>
              </div>

              {/* Une personne à prévenir manquante est un risque, pas un détail. */}
              {!c.urgenceTelephone && c.statut === 'ACTIF' && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Aucune personne à prévenir
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtres.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-400">Aucun collecteur trouvé</p>
      )}

      {fiche && <PanneauFiche fiche={fiche} onFermer={() => setFiche(null)} onMaj={charger} />}
      {creation && (
        <PanneauCreation
          onFermer={() => setCreation(false)}
          onCree={() => {
            setCreation(false);
            charger();
          }}
        />
      )}
    </div>
  );
}

function PanneauFiche({
  fiche, onFermer, onMaj,
}: { fiche: Fiche; onFermer: () => void; onMaj: () => void }) {
  const format = useFormat();
  const c = fiche.collecteur;
  const [provisoire, setProvisoire] = useState<string | null>(null);

  async function reinitialiser() {
    const rep = await api<{ motDePasseProvisoire: string }>(
      `/api/collecteurs/${c.id}/reinitialiser-mot-de-passe`,
      { method: 'POST' },
    );
    setProvisoire(rep.motDePasseProvisoire);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onFermer}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{c.user.nom}</h2>
            <p className="text-sm text-gray-500">
              {c.matricule} · {c.user.telephone}
            </p>
          </div>
          <button onClick={onFermer} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Champ libelle="Statut" valeur={STATUTS[c.statut].libelle} />
          <Champ libelle="Contrat" valeur={c.typeContrat ?? '—'} />
          <Champ libelle="Véhicule" valeur={c.vehicule ?? '—'} />
          <Champ
            libelle="Embauche"
            valeur={c.dateEmbauche ? format.dateCourte(c.dateEmbauche) : '—'}
          />
          <Champ libelle="Adresse" valeur={c.adresse ?? '—'} />
          <Champ
            libelle="Zone"
            valeur={c.quartier ? `${c.quartier.nom}, ${c.quartier.commune.nom}` : '—'}
          />
        </dl>

        <section className="mt-6 rounded-xl border border-gray-200 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Personne à prévenir
          </h3>
          {c.urgenceTelephone ? (
            <p className="mt-2 text-sm text-gray-600">
              {c.urgenceNom} ({c.urgenceLien ?? '—'}) · {c.urgenceTelephone}
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-600">
              Non renseignée. À compléter avant toute tournée.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">
            Activité sur {fiche.cumul.jours} jours
          </h3>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Chiffre libelle="Zones" valeur={String(fiche.cumul.zones)} />
            <Chiffre libelle="Tonnage" valeur={`${fiche.cumul.poidsTotalKg} kg`} />
            <Chiffre libelle="Foyers" valeur={String(fiche.cumul.foyersServis)} />
            <Chiffre
              libelle="Non terminées"
              valeur={String(fiche.cumul.nonTerminees)}
              alerte={fiche.cumul.nonTerminees > 0}
            />
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">Historique</h3>
          <ul className="mt-3 divide-y divide-gray-100">
            {fiche.historique.slice(0, 15).map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-20 text-xs text-gray-500">{format.dateCourte(h.date)}</span>
                <span className="flex-1 truncate text-gray-700">
                  {h.quartier.nom}, {h.quartier.commune.nom}
                </span>
                <span className="text-xs text-gray-500">{h.nbFoyersServis} foyers</span>
                <span className="w-16 text-right font-medium text-gray-900">
                  {h.poidsTotalKg} kg
                </span>
              </li>
            ))}
          </ul>
          {fiche.historique.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">Aucune zone sur la période</p>
          )}
        </section>

        <div className="mt-8 flex gap-3">
          <button
            onClick={reinitialiser}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser le mot de passe
          </button>

          {c.statut !== 'SORTI' && (
            <button
              onClick={async () => {
                if (!confirm(`Sortir ${c.user.nom} de l'effectif ?`)) return;
                try {
                  await api(`/api/collecteurs/${c.id}`, { method: 'DELETE' });
                  onFermer();
                  onMaj();
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Action impossible');
                }
              }}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Sortie d&apos;effectif
            </button>
          )}
        </div>

        {provisoire && (
          <p className="mt-4 rounded-lg bg-primaire-50 p-3 text-sm text-primaire-700">
            Nouveau mot de passe provisoire : <strong>{provisoire}</strong>
            <br />
            <span className="text-xs">
              Envoyé par SMS. Il ne sera plus affiché après fermeture de cette fiche.
            </span>
          </p>
        )}
      </aside>
    </div>
  );
}

function PanneauCreation({ onFermer, onCree }: { onFermer: () => void; onCree: () => void }) {
  const [f, setF] = useState({
    nom: '', telephone: '', adresse: '', pieceIdentite: '',
    urgenceNom: '', urgenceTelephone: '', urgenceLien: '',
    typeContrat: 'CDD', vehicule: '',
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ matricule: string; motDePasseProvisoire: string } | null>(
    null,
  );

  const maj = (cle: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [cle]: e.target.value }));

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const rep = await api<{ matricule: string; motDePasseProvisoire: string }>(
        '/api/collecteurs',
        { method: 'POST', body: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) },
      );
      setResultat(rep);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onFermer}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">Nouveau collecteur</h2>
          <button onClick={onFermer} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {resultat ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-xl bg-primaire-50 p-4">
              <p className="text-sm text-primaire-700">Compte créé.</p>
              <p className="mt-2 text-sm text-gray-700">
                Numéro employé : <strong>{resultat.matricule}</strong>
                <br />
                Mot de passe provisoire : <strong>{resultat.motDePasseProvisoire}</strong>
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Les deux ont été envoyés par SMS. Le mot de passe n&apos;est plus consultable
                après fermeture — notez-le si le réseau SMS est incertain.
              </p>
            </div>
            <button
              onClick={onCree}
              className="w-full rounded-lg bg-primaire-500 py-2.5 text-sm font-semibold text-white hover:bg-primaire-600"
            >
              Terminer
            </button>
          </div>
        ) : (
          <form onSubmit={soumettre} className="mt-6 space-y-4">
            <Saisie libelle="Nom complet" value={f.nom} onChange={maj('nom')} requis />
            <Saisie
              libelle="Téléphone"
              value={f.telephone}
              onChange={maj('telephone')}
              placeholder="+224 6XX XX XX XX"
              requis
            />
            <Saisie libelle="Adresse" value={f.adresse} onChange={maj('adresse')} />
            <Saisie
              libelle="Pièce d'identité"
              value={f.pieceIdentite}
              onChange={maj('pieceIdentite')}
              placeholder="Numéro de CNI"
            />

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Personne à prévenir</p>
              <p className="mt-1 text-xs text-amber-700">
                Métier à risque : chutes, coupures, accidents de circulation. Un numéro
                joignable immédiatement fait partie du minimum.
              </p>
              <div className="mt-3 space-y-3">
                <Saisie libelle="Nom" value={f.urgenceNom} onChange={maj('urgenceNom')} />
                <Saisie
                  libelle="Téléphone"
                  value={f.urgenceTelephone}
                  onChange={maj('urgenceTelephone')}
                />
                <Saisie
                  libelle="Lien"
                  value={f.urgenceLien}
                  onChange={maj('urgenceLien')}
                  placeholder="conjoint, frère, voisin…"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Saisie libelle="Contrat" value={f.typeContrat} onChange={maj('typeContrat')} />
              <Saisie libelle="Véhicule" value={f.vehicule} onChange={maj('vehicule')} />
            </div>

            {erreur && (
              <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={envoi || !f.nom || !f.telephone}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primaire-500 py-2.5 text-sm font-semibold text-white hover:bg-primaire-600 disabled:opacity-50"
            >
              {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le compte
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}

function Champ({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{libelle}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{valeur}</dd>
    </div>
  );
}

function Chiffre({
  libelle, valeur, alerte = false,
}: { libelle: string; valeur: string; alerte?: boolean }) {
  return (
    <div className={`rounded-lg py-3 ${alerte ? 'bg-amber-50' : 'bg-gray-50'}`}>
      <div className={`text-lg font-bold ${alerte ? 'text-amber-600' : 'text-gray-900'}`}>
        {valeur}
      </div>
      <div className="text-[11px] text-gray-500">{libelle}</div>
    </div>
  );
}

function Saisie({
  libelle, requis = false, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { libelle: string; requis?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">
        {libelle}
        {requis && <span className="text-red-500"> *</span>}
      </span>
      <input
        {...props}
        required={requis}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primaire-500"
      />
    </label>
  );
}
