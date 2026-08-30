import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api, type Mission } from '../../src/api';
import {
  Carte, Chargement, Ecran, EnTete, Etiquette, PastilleBac, Vide,
} from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useResponsive } from '../../src/responsive';
import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';

/** Ecran 6 des maquettes : historique des collectes. */
export default function Historique() {
  const { categorie } = useConfig();
  const { t } = useI18n();
  const r = useResponsive();
  const format = useFormat();

  const missions = useQuery({
    queryKey: ['mes-collectes'],
    queryFn: () => api<Mission[]>('/api/missions/mes-collectes'),
  });

  const terminees = missions.data?.filter((m) => m.statut === 'TERMINEE') ?? [];

  return (
    <Ecran>
      <EnTete titre={t('historique.titre')} />
      {missions.isLoading ? (
        <Chargement />
      ) : terminees.length === 0 ? (
        <Vide titre={t('historique.aucune')} message={t('historique.aucuneDetail')} />
      ) : (
        <FlatList
          data={terminees}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.liste, r.contenu]}
          showsVerticalScrollIndicator={false}
          refreshing={missions.isRefetching}
          onRefresh={() => missions.refetch()}
          renderItem={({ item }) => {
            const code = item.bacs[0]?.bac.categorie ?? 'AUTRES';
            const c = categorie(code);
            return (
              <Carte style={styles.carte}>
                <PastilleBac couleur={c.couleur} couleurFond={c.couleurFond} icone={c.icone} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.date}>
                    {format.date(item.datePlanifiee)} · {format.heure(item.datePlanifiee)}
                  </Text>
                  <Text style={styles.matiere}>
                    {c.libelle} ({t('bacs.bac')} {item.bacs[0]?.bac.numero ?? '-'})
                  </Text>

                </View>
                <Etiquette texte={t('statuts.TERMINEE')} />
              </Carte>
            );
          }}
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
  date: { fontSize: 12, color: colors.texteSecondaire },
  matiere: { fontSize: 15, fontWeight: '600', color: colors.texte, marginTop: 2 },
});
