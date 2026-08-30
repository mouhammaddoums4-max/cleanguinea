import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type TableauBordCollecteur, type Zone, type ResumeZones } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useI18n, useFormat } from '../../src/i18n';
import { Bouton, Carte, Chargement, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useResponsive } from '../../src/responsive';

/** Tableau de bord du collecteur : ce qu'il a fait aujourd'hui, cette semaine, ce mois. */
export default function TableauDeBordCollecteur() {
  const router = useRouter();
  const { utilisateur } = useAuth();
  const { t } = useI18n();
  const r = useResponsive();
  const format = useFormat();

  const tdb = useQuery({
    queryKey: ['tableau-de-bord-collecteur'],
    queryFn: () => api<TableauBordCollecteur>('/api/tournees/collecteur/tableau-de-bord'),
  });

  const zones = useQuery({
    queryKey: ['mes-zones'],
    queryFn: () => api<{ zones: Zone[]; resume: ResumeZones }>('/api/tournees/mes-zones'),
  });

  const prochaine = zones.data?.zones.find((z) => z.statut !== 'TERMINEE');

  return (
    <Ecran>
      <EnTete
        titre={t('onglets.tableauDeBord')}
        sousTitre={`${utilisateur?.nom} · ${utilisateur?.identifiant ?? ''}`}
      />
      <ScrollView
        contentContainerStyle={[styles.contenu, r.contenu]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={tdb.isRefetching}
            onRefresh={() => {
              tdb.refetch();
              zones.refetch();
            }}
          />
        }
      >
        {tdb.isLoading ? (
          <Chargement texte={t('commun.chargement')} />
        ) : (
          <>
            {/* Aujourd'hui, mis en avant */}
            <Carte style={styles.carteVerte}>
              <Text style={styles.libelleClair}>{t('tdb.aujourdhui')}</Text>
              <Text style={styles.grandChiffre}>{tdb.data?.jour.poidsKg ?? 0} kg</Text>
              <Text style={styles.libelleClair}>
                {tdb.data?.jour.zones ?? 0} {t('tdb.zones')} · {tdb.data?.jour.foyers ?? 0}{' '}
                {t('zones.foyersServis')}
              </Text>

              {!!tdb.data?.zonesRestantes && (
                <View style={styles.rappel}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.blanc} />
                  <Text style={styles.rappelTexte}>
                    {t('tdb.zonesRestantes', { n: tdb.data.zonesRestantes })}
                  </Text>
                </View>
              )}
            </Carte>

            {/* Prochaine zone */}
            {!!prochaine && (
              <Carte onPress={() => router.push(`/(collecteur)/zone/${prochaine.id}`)}>
                <Text style={styles.libelle}>{t('tdb.prochaineZone')}</Text>
                <View style={styles.ligneProchaine}>
                  <View style={styles.icone}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.zoneNom}>{prochaine.zone}</Text>
                    <Text style={styles.petit}>
                      {prochaine.commune} · {prochaine.nbFoyers} {t('zones.foyers')}
                      {prochaine.heureDebutPrevue
                        ? ` · ${format.heure(prochaine.heureDebutPrevue)}`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.texteTertiaire} />
                </View>
              </Carte>
            )}

            {/* Semaine et mois */}
            <View style={styles.periodes}>
              <Periode
                titre={t('tdb.cetteSemaine')}
                zones={tdb.data?.semaine.zones ?? 0}
                poids={tdb.data?.semaine.poidsKg ?? 0}
                foyers={tdb.data?.semaine.foyers ?? 0}
                libelles={{ zones: t('tdb.zones'), foyers: t('zones.foyersServis') }}
              />
              <Periode
                titre={t('tdb.ceMois')}
                zones={tdb.data?.mois.zones ?? 0}
                poids={tdb.data?.mois.poidsKg ?? 0}
                foyers={tdb.data?.mois.foyers ?? 0}
                libelles={{ zones: t('tdb.zones'), foyers: t('zones.foyersServis') }}
              />
            </View>

            {/* Évaluation */}
            {tdb.data?.note != null && (
              <Carte style={styles.ligneNote}>
                <View style={styles.icone}>
                  <Ionicons name="star" size={20} color={colors.alerte} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.zoneNom}>{tdb.data.note.toFixed(1)} / 5</Text>
                  <Text style={styles.petit}>
                    {tdb.data.nbEvaluations} {t('collecteur.evaluations').toLowerCase()}
                  </Text>
                </View>
              </Carte>
            )}

            <Bouton
              titre={t('tdb.voirMesZones')}
              icone="map-outline"
              onPress={() => router.push('/(collecteur)/zones')}
            />
          </>
        )}
      </ScrollView>
    </Ecran>
  );
}

function Periode({
  titre, zones, poids, foyers, libelles,
}: {
  titre: string;
  zones: number;
  poids: number;
  foyers: number;
  libelles: { zones: string; foyers: string };
}) {
  return (
    <Carte style={{ flex: 1, gap: 6 }}>
      <Text style={styles.libelle}>{titre}</Text>
      <Text style={styles.chiffrePeriode}>{poids} kg</Text>
      <Text style={styles.petit}>
        {zones} {libelles.zones}
      </Text>
      <Text style={styles.petit}>
        {foyers} {libelles.foyers}
      </Text>
    </Carte>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: espacement.md, paddingBottom: espacement.xxl },

  carteVerte: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 4 },
  libelleClair: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  grandChiffre: { fontSize: 36, fontWeight: '800', color: colors.blanc },
  rappel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: espacement.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: espacement.md,
    paddingVertical: 8,
    borderRadius: rayon.sm,
  },
  rappelTexte: { fontSize: 13, color: colors.blanc, fontWeight: '600' },

  libelle: { fontSize: 12, color: colors.texteSecondaire },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },

  ligneProchaine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    marginTop: espacement.sm,
  },
  icone: {
    width: 38,
    height: 38,
    borderRadius: rayon.sm,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneNom: { fontSize: 15, fontWeight: '700', color: colors.texte },

  periodes: { flexDirection: 'row', gap: espacement.sm },
  chiffrePeriode: { fontSize: 22, fontWeight: '800', color: colors.texte },

  ligneNote: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
});
