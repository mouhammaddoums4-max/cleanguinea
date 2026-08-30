'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, CheckCheck, MessageSquare, RotateCcw, Search, Send } from 'lucide-react';

import { api, type Conversation, type PageConversations } from '@/lib/api';
import { useConfig, useFormat } from '@/lib/config';

const MOTIFS = ['INCIDENT_COLLECTE', 'BAC', 'FACTURATION', 'ABONNEMENT', 'RECLAMATION', 'AUTRE'];
const STATUTS = ['OUVERTE', 'REPONDUE', 'RESOLUE'];

/**
 * Espace support.
 *
 * Deux colonnes : la file d'attente à gauche, le fil ouvert à droite. Un agent
 * traite des demandes à la chaîne — le faire revenir à une liste après chaque
 * réponse lui coûterait un clic et le contexte de ce qu'il vient de lire.
 */
export default function Support() {
  const { t, statut } = useConfig();
  const format = useFormat();

  const [recherche, setRecherche] = useState('');
  const [rechercheAppliquee, setRechercheAppliquee] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [filtreMotif, setFiltreMotif] = useState('');

  const [liste, setListe] = useState<PageConversations | null>(null);
  const [ouverte, setOuverte] = useState<Conversation | null>(null);
  const [reponse, setReponse] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const filRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const minuteur = setTimeout(() => setRechercheAppliquee(recherche.trim()), 300);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  const charger = useCallback(async () => {
    const params = new URLSearchParams({ parPage: '50' });
    if (rechercheAppliquee) params.set('recherche', rechercheAppliquee);
    if (filtreStatut) params.set('statut', filtreStatut);
    if (filtreMotif) params.set('motif', filtreMotif);

    try {
      setListe(await api<PageConversations>('/api/support/conversations?' + params.toString()));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
    }
  }, [rechercheAppliquee, filtreStatut, filtreMotif]);

  useEffect(() => {
    charger();
    // Un agent laisse cette page ouverte : les nouvelles demandes doivent
    // arriver d'elles-mêmes, sans qu'il pense à rafraîchir.
    const minuteur = setInterval(charger, 30_000);
    return () => clearInterval(minuteur);
  }, [charger]);

  // Le dernier message doit être visible dès l'ouverture du fil.
  useEffect(() => {
    if (filRef.current) filRef.current.scrollTop = filRef.current.scrollHeight;
  }, [ouverte?.id, ouverte?.messages.length]);

  async function ouvrir(id: string) {
    try {
      setOuverte(await api<Conversation>(`/api/support/conversations/${id}`));
      charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function envoyer(resoudre = false) {
    if (!ouverte || (!reponse.trim() && !resoudre)) return;
    setEnvoi(true);
    try {
      const misAJour = await api<Conversation>(
        `/api/support/conversations/${ouverte.id}/messages`,
        { method: 'POST', body: { texte: reponse.trim(), resoudre } },
      );
      setOuverte(misAJour);
      setReponse('');
      charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setEnvoi(false);
    }
  }

  async function changerStatut(nouveau: string) {
    if (!ouverte) return;
    const misAJour = await api<Conversation>(`/api/support/conversations/${ouverte.id}`, {
      method: 'PATCH',
      body: { statut: nouveau },
    });
    setOuverte(misAJour);
    charger();
  }

  const teintes: Record<string, string> = {
    OUVERTE: 'bg-amber-50 text-amber-600',
    REPONDUE: 'bg-blue-50 text-blue-600',
    RESOLUE: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('support')}</h1>
          <p className="text-sm text-gray-500">{t('supportSousTitre')}</p>
        </div>
        {liste && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{format.nombre(liste.aTraiter)}</span>{' '}
            {t('aTraiter')}
          </div>
        )}
      </div>

      {erreur && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {erreur}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {/* File d'attente */}
        <section className="flex max-h-[70vh] flex-col rounded-xl border border-gray-200 bg-white">
          <div className="space-y-2 border-b border-gray-200 p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder={t('rechercherMessage')}
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primaire-500"
              />
            </label>

            <div className="flex gap-2">
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-primaire-500"
              >
                <option value="">{t('tousStatuts')}</option>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>
                    {statut(s)}
                  </option>
                ))}
              </select>

              <select
                value={filtreMotif}
                onChange={(e) => setFiltreMotif(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-primaire-500"
              >
                <option value="">{t('tousMotifs')}</option>
                {MOTIFS.map((m) => (
                  <option key={m} value={m}>
                    {statut(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {liste?.conversations.length === 0 && (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-700">{t('aucuneConversation')}</p>
                <p className="mt-1 text-xs text-gray-500">{t('aucuneConversationDetail')}</p>
              </div>
            )}

            <ul className="divide-y divide-gray-100">
              {liste?.conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => ouvrir(c.id)}
                    className={`w-full px-3 py-3 text-left transition hover:bg-gray-50 ${
                      ouverte?.id === c.id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-gray-900">
                        {c.reference}
                      </span>
                      <span
                        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${teintes[c.statut]}`}
                      >
                        {statut(c.statut)}
                      </span>
                      {c.nonLusSupport > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primaire-500 px-1 text-[10px] font-bold text-white">
                          {c.nonLusSupport}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {c.client?.nom ?? '—'}
                      </span>
                      {c.client?.type === 'ENTREPRISE' && (
                        <Building2 className="h-3 w-3 shrink-0 text-gray-400" />
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-gray-500">{c.sujet}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {statut(c.motif)} · {format.dateCourte(c.dernierMessageLe)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Fil ouvert */}
        <section className="flex max-h-[70vh] flex-col rounded-xl border border-gray-200 bg-white">
          {!ouverte ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <p className="text-sm text-gray-500">{t('choisirConversation')}</p>
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-bold text-gray-900">{ouverte.sujet}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${teintes[ouverte.statut]}`}
                    >
                      {statut(ouverte.statut)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {ouverte.reference} · {statut(ouverte.motif)} ·{' '}
                    {ouverte.client?.nom ?? '—'} · {ouverte.client?.telephone ?? ''}
                    {ouverte.client?.commune ? ` · ${ouverte.client.commune}` : ''}
                  </p>
                </div>

                {ouverte.statut === 'RESOLUE' ? (
                  <button
                    onClick={() => changerStatut('OUVERTE')}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('rouvrir')}
                  </button>
                ) : (
                  <button
                    onClick={() => changerStatut('RESOLUE')}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t('marquerResolu')}
                  </button>
                )}
              </header>

              <div ref={filRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {ouverte.messages.map((m) => {
                  const duSupport = m.emetteur === 'SUPPORT';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${duSupport ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 ${
                          duSupport
                            ? 'bg-primaire-500 text-white'
                            : 'border border-gray-200 bg-gray-50 text-gray-900'
                        }`}
                      >
                        {!duSupport && ouverte.client && (
                          <p className="mb-1 text-[11px] font-semibold text-gray-500">
                            {ouverte.client.nom}
                          </p>
                        )}

                        {m.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a href={m.photoUrl} target="_blank" rel="noreferrer">
                            <img
                              src={m.photoUrl}
                              alt=""
                              className="mb-2 max-h-56 rounded-lg object-cover"
                            />
                          </a>
                        )}

                        <p className="whitespace-pre-wrap text-sm">{m.texte}</p>
                        <p
                          className={`mt-1 text-[10px] ${duSupport ? 'text-white/70' : 'text-gray-400'}`}
                        >
                          {format.dateCourte(m.createdAt)} · {format.heure(m.createdAt)}
                          {duSupport && m.auteur ? ` · ${m.auteur}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value)}
                    onKeyDown={(e) => {
                      // Entrée envoie, Maj+Entrée passe à la ligne : un agent
                      // qui répond toute la journée ne doit pas viser un bouton.
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        envoyer();
                      }
                    }}
                    rows={2}
                    placeholder={t('repondre')}
                    className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primaire-500"
                  />
                  <button
                    onClick={() => envoyer()}
                    disabled={!reponse.trim() || envoi}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primaire-500 text-white transition hover:bg-primaire-600 disabled:opacity-40"
                    aria-label={t('envoyer')}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                {/* Répondre et clore en un seul geste : c'est le cas le plus
                    fréquent, une question à laquelle on a répondu. */}
                <button
                  onClick={() => envoyer(true)}
                  disabled={!reponse.trim() || envoi}
                  className="mt-2 text-xs font-medium text-gray-500 transition hover:text-gray-900 disabled:opacity-40"
                >
                  {t('envoyer')} + {t('marquerResolu').toLowerCase()}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
