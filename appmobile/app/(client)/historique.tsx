import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api, type Mission } from '../../src/api';
import {
  Carte, Chargement, Ecran, EnTete, Etiquette, PastilleBac, Vide,
} from '../../src/components/ui';
import { colors, couleursCategorie, espacement, formaterDate, formaterHeure } from '../../src/theme';

/** Ecran 6 des maquettes : historique des collectes. */
export default function Historique() {
  const missions = useQuery({
    queryKey: ['mes-collectes'],
    queryFn: () => api<Mission[]>('/api/missions/mes-collectes'),
  });

  const terminees = missions.data?.filter((m) => m.statut === 'TERMINEE') ?? [];

  return (
    <Ecran>
      <EnTete titre="Historique des collectes" />
      {missions.isLoading ? (
        <Chargement />
      ) : terminees.length === 0 ? (
        <Vide titre="Aucune collecte terminée" message="Vos passages apparaîtront ici." />
      ) : (
        <FlatList
          data={terminees}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshing={missions.isRefetching}
          onRefresh={() => missions.refetch()}
          renderItem={({ item }) => {
            const categorie = item.bacs[0]?.bac.categorie ?? 'AUTRES';
            const c = couleursCategorie[categorie] ?? couleursCategorie.AUTRES;
            return (
              <Carte style={styles.carte}>
                <PastilleBac categorie={categorie} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.date}>
                    {formaterDate(item.datePlanifiee)} · {formaterHeure(item.datePlanifiee)}
                  </Text>
                  <Text style={styles.matiere}>
                    {c.libelle} (Bac {item.bacs[0]?.bac.numero ?? '-'})
                  </Text>
                  <Text style={styles.poids}>Poids : {item.poidsTotalKg} kg</Text>
                </View>
                <Etiquette texte="Terminée" />
              </Carte>
            );
          }}
        />
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  liste: { padding: espacement.lg, gap: espacement.sm, paddingBottom: espacement.xxl },
  carte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  date: { fontSize: 12, color: colors.texteSecondaire },
  matiere: { fontSize: 15, fontWeight: '600', color: colors.texte, marginTop: 2 },
  poids: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
});
