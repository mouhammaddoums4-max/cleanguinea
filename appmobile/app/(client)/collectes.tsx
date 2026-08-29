import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Bac } from '../../src/api';
import { Bouton, Carte, Chargement, Contenu, Ecran, EnTete, PastilleBac } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useConfig } from '../../src/config';
import { useI18n } from '../../src/i18n';

/** Gestion des bacs : le client declare le remplissage, ce qui declenche la collecte. */
export default function Collectes() {
  const router = useRouter();
  const client = useQueryClient();
  const { categorie, parametre } = useConfig();
  const { t } = useI18n();

  const niveauMax = parametre<number>('bac.niveauMaxTiers', 3);
  const seuilAlerte = parametre<number>('bac.seuilAlerteTiers', 2);

  const bacs = useQuery({ queryKey: ['mes-bacs'], queryFn: () => api<Bac[]>('/api/bacs/mes-bacs') });

  const majNiveau = useMutation({
    mutationFn: ({ id, niveauTiers }: { id: string; niveauTiers: number }) =>
      api(`/api/bacs/${id}/niveau`, { method: 'PATCH', body: { niveauTiers } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mes-bacs'] }),
  });

  return (
    <Ecran>
      <EnTete titre={t('bacs.titre')} sousTitre={t('bacs.sousTitre')} />
      {bacs.isLoading ? (
        <Chargement />
      ) : (
        <Contenu>
          {bacs.data?.map((bac) => {
            const c = categorie(bac.categorie);
            return (
              <Carte key={bac.id} style={{ gap: espacement.md }}>
                <View style={styles.ligne}>
                  <PastilleBac
                    couleur={c.couleur}
                    couleurFond={c.couleurFond}
                    icone={c.icone}
                    taille={40}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nom}>{c.libelle}</Text>
                    <Text style={styles.petit}>
                      {t('bacs.bac')} {bac.numero} · {bac.codeQr}
                    </Text>
                  </View>
                </View>

                <View style={styles.niveaux}>
                  {Array.from({ length: niveauMax + 1 }, (_, n) => n).map((n) => (
                    <Bouton
                      key={n}
                      titre={`${n}/${niveauMax}`}
                      variante={bac.niveauTiers === n ? 'plein' : 'contour'}
                      style={{ flex: 1, height: 40 }}
                      onPress={() => majNiveau.mutate({ id: bac.id, niveauTiers: n })}
                    />
                  ))}
                </View>

                {bac.niveauTiers >= seuilAlerte && (
                  <View style={styles.avis}>
                    <Ionicons name="alert-circle" size={16} color={colors.alerte} />
                    <Text style={styles.avisTexte}>{t('bacs.presquePlein')}</Text>
                  </View>
                )}
              </Carte>
            );
          })}

          <Bouton
            titre={t('bacs.demanderCollecte')}
            icone="trash-outline"
            onPress={() => router.push('/(client)/demande')}
          />
        </Contenu>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  nom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  petit: { fontSize: 11, color: colors.texteSecondaire, marginTop: 2 },
  niveaux: { flexDirection: 'row', gap: espacement.sm },
  avis: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avisTexte: { fontSize: 12, color: colors.alerte, fontWeight: '500' },
});
