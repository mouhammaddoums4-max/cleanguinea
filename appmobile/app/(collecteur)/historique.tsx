import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type TourneeTerminee } from '../../src/api';
import { useI18n, useFormat } from '../../src/i18n';
import { Carte, Chargement, Ecran, EnTete, Vide } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useResponsive } from '../../src/responsive';

type Reponse = {
  tournees: TourneeTerminee[];
  cumul: { zones: number; poidsTotalKg: number; foyersServis: number };
};

/** Zones confirmees par le collecteur sur les 30 derniers jours. */
export default function HistoriqueCollecteur() {
  const { t } = useI18n();
  const r = useResponsive();
  const format = useFormat();

  const donnees = useQuery({
    queryKey: ['historique-zones'],
    queryFn: () => api<Reponse>('/api/tournees/collecteur/historique'),
  });

  const cumul = donnees.data?.cumul;

  return (
    <Ecran bas>
      <EnTete
        titre={t('collecteur.historique')}
        sousTitre={
          cumul
            ? `${cumul.zones} ${t('tdb.zones')} · ${cumul.poidsTotalKg} kg · ${cumul.foyersServis} ${t('zones.foyersServis')}`
            : undefined
        }
        retour
      />
      {donnees.isLoading ? (
        <Chargement texte={t('commun.chargement')} />
      ) : (donnees.data?.tournees.length ?? 0) === 0 ? (
        <Vide icone="time-outline" titre={t('zones.aucuneTerminee')} />
      ) : (
        <FlatList
          data={donnees.data!.tournees}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[styles.liste, r.contenu]}
          showsVerticalScrollIndicator={false}
          refreshing={donnees.isRefetching}
          onRefresh={() => donnees.refetch()}
          renderItem={({ item }) => (
            <Carte style={styles.carte}>
              <View style={styles.pastille}>
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>
                  {format.date(item.date)}
                  {item.termineeA ? ` · ${format.heure(item.termineeA)}` : ''}
                </Text>
                <Text style={styles.nom}>{item.quartier.nom}</Text>
                <Text style={styles.petit}>
                  {item.quartier.commune.nom} · {item.nbFoyersServis} {t('zones.foyersServis')}
                </Text>
              </View>
              <Text style={styles.poids}>{item.poidsTotalKg} kg</Text>
            </Carte>
          )}
        />
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  liste: { gap: espacement.sm, paddingBottom: espacement.xxl },
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  pastille: {
    width: 32,
    height: 32,
    borderRadius: rayon.sm,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: { fontSize: 11, color: colors.texteSecondaire },
  nom: { fontSize: 15, fontWeight: '600', color: colors.texte, marginTop: 2 },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  poids: { fontSize: 15, fontWeight: '700', color: colors.texte },
});
