'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Plus, Scale, Trash2, X } from 'lucide-react';

import { api } from '@/lib/api';
import { useConfig } from '@/lib/config';

/**
 * Réception et pesée à l'entrepôt.
 *
 * C'est ici que les points Clean sont crédités. Le collecteur ne pèse plus rien
 * sur le terrain : les trieurs pèsent chaque bac catégorie par catégorie, et le
 * code QR du bac dit à qui attribuer le poids.
 *
 * L'écran est conçu pour une saisie répétitive au clavier, debout devant une
 * balance : on scanne ou on tape le code, le poids, on valide, la ligne
 * s'ajoute et le champ du code reprend le focus. Le lot ne part qu'une fois,
 * à la fin.
 */

type Ligne = {
  codeQr: string;
  categorie: string;
  poidsKg: number;
  contaminationPct?: number;
};

type Resultat = {
  statut: 'OK' | 'ERREUR';
  codeQr: string;
  client?: string | null;
  categorie?: string;
  poidsKg?: number;
  declassee?: boolean;
  points?: number;
  motifNonCredit?: string | null;
  erreur?: string;
};

type Reponse = {
  resultats: Resultat[];
  resume: {
    total: number;
    enregistrees: number;
    enErreur: number;
    poidsTotalKg: number;
    pointsCredites: number;
    plafondAtteint: number;
    sansClient: number;
  };
};

const CATEGORIES = [
  'PLASTIQUE', 'METAL_FER', 'CARTON', 'VERRE', 'ORGANIQUE', 'AUTRES', 'REFUS',
];

const MOTIFS: Record<string, string> = {
  PLAFOND_MENSUEL: 'Plafond mensuel atteint',
  BAC_SANS_CLIENT: 'Bac non attribué',
};

