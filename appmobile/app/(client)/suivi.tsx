import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Mission, type StatutMission } from '../../src/api';
import { Carte, Chargement, Contenu, Ecran, EnTete, Vide } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useI18n } from '../../src/i18n';

/** Ecran 5 des maquettes : suivi de collecte en temps reel. */
const ETAPES: StatutMission[] = ['ACCEPTEE', 'EN_ROUTE', 'ARRIVE', 'TERMINEE'];

export default function Suivi() {
  const { t } = useI18n();
  const mission = useQuery({
    queryKey: ['mission-en-cours'],
    queryFn: () => api<Mission | null>('/api/missions/en-cours'),
    // Sondage court : c'est l'ecran ou la fraicheur compte le plus.
    refetchInterval: 15_000,
  });

  const indexActuel = mission.data
    ? Math.max(0, ETAPES.indexOf(mission.data!.statut))
    : -1;

  return (
    <Ecran bas>
      <EnTete titre={t('suivi.titre')} retour />
      {mission.isLoading ? (
        <Chargement texte={t('commun.chargement')} />
      ) : !mission.data ? (
        <Vide
          icone="checkmark-done-outline"
          titre={t('suivi.aucuneEnCours')}
          message={t('suivi.aucuneEnCoursDetail')}
        />
      ) : (
        <Contenu>
          {/* Collecteur assigné */}
          <Carte>
            <Text style={styles.libelle}>{t('suivi.collecteurAssigne')}</Text>
            <View style={styles.ligneCollecteur}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>
                  {mission.data.collecteur?.user.nom ?? t('suivi.enAffectation')}
                </Text>
                <Text style={styles.petit}>{mission.data.reference}</Text>
              </View>
              {!!mission.data.collecteur && (
                <View style={styles.note}>
                  <Ionicons name="star" size={13} color={colors.alerte} />
                  <Text style={styles.noteTexte}>
                    {mission.data.collecteur.note.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </Carte>

          {/* Progression */}
          <Carte>
            <View style={styles.etapes}>
              {ETAPES.map((etape, i) => {
                const atteinte = i <= indexActuel;
                const actuelle = i === indexActuel;
                return (
                  <View key={etape} style={styles.etape}>
                    <View style={styles.etapeHaut}>
                      {i > 0 && (
                        <View style={[styles.trait, atteinte && styles.traitActif]} />
                      )}
                      <View
                        style={[
                          styles.point,
                          atteinte && styles.pointActif,
                          actuelle && styles.pointCourant,
                        ]}
                      >
                        {atteinte && (
                          <Ionicons name="checkmark" size={12} color={colors.blanc} />
                        )}
                      </View>
                      {i < ETAPES.length - 1 && (
                        <View style={[styles.trait, i < indexActuel && styles.traitActif]} />
                      )}
                    </View>
                    <Text style={[styles.etapeLibelle, atteinte && styles.etapeLibelleActif]}>
                      {t(`statuts.${etape}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Carte>

          {!!mission.data.etaMinutes && (
            <Carte style={styles.carteEta}>
              <Text style={styles.libelle}>{t('suivi.arriveeEstimee')}</Text>
              <Text style={styles.eta}>
                {mission.data.etaMinutes} {t('suivi.minutes')}
              </Text>
            </Carte>
          )}

          {/* Emplacement de la carte : brancher react-native-maps une fois la cle Google Maps
              obtenue. En attendant, on affiche l'adresse plutot qu'un cadre vide. */}
          <Carte>
            <Text style={styles.libelle}>{t('suivi.localisation')}</Text>
            <View style={styles.lignePosition}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={styles.adresse}>{mission.data.client.adresse}</Text>
            </View>
            <Text style={styles.petit}>
              {mission.data.client.quartier.nom} · {mission.data.client.quartier.commune.nom}
            </Text>
          </Carte>
        </Contenu>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  libelle: { fontSize: 12, color: colors.texteSecondaire, marginBottom: espacement.sm },
  ligneCollecteur: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  noteTexte: { fontSize: 13, fontWeight: '600', color: colors.texte },

  etapes: { flexDirection: 'row' },
  etape: { flex: 1, alignItems: 'center', gap: espacement.sm },
  etapeHaut: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  point: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointActif: { backgroundColor: colors.primary, borderColor: colors.primary },
  pointCourant: { transform: [{ scale: 1.15 }] },
  trait: { flex: 1, height: 2, backgroundColor: colors.bordure },
  traitActif: { backgroundColor: colors.primary },
  etapeLibelle: { fontSize: 11, color: colors.texteTertiaire, textAlign: 'center' },
  etapeLibelleActif: { color: colors.primary, fontWeight: '600' },

  carteEta: { alignItems: 'center' },
  eta: { fontSize: 28, fontWeight: '800', color: colors.primary },

  lignePosition: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  adresse: { fontSize: 15, color: colors.texte, flex: 1 },
});
