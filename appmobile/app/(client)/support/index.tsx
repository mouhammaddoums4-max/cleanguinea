import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Conversation } from '../../../src/api';
import { Bouton, Carte, Chargement, Ecran, EnTete, Etiquette, Vide } from '../../../src/components/ui';
import { colors, espacement } from '../../../src/theme';
import { useI18n, useFormat } from '../../../src/i18n';
import { useResponsive } from '../../../src/responsive';

/**
 * Messagerie du client : la liste de ses demandes.
 *
 * Un fil par demande, et non une conversation unique : un bac casse et une
 * facture contestee se suivent separement, et se cloturent separement.
 */
export default function MesDemandes() {
  const router = useRouter();
  const { t } = useI18n();
  const format = useFormat();
  const r = useResponsive();

  const fils = useQuery({
    queryKey: ['support', 'mes-conversations'],
    queryFn: () => api<Conversation[]>('/api/support/mes-conversations'),
    // Une reponse du service client doit apparaitre sans quitter l'ecran.
    refetchInterval: 30_000,
  });

  const teinte = (statut: Conversation['statut']) =>
    statut === 'RESOLUE'
      ? { teinte: colors.texteSecondaire, fond: colors.surfaceAlt }
      : statut === 'REPONDUE'
        ? { teinte: colors.primaryTexte, fond: colors.primaryClair }
        : { teinte: colors.alerte, fond: colors.alerteClair };

  return (
    <Ecran bas>
      <EnTete titre={t('support.titre')} sousTitre={t('support.sousTitre')} retour />

      {fils.isLoading ? (
        <Chargement texte={t('commun.chargement')} />
      ) : (
        <FlatList
          data={fils.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[
            { paddingTop: espacement.lg, paddingBottom: espacement.xxl },
            r.contenu,
          ]}
          refreshing={fils.isRefetching}
          onRefresh={fils.refetch}
          ListHeaderComponent={
            <Bouton
              titre={t('support.nouveau')}
              icone="create-outline"
              onPress={() => router.push('/(client)/support/nouveau')}
              style={{ marginBottom: espacement.md }}
            />
          }
          ListEmptyComponent={
            <Vide
              icone="chatbubbles-outline"
              titre={t('support.aucune')}
              message={t('support.aucuneDetail')}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(client)/support/${item.id}`)}>
              <Carte style={{ gap: espacement.sm, marginBottom: espacement.sm }}>
                <View style={styles.ligneHaut}>
                  <Text style={styles.reference}>{item.reference}</Text>
                  <Etiquette texte={t(`support.statut.${item.statut}`)} {...teinte(item.statut)} />
                </View>

                <Text style={styles.sujet} numberOfLines={2}>
                  {item.sujet}
                </Text>

                <View style={styles.ligneBas}>
                  <Text style={styles.petit}>
                    {t(`support.motif.${item.motif}`)} · {format.date(item.dernierMessageLe)}
                  </Text>

                  {/* Pastille des messages non lus : c'est le seul repere qui
                      dit « le service client vous a repondu ». */}
                  {item.nonLusClient > 0 && (
                    <View style={styles.pastille}>
                      <Text style={styles.pastilleTexte}>{item.nonLusClient}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.texteTertiaire} />
                </View>
              </Carte>
            </Pressable>
          )}
        />
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligneHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacement.sm },
  reference: { fontSize: 13, fontWeight: '700', color: colors.texte },
  sujet: { fontSize: 14, color: colors.texte },
  ligneBas: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  petit: { flex: 1, fontSize: 12, color: colors.texteSecondaire },
  pastille: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleTexte: { fontSize: 11, fontWeight: '800', color: colors.blanc },
});
