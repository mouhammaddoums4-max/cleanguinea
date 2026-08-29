import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Mission } from '../../src/api';
import { Carte, Chargement, Ecran, EnTete, PastilleBac, Vide } from '../../src/components/ui';
import { colors, espacement, formaterDate, formaterHeure } from '../../src/theme';

type Reponse = { missions: Mission[] };

/** Ecran 5 de l'application collecteur : collectes realisees. */
export default function HistoriqueCollecteur() {
  const donnees = useQuery({
    queryKey: ['mes-missions'],
    queryFn: () => api<Reponse>('/api/missions/mes-missions'),
  });

  const terminees = (donnees.data?.missions ?? []).filter((m) => m.statut === 'TERMINEE');
  const total = terminees.reduce((s, m) => s + m.poidsTotalKg, 0);

  return (
    <Ecran>
      <EnTete
        titre="Historique"
        sousTitre={`${terminees.length} collecte(s) · ${total.toFixed(1)} kg aujourd'hui`}
      />
      {donnees.isLoading ? (
        <Chargement />
      ) : terminees.length === 0 ? (
        <Vide icone="time-outline" titre="Aucune collecte terminée" />
      ) : (
        <FlatList
          data={terminees}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshing={donnees.isRefetching}
          onRefresh={() => donnees.refetch()}
          renderItem={({ item }) => (
            <Carte style={styles.carte}>
              <PastilleBac categorie={item.bacs[0]?.bac.categorie ?? 'AUTRES'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>
                  {formaterDate(item.datePlanifiee)} · {formaterHeure(item.datePlanifiee)}
                </Text>
                <Text style={styles.nom}>{item.client.user.nom}</Text>
                <Text style={styles.petit}>
                  {item.client.quartier.commune.nom} · Bac {item.bacs[0]?.bac.numero ?? '-'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.poids}>{item.poidsTotalKg} kg</Text>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              </View>
            </Carte>
          )}
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
  date: { fontSize: 11, color: colors.texteSecondaire },
  nom: { fontSize: 15, fontWeight: '600', color: colors.texte, marginTop: 2 },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  poids: { fontSize: 15, fontWeight: '700', color: colors.texte, marginBottom: 2 },
});
