import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Mission } from '../../src/api';
import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';
import {
  Bouton, Carte, Champ, Chargement, Contenu, Ecran, EnTete, PastilleBac, Vide,
} from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

/**
 * Confirmation des collectes par le client.
 *
 * Le collecteur déclare avoir collecté ; le client confirme ou conteste. Un
 * écart entre les deux révèle une collecte facturée mais non faite — ce
 * qu'aucun contrôle interne ne remonterait.
 *
 * La contestation exige un motif : sans lui, le back-office reçoit un signal
 * qu'il ne peut ni arbitrer ni expliquer au collecteur.
 */
export default function Confirmations() {
  const client = useQueryClient();
  const { t } = useI18n();
  const format = useFormat();
  const { categorie } = useConfig();

  const [contestation, setContestation] = useState<string | null>(null);
  const [motif, setMotif] = useState('');

  const missions = useQuery({
    queryKey: ['a-confirmer'],
    queryFn: () => api<Mission[]>('/api/missions/a-confirmer'),
  });

  function invalider() {
    client.invalidateQueries({ queryKey: ['a-confirmer'] });
    client.invalidateQueries({ queryKey: ['mes-collectes'] });
    client.invalidateQueries({ queryKey: ['notifications-compteur'] });
  }

  const repondre = useMutation({
    mutationFn: ({ id, confirme, motif }: { id: string; confirme: boolean; motif?: string }) =>
      api(`/api/missions/${id}/confirmation`, { method: 'POST', body: { confirme, motif } }),
    onSuccess: (_r, variables) => {
      invalider();
      setContestation(null);
      setMotif('');
      Alert.alert(
        variables.confirme ? t('confirmation.merci') : t('confirmation.signale'),
        variables.confirme ? t('confirmation.mercitexte') : t('confirmation.signaleTexte'),
      );
    },
    onError: (e) => Alert.alert(t('commun.erreurReseau'), e instanceof Error ? e.message : ''),
  });

  if (missions.isLoading) {
    return (
      <Ecran bas>
        <EnTete titre={t('confirmation.titre')} retour />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  const liste = missions.data ?? [];

  return (
    <Ecran bas>
      <EnTete
        titre={t('confirmation.titre')}
        sousTitre={liste.length > 0 ? t('confirmation.sousTitre') : undefined}
        retour
      />

      {liste.length === 0 ? (
        <Vide
          icone="checkmark-done-outline"
          titre={t('confirmation.aucune')}
          message={t('confirmation.aucuneDetail')}
        />
      ) : (
        <Contenu>
          {liste.map((m) => {
            const enContestation = contestation === m.id;
            const bac = m.bacs[0]?.bac;
            const c = bac ? categorie(bac.categorie) : null;

            return (
              <Carte key={m.id} style={{ gap: espacement.md }}>
                <View style={styles.ligneHaut}>
                  {!!c && (
                    <PastilleBac couleur={c.couleur} couleurFond={c.couleurFond} icone={c.icone} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reference}>{m.reference}</Text>
                    <Text style={styles.petit}>
                      {m.termineeA ? format.date(m.termineeA) : format.date(m.datePlanifiee)}
                      {m.termineeA ? ` · ${format.heure(m.termineeA)}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.poids}>{m.poidsTotalKg} kg</Text>
                    {!!m.collecteur && (
                      <Text style={styles.petit}>{m.collecteur.user.nom}</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.question}>{t('confirmation.question')}</Text>

                {enContestation ? (
                  <>
                    <Champ
                      libelle={t('confirmation.motif')}
                      icone="alert-circle-outline"
                      placeholder={t('confirmation.motifPlaceholder')}
                      value={motif}
                      onChangeText={setMotif}
                      multiline
                    />
                    <View style={styles.actions}>
                      <Bouton
                        titre={t('commun.annuler')}
                        variante="contour"
                        style={{ flex: 1 }}
                        onPress={() => {
                          setContestation(null);
                          setMotif('');
                        }}
                      />
                      <Bouton
                        titre={t('confirmation.envoyerSignalement')}
                        style={[styles.boutonDanger, { flex: 1.4 }]}
                        charge={repondre.isPending}
                        desactive={motif.trim().length < 5}
                        onPress={() =>
                          repondre.mutate({ id: m.id, confirme: false, motif: motif.trim() })
                        }
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.actions}>
                    <Bouton
                      titre={t('confirmation.nonCollecte')}
                      variante="contour"
                      icone="close-circle-outline"
                      style={{ flex: 1 }}
                      onPress={() => setContestation(m.id)}
                    />
                    <Bouton
                      titre={t('confirmation.ouiCollecte')}
                      icone="checkmark-circle-outline"
                      style={{ flex: 1 }}
                      charge={repondre.isPending}
                      onPress={() => repondre.mutate({ id: m.id, confirme: true })}
                    />
                  </View>
                )}
              </Carte>
            );
          })}

          <View style={styles.explication}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.texteTertiaire} />
            <Text style={styles.explicationTexte}>{t('confirmation.explication')}</Text>
          </View>
        </Contenu>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligneHaut: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  reference: { fontSize: 15, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  poids: { fontSize: 16, fontWeight: '800', color: colors.primary },

  question: { fontSize: 14, color: colors.texte, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: espacement.sm },
  boutonDanger: { backgroundColor: colors.danger },

  explication: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
  },
  explicationTexte: {
    flex: 1,
    fontSize: 12,
    color: colors.texteTertiaire,
    lineHeight: 17,
  },
});
