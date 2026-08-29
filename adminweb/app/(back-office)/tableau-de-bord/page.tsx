'use client';

import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CreditCard, DollarSign, Trash2, Truck, Users,
} from 'lucide-react';

import {
  api, categorie, dateCourte, gnf, heure, nombre,
  type Alerte, type CollecteEnCours, type Dashboard, type MissionsDuJour,
  type PointCourbe, type Repartition, type Stock, type Zone,
} from '@/lib/api';

type Tout = {
  dashboard: Dashboard;
  courbe: PointCourbe[];
  repartition: Repartition;
  zones: Zone[];
  missions: MissionsDuJour;
  collectes: CollecteEnCours[];
  stock: Stock[];
  alertes: Alerte[];
};

export default function TableauDeBord() {
  const [d, setD] = useState<Tout | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Dashboard>('/api/dashboard'),
      api<PointCourbe[]>('/api/dashboard/collectes-par-jour'),
      api<Repartition>('/api/dashboard/repartition-dechets'),
      api<Zone[]>('/api/dashboard/top-zones'),
      api<MissionsDuJour>('/api/dashboard/missions-du-jour'),
      api<CollecteEnCours[]>('/api/dashboard/collectes-en-cours'),
      api<Stock[]>('/api/tri/stock'),
      api<Alerte[]>('/api/dashboard/alertes'),
    ])
      .then(([dashboard, courbe, repartition, zones, missions, collectes, stock, alertes]) =>
        setD({ dashboard, courbe, repartition, zones, missions, collectes, stock, alertes }),
      )
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Chargement impossible'));
  }, []);

  if (erreur) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {erreur}
      </div>
    );
  }

  if (!d) {
    return <div className="py-20 text-center text-sm text-gray-500">Chargement…</div>;
  }

  const c = d.dashboard.cartes;
  const f = d.dashboard.resumeFinancier;
  const maxZone = Math.max(...d.zones.map((z) => z.tonnes), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500">Vue d&apos;ensemble de votre activité</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          {dateCourte(d.dashboard.periode.debut)} — {dateCourte(d.dashboard.periode.fin)}
        </div>
      </div>

      {/* Cartes principales */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CarteKpi
          icone={<Users className="h-5 w-5" />}
          teinte="bg-blue-50 text-blue-600"
          libelle="Clients actifs"
          valeur={nombre(c.clientsActifs.valeur)}
          evolution={c.clientsActifs.evolution}
        />
        <CarteKpi
          icone={<CreditCard className="h-5 w-5" />}
          teinte="bg-violet-50 text-violet-600"
          libelle="Abonnements actifs"
          valeur={nombre(c.abonnementsActifs.valeur)}
          evolution={c.abonnementsActifs.evolution}
        />
        <CarteKpi
          icone={<Truck className="h-5 w-5" />}
          teinte="bg-indigo-50 text-indigo-600"
          libelle="Collectes réalisées"
          valeur={nombre(c.collectesRealisees.valeur)}
          evolution={c.collectesRealisees.evolution}
        />
        <CarteKpi
          icone={<Trash2 className="h-5 w-5" />}
          teinte="bg-amber-50 text-amber-600"
          libelle="Déchets collectés"
          valeur={`${c.dechetsCollectesTonnes.valeur} t`}
          evolution={c.dechetsCollectesTonnes.evolution}
        />
        <CarteKpi
          icone={<DollarSign className="h-5 w-5" />}
          teinte="bg-primaire-100 text-primaire-600"
          libelle="Chiffre d'affaires"
          valeur={gnf(c.chiffreAffairesGnf.valeur)}
          evolution={c.chiffreAffairesGnf.evolution}
        />
      </div>

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Collectes sur la période" className="lg:col-span-1">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.courbe} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="degradeVert" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={dateCourte}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  labelFormatter={(v) => dateCourte(String(v))}
                  formatter={(v) => [`${v} collectes`, '']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="collectes"
                  stroke="#16A34A"
                  strokeWidth={2}
                  fill="url(#degradeVert)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Bloc>

        <Bloc titre="Répartition des déchets collectés">
          <div className="flex items-center gap-4">
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.repartition.categories}
                    dataKey="tonnes"
                    nameKey="categorie"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {d.repartition.categories.map((entree) => (
                      <Cell key={entree.categorie} fill={categorie(entree.categorie).couleur} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [`${v} t`, categorie(String(n)).libelle]}
                    contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">
                  {d.repartition.totalTonnes}
                </span>
                <span className="text-[11px] text-gray-500">Tonnes</span>
              </div>
            </div>

            <ul className="flex-1 space-y-2">
              {d.repartition.categories.map((entree) => {
                const meta = categorie(entree.categorie);
                return (
                  <li key={entree.categorie} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.couleur }}
                    />
                    <span className="flex-1 truncate text-gray-600">{meta.libelle}</span>
                    <span className="font-semibold text-gray-900">{entree.tonnes} t</span>
                    <span className="w-12 text-right text-xs text-gray-400">
                      {entree.pourcentage}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Bloc>

        <Bloc titre="Top 5 des zones" sousTitre="Par quantité collectée">
          <ol className="space-y-3">
            {d.zones.map((z, i) => (
              <li key={z.zone} className="flex items-center gap-3 text-sm">
                <span className="w-4 text-gray-400">{i + 1}</span>
                <span className="w-20 shrink-0 font-medium text-gray-700">{z.zone}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className="block h-full rounded-full bg-primaire-500"
                    style={{ width: `${(z.tonnes / maxZone) * 100}%` }}
                  />
                </span>
                <span className="w-14 text-right font-semibold text-gray-900">{z.tonnes} t</span>
              </li>
            ))}
          </ol>
        </Bloc>
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Collectes en cours" className="lg:col-span-1">
          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Mission</th>
                  <th className="pb-2 pr-3 font-medium">Client</th>
                  <th className="pb-2 pr-3 font-medium">Zone</th>
                  <th className="pb-2 pr-3 font-medium">Bac(s)</th>
                  <th className="pb-2 pr-3 font-medium">Collecteur</th>
                  <th className="pb-2 pr-3 font-medium">Heure</th>
                  <th className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {d.collectes.slice(0, 6).map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{m.reference}</td>
                    <td className="py-2.5 pr-3 text-gray-700">{m.client}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{m.zone}</td>
                    <td className="py-2.5 pr-3">
                      <span className="flex gap-1">
                        {m.bacs.map((b) => (
                          <span
                            key={b.numero}
                            title={categorie(b.categorie).libelle}
                            className="h-4 w-4 rounded"
                            style={{ backgroundColor: categorie(b.categorie).couleur }}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-700">{m.collecteur ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-500">{heure(m.heurePlanifiee)}</td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-primaire-100 px-2 py-0.5 text-xs font-medium text-primaire-700">
                        {libelleStatut(m.statut)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.collectes.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">Aucune collecte en cours</p>
            )}
          </div>
        </Bloc>

        <Bloc titre="Stock par catégorie" sousTitre="Quantité en stock">
          <ul className="space-y-3">
            {d.stock.map((s) => {
              const meta = categorie(s.categorie);
              return (
                <li key={s.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: meta.couleur }}
                    />
                    <span className="flex-1 text-gray-600">{meta.libelle}</span>
                    <span className="font-semibold text-gray-900">{s.tonnes} t</span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(s.tauxRemplissage, 100)}%`,
                        backgroundColor: meta.couleur,
                      }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </Bloc>

        <Bloc titre="Alertes & notifications">
          <ul className="space-y-3">
            {d.alertes.slice(0, 5).map((a) => (
              <li key={a.id} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    a.niveau === 'CRITIQUE'
                      ? 'bg-red-50 text-red-600'
                      : a.niveau === 'ATTENTION'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{a.titre}</div>
                  <div className="truncate text-xs text-gray-500">{a.message}</div>
                </div>
              </li>
            ))}
          </ul>
        </Bloc>
      </div>

      {/* Bas de page */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Résumé financier" sousTitre="Sur la période sélectionnée" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-4">
            <Chiffre libelle="Revenus abonnements" valeur={gnf(f.revenusAbonnements)} />
            <Chiffre libelle="Revenus recyclage" valeur={gnf(f.revenusRecyclage)} />
            <Chiffre libelle="Dépenses" valeur={gnf(f.depenses)} />
            <Chiffre libelle="Bénéfice net" valeur={gnf(f.beneficeNet)} accent />
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Les dépenses sont estimées à 26 % du chiffre d&apos;affaires tant que la
            comptabilité analytique n&apos;est pas branchée.
          </p>
        </Bloc>

        <Bloc titre="Missions aujourd'hui">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { libelle: 'Total', valeur: d.missions.total, classe: 'text-gray-900' },
              { libelle: 'En cours', valeur: d.missions.enCours, classe: 'text-blue-600' },
              { libelle: 'Terminées', valeur: d.missions.terminees, classe: 'text-primaire-600' },
              { libelle: 'Annulées', valeur: d.missions.annulees, classe: 'text-red-600' },
            ].map((m) => (
              <div key={m.libelle} className="rounded-lg bg-gray-50 py-3">
                <div className={`text-xl font-bold ${m.classe}`}>{m.valeur}</div>
                <div className="text-[11px] text-gray-500">{m.libelle}</div>
              </div>
            ))}
          </div>
        </Bloc>
      </div>
    </div>
  );
}

function CarteKpi({
  icone, teinte, libelle, valeur, evolution,
}: {
  icone: React.ReactNode;
  teinte: string;
  libelle: string;
  valeur: string;
  evolution: number | null;
}) {
  const positive = (evolution ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${teinte}`}>
          {icone}
        </span>
        <div className="min-w-0">
          <div className="text-xs text-gray-500">{libelle}</div>
          <div className="truncate text-xl font-bold text-gray-900">{valeur}</div>
        </div>
      </div>
      {evolution !== null && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {positive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-primaire-500" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className={positive ? 'font-medium text-primaire-600' : 'font-medium text-red-600'}>
            {Math.abs(evolution)} %
          </span>
          <span className="text-gray-400">vs période précédente</span>
        </div>
      )}
    </div>
  );
}

function Bloc({
  titre, sousTitre, children, className = '',
}: {
  titre: string;
  sousTitre?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{titre}</h2>
        {sousTitre && <p className="text-xs text-gray-500">{sousTitre}</p>}
      </header>
      {children}
    </section>
  );
}

function Chiffre({
  libelle, valeur, accent = false,
}: { libelle: string; valeur: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${accent ? 'bg-primaire-50' : 'bg-gray-50'}`}>
      <div className="text-xs text-gray-500">{libelle}</div>
      <div
        className={`mt-1 text-base font-bold ${accent ? 'text-primaire-600' : 'text-gray-900'}`}
      >
        {valeur}
      </div>
    </div>
  );
}

function libelleStatut(statut: string) {
  return (
    {
      EN_ATTENTE: 'En attente',
      ACCEPTEE: 'Acceptée',
      EN_ROUTE: 'En route',
      ARRIVE: 'Arrivé',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
      MANQUEE: 'Manquée',
    }[statut] ?? statut
  );
}
