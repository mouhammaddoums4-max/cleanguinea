import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useI18n, useFormat } from '../../src/i18n';
import { useResponsive } from '../../src/responsive';
import { Chargement, Ecran, EnTete, Vide } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

type Notification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lue: boolean;
  createdAt: string;
};

/** Icône et teinte par type : la nature du message se lit avant le texte. */
const APPARENCE: Record<string, { icone: keyof typeof Ionicons.glyphMap; teinte: string }> = {
  COLLECTE_PLANIFIEE: { icone: 'calendar', teinte: colors.info },
  COLLECTEUR_EN_ROUTE: { icone: 'navigate', teinte: colors.alerte },
  COLLECTE_TERMINEE: { icone: 'checkmark-done', teinte: colors.primary },
  POINTS_CREDITES: { icone: 'leaf', teinte: colors.primary },
  PAIEMENT_DU: { icone: 'card', teinte: colors.danger },
  PAIEMENT_RECU: { icone: 'receipt', teinte: colors.primary },
  ZONE_AFFECTEE: { icone: 'location', teinte: colors.info },
  INFORMATION: { icone: 'information-circle', teinte: colors.texteSecondaire },
};

export default function NotificationsListe() {
  const router = useRouter();
  const client = useQueryClient();
  const { t } = useI18n();
  const format = useFormat();
  const r = useResponsive();

  const requete = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: Notification[]; nonLues: number }>('/api/notifications'),
  });

  function invalider() {
    client.invalidateQueries({ queryKey: ['notifications'] });
    client.invalidateQueries({ queryKey: ['notifications-compteur'] });
  }

  const marquerLue = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/lue`, { method: 'PATCH' }),
    onSuccess: invalider,
  });

  const toutLire = useMutation({
    mutationFn: () => api('/api/notifications/tout-lu', { method: 'POST' }),
    onSuccess: invalider,
  });

  const notifications = requete.data?.notifications ?? [];
  const nonLues = requete.data?.nonLues ?? 0;

  function ouvrir(n: Notification) {
    if (!n.lue) marquerLue.mutate(n.id);
    if (n.lien?.startsWith('/')) router.push(n.lien as never);
  }

  return (
    <Ecran bas>
      <EnTete
        titre={t('profil.notifications')}
        sousTitre={nonLues > 0 ? t('notifsListe.nonLues', { n: nonLues }) : undefined}
        retour
        action={
          nonLues > 0 ? (
            <Pressable onPress={() => toutLire.mutate()} hitSlop={8}>
              <Text style={styles.toutLire}>{t('notifsListe.toutLire')}</Text>
            </Pressable>
          ) : undefined
        }
      />

      {requete.isLoading ? (
        <Chargement texte={t('commun.chargement')} />
      ) : notifications.length === 0 ? (
        <Vide
          icone="notifications-off-outline"
          titre={t('notifsListe.aucune')}
          message={t('notifsListe.aucuneDetail')}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[styles.liste, r.contenu]}
          showsVerticalScrollIndicator={false}
          refreshing={requete.isRefetching}
          onRefresh={() => requete.refetch()}
          renderItem={({ item }) => {
            const a = APPARENCE[item.type] ?? APPARENCE.INFORMATION;
            return (
              <Pressable
                onPress={() => ouvrir(item)}
                style={({ pressed }) => [
                  styles.ligne,
                  // Une notification non lue se distingue par son fond, pas par
                  // une pastille qu'il faut chercher.
                  !item.lue && styles.ligneNonLue,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
              >
                <View style={[styles.icone, { backgroundColor: `${a.teinte}1A` }]}>
                  <Ionicons name={a.icone} size={18} color={a.teinte} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.titre, !item.lue && styles.titreNonLu]}>{item.titre}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.date}>
                    {format.date(item.createdAt)} · {format.heure(item.createdAt)}
                  </Text>
                </View>

                {!!item.lien && (
                  <Ionicons name="chevron-forward" size={16} color={colors.texteTertiaire} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  liste: { paddingVertical: espacement.md, gap: espacement.sm, paddingBottom: espacement.xxl },
  toutLire: { fontSize: 13, fontWeight: '600', color: colors.primary },

  ligne: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacement.md,
    padding: espacement.md,
    borderRadius: rayon.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordure,
  },
  ligneNonLue: { backgroundColor: colors.primaryClair, borderColor: colors.primaryClair },

  icone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titre: { fontSize: 14, color: colors.texte },
  titreNonLu: { fontWeight: '700' },
  message: { fontSize: 13, color: colors.texteSecondaire, marginTop: 2, lineHeight: 18 },
  date: { fontSize: 11, color: colors.texteTertiaire, marginTop: 4 },
});
