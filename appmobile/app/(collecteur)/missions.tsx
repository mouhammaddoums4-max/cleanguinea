import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Mission } from '../../src/api';
import { useAuth } from '../../src/auth';
import {
  Carte, Chargement, Ecran, Etiquette, PastilleBac, Vide,
} from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';

type Reponse = { missions: Mission[]; resume: { total: number; terminees: number; enCours: number } };

const FILTRES = ['toutes', 'en-cours', 'terminees'] as const;
const LIBELLE_FILTRE = {
  toutes: 'collecteur.toutes',
  'en-cours': 'collecteur.enCours',
  terminees: 'collecteur.terminees',
} as const;

/** Ecrans 1 et 2 de l'application collecteur : tableau de bord et liste des missions. */
export default function Missions() {
  const router = useRouter();
  const { utilisateur } = useAuth();
  const { categorie } = useConfig();
  const { t } = useI18n();
  const format = useFormat();
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]>('toutes');

  const donnees = useQuery({
    queryKey: ['mes-missions'],
    queryFn: () => api<Reponse>('/api/missions/mes-missions'),
    refetchInterval: 60_000,
  });

  const missions = donnees.data?.missions ?? [];
  const filtrees = missions.filter((m) =>
    filtre === 'terminees'
      ? m.statut === 'TERMINEE'
      : filtre === 'en-cours'
        ? ['ACCEPTEE', 'EN_ROUTE', 'ARRIVE', 'EN_ATTENTE'].includes(m.statut)
        : true,
  );

  const prochaine = missions.find((m) => m.statut !== 'TERMINEE' && m.statut !== 'ANNULEE');

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={donnees.isRefetching} onRefresh={() => donnees.refetch()} />
        }
      >
        <View style={styles.enTete}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bonjour}>
              {t('accueil.bonjour')} {utilisateur?.nom.split(' ')[0]} 👋
            </Text>
            <Text style={styles.petit}>{format.dateLongue(new Date())}</Text>
          </View>
          <Ionicons name="notifications-outline" size={24} color={colors.texte} />
        </View>

        {donnees.isLoading ? (
          <Chargement texte={t('commun.chargement')} />
        ) : (
          <>
            {/* Compteurs du jour */}
            <View style={styles.compteurs}>
              {[
                { libelle: t('collecteur.missions'), valeur: donnees.data?.resume.total ?? 0, teinte: colors.texte },
                { libelle: t('collecteur.terminees'), valeur: donnees.data?.resume.terminees ?? 0, teinte: colors.primary },
                { libelle: t('collecteur.enCours'), valeur: donnees.data?.resume.enCours ?? 0, teinte: colors.alerte },
              ].map((c) => (
                <Carte key={c.libelle} style={styles.compteur}>
                  <Text style={[styles.compteurValeur, { color: c.teinte }]}>{c.valeur}</Text>
                  <Text style={styles.petit}>{c.libelle}</Text>
                </Carte>
              ))}
            </View>

            {/* Prochaine mission */}
            {!!prochaine && (
              <Carte onPress={() => router.push(`/(collecteur)/mission/${prochaine.id}`)}>
                <Text style={styles.libelle}>{t('collecteur.prochaineMission')}</Text>
                <View style={styles.ligneMission}>
                  <Text style={styles.heure}>{format.heure(prochaine.datePlanifiee)}</Text>
                  <Text style={styles.clientNom}>{prochaine.client.user.nom}</Text>
                </View>
                <Text style={styles.petit}>
                  {prochaine.client.quartier.commune.nom}, {prochaine.client.adresse}
                </Text>
                <View style={styles.bacsLigne}>
                  {prochaine.bacs.map(({ bac }) => {
                    const c = categorie(bac.categorie);
                    return (
                      <Etiquette
                        key={bac.id}
                        texte={`${c.libelle} (${t('bacs.bac')} ${bac.numero})`}
                        teinte={c.couleur}
                        fond={c.couleurFond}
                      />
                    );
                  })}
                </View>
              </Carte>
            )}

            {/* Filtres */}
            <View style={styles.filtres}>
              {FILTRES.map((f) => {
                const nb =
                  f === 'toutes'
                    ? missions.length
                    : f === 'terminees'
                      ? missions.filter((m) => m.statut === 'TERMINEE').length
                      : missions.filter((m) =>
                          ['ACCEPTEE', 'EN_ROUTE', 'ARRIVE', 'EN_ATTENTE'].includes(m.statut),
                        ).length;
                const actif = filtre === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFiltre(f)}
                    style={[styles.filtre, actif && styles.filtreActif]}
                  >
                    <Text style={[styles.filtreTexte, actif && styles.filtreTexteActif]}>
                      {t(LIBELLE_FILTRE[f])} ({nb})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Liste */}
            {filtrees.length === 0 ? (
              <Vide
                titre={t('collecteur.aucuneMission')}
                message={t('collecteur.aucuneMissionDetail')}
              />
            ) : (
              <View style={{ gap: espacement.sm }}>
                {filtrees.map((m) => (
                  <Carte
                    key={m.id}
                    onPress={() => router.push(`/(collecteur)/mission/${m.id}`)}
                    style={styles.carteMission}
                  >
                    <Text style={styles.heurePetite}>{format.heure(m.datePlanifiee)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientNom}>{m.client.user.nom}</Text>
                      <Text style={styles.petit}>
                        {m.client.quartier.commune.nom}, {m.client.quartier.nom}
                      </Text>
                      <View style={styles.bacsLigne}>
                        {m.bacs.map(({ bac }) => {
                          const c = categorie(bac.categorie);
                          return (
                            <PastilleBac
                              key={bac.id}
                              couleur={c.couleur}
                              couleurFond={c.couleurFond}
                              icone={c.icone}
                              taille={22}
                            />
                          );
                        })}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.texteTertiaire} />
                  </Carte>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: espacement.lg, gap: espacement.lg, paddingBottom: espacement.xxl },
  enTete: { flexDirection: 'row', alignItems: 'center' },
  bonjour: { fontSize: 20, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },

  compteurs: { flexDirection: 'row', gap: espacement.sm },
  compteur: { flex: 1, alignItems: 'center', paddingVertical: espacement.md },
  compteurValeur: { fontSize: 24, fontWeight: '800' },

  libelle: { fontSize: 12, color: colors.texteSecondaire, marginBottom: espacement.sm },
  ligneMission: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  heure: { fontSize: 16, fontWeight: '800', color: colors.primary },
  heurePetite: { fontSize: 13, fontWeight: '700', color: colors.primary, width: 46 },
  clientNom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  bacsLigne: { flexDirection: 'row', gap: 6, marginTop: espacement.sm, flexWrap: 'wrap' },

  filtres: { flexDirection: 'row', gap: espacement.sm },
  filtre: {
    paddingHorizontal: espacement.md,
    paddingVertical: 7,
    borderRadius: rayon.plein,
    backgroundColor: colors.surfaceAlt,
  },
  filtreActif: { backgroundColor: colors.primary },
  filtreTexte: { fontSize: 12, fontWeight: '600', color: colors.texteSecondaire },
  filtreTexteActif: { color: colors.blanc },

  carteMission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
});