export default function Dechets() {
  const { categorie } = useConfig();

  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [codeQr, setCodeQr] = useState('');
  const [cat, setCat] = useState('PLASTIQUE');
  const [poids, setPoids] = useState('');
  const [contamination, setContamination] = useState('');

  const [envoi, setEnvoi] = useState(false);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Le champ du code reprend le focus après chaque ajout : la main revient à la
  // douchette ou au clavier sans passer par la souris.
  useEffect(() => {
    document.getElementById('champ-code')?.focus();
  }, [lignes.length]);

  function ajouter() {
    const kg = Number(poids.replace(',', '.'));
    if (!codeQr.trim() || !Number.isFinite(kg) || kg <= 0) return;

    const contam = contamination.trim() === '' ? undefined : Number(contamination);

    setLignes((l) => [
      ...l,
      {
        codeQr: codeQr.trim().toUpperCase(),
        categorie: cat,
        poidsKg: kg,
        contaminationPct: Number.isFinite(contam as number) ? contam : undefined,
      },
    ]);
    setCodeQr('');
    setPoids('');
    setContamination('');
    setReponse(null);
  }

  async function envoyer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api<Reponse>('/api/tri/pesees', {
        method: 'POST',
        body: { pesees: lignes },
      });
      setReponse(r);
      // Seules les lignes en erreur restent, pour être corrigées et renvoyées.
      const enErreur = new Set(
        r.resultats.filter((x) => x.statut === 'ERREUR').map((x) => x.codeQr),
      );
      setLignes((l) => l.filter((x) => enErreur.has(x.codeQr)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setEnvoi(false);
    }
  }

  const poidsTotal = lignes.reduce((s, l) => s + l.poidsKg, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Réception & pesée</h1>
        <p className="text-sm text-gray-500">
          Les points Clean sont crédités à partir de ces pesées.
        </p>
      </div>

      {/* --- Saisie ---------------------------------------------------------- */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-medium text-gray-500">Code QR du bac</label>
            <input
              id="champ-code"
              value={codeQr}
              onChange={(e) => setCodeQr(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('champ-poids')?.focus()}
              placeholder="CG-2026-000001-B1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:border-primaire-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">Catégorie</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primaire-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categorie(c).libelle}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Poids (kg)</label>
            <input
              id="champ-poids"
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ajouter()}
              inputMode="decimal"
              placeholder="12,5"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primaire-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Contamination&nbsp;%
            </label>
            <input
              value={contamination}
              onChange={(e) => setContamination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ajouter()}
              inputMode="numeric"
              placeholder="—"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primaire-500"
            />
          </div>

          <div className="flex items-end sm:col-span-1">
            <button
              onClick={ajouter}
              disabled={!codeQr.trim() || !poids.trim()}
              className="flex h-[38px] w-full items-center justify-center rounded-lg bg-primaire-600 text-white transition hover:bg-primaire-700 disabled:opacity-40"
              title="Ajouter la ligne"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Au-delà de 15 % de contamination, le lot est déclassé et ne rapporte qu&apos;une
          fraction des points. Laissez le champ vide si le tri est conforme.
        </p>
      </section>

      {/* --- Lot en cours ---------------------------------------------------- */}
      {lignes.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Lot en cours — {lignes.length} pesée{lignes.length > 1 ? 's' : ''}
            </h2>
            <span className="text-sm font-semibold text-gray-900">
              {poidsTotal.toFixed(1)} kg
            </span>
          </div>

          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Code QR</th>
                  <th className="pb-2 pr-3 font-medium">Catégorie</th>
                  <th className="pb-2 pr-3 font-medium">Poids</th>
                  <th className="pb-2 pr-3 font-medium">Contamination</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.map((l, i) => {
                  const meta = categorie(l.categorie);
                  return (
                    <tr key={`${l.codeQr}-${i}`}>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-900">{l.codeQr}</td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: meta.couleur }}
                          />
                          <span className="text-gray-700">{meta.libelle}</span>
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{l.poidsKg} kg</td>
                      <td className="py-2 pr-3">
                        {l.contaminationPct == null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span
                            className={
                              l.contaminationPct > 15
                                ? 'font-medium text-amber-700'
                                : 'text-gray-600'
                            }
                          >
                            {l.contaminationPct} %
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setLignes((x) => x.filter((_, j) => j !== i))}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Retirer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!!erreur && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreur}</p>
          )}

          <button
            onClick={envoyer}
            disabled={envoi}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primaire-600 py-2.5 text-sm font-medium text-white transition hover:bg-primaire-700 disabled:opacity-50"
          >
            <Scale className="h-4 w-4" />
            {envoi ? 'Enregistrement…' : `Enregistrer et créditer (${poidsTotal.toFixed(1)} kg)`}
          </button>
        </section>
      )}

      {/* --- Résultat -------------------------------------------------------- */}
      {reponse && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Résultat du lot</h2>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Chiffre libelle="Pesées" valeur={String(reponse.resume.enregistrees)} />
            <Chiffre libelle="Poids total" valeur={`${reponse.resume.poidsTotalKg} kg`} />
            <Chiffre
              libelle="Points crédités"
              valeur={reponse.resume.pointsCredites.toLocaleString('fr-FR')}
              teinte="text-primaire-700"
            />
            <Chiffre
              libelle="En erreur"
              valeur={String(reponse.resume.enErreur)}
              teinte={reponse.resume.enErreur > 0 ? 'text-red-600' : undefined}
            />
          </div>

          {/* Un plafond atteint en nombre signale soit une fraude, soit un
              plafond mal réglé. Dans les deux cas il faut le voir. */}
          {reponse.resume.plafondAtteint > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {reponse.resume.plafondAtteint} pesée
                {reponse.resume.plafondAtteint > 1 ? 's ont' : ' a'} dépassé le plafond mensuel :
                le poids est enregistré mais aucun point n&apos;a été crédité. Si cela se répète,
                vérifiez s&apos;il s&apos;agit d&apos;un apport groupé ou d&apos;un plafond trop bas.
              </span>
            </p>
          )}

          <ul className="mt-4 space-y-1.5">
            {reponse.resultats.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                {r.statut === 'OK' ? (
                  <Check className="h-4 w-4 shrink-0 text-primaire-600" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span className="font-mono text-xs text-gray-500">{r.codeQr}</span>
                {r.statut === 'OK' ? (
                  <>
                    <span className="text-gray-700">{r.client ?? 'bac non attribué'}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{r.poidsKg} kg</span>
                    {r.declassee && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                        déclassé
                      </span>
                    )}
                    <span className="ml-auto font-medium text-gray-900">
                      {r.points ? `+${r.points} pts` : (MOTIFS[r.motifNonCredit ?? ''] ?? '0 pt')}
                    </span>
                  </>
                ) : (
                  <span className="text-red-600">{r.erreur}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lignes.length === 0 && !reponse && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Scale className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">Aucune pesée en cours</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
            Scannez le code QR d&apos;un bac, saisissez son poids, et ajoutez-le au lot.
          </p>
        </div>
      )}
    </div>
  );
}

function Chiffre({
  libelle, valeur, teinte = 'text-gray-900',
}: { libelle: string; valeur: string; teinte?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{libelle}</p>
      <p className={`mt-0.5 text-lg font-semibold ${teinte}`}>{valeur}</p>
    </div>
  );
}
