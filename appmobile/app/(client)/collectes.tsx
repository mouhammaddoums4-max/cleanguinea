import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Bac } from '../../src/api';
import { Bouton, Carte, Chargement, Contenu, Ecran, EnTete, PastilleBac } from '../../src/components/ui';
import { colors, couleursCategorie, espacement } from '../../src/theme';

/** Gestion des bacs : le client declare le remplissage, ce qui declenche la collecte. */
export default function Collectes() {
  const router = useRouter();
  const client = useQueryClient();

  const bacs = useQuery({ queryKey: ['mes-bacs'], queryFn: () => api<Bac[]>('/api/bacs/mes-bacs') });

  const majNiveau = useMutation({
    mutationFn: ({ id, niveauTiers }: { id: string; niveauTiers: number }) =>
      api(`/api/bacs/${id}/niveau`, { method: 'PATCH', body: { niveauTiers } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mes-bacs'] }),
  });

  return (
    <Ecran>
      <EnTete titre="Mes bacs" sousTitre="Indiquez le niveau de remplissage" />
      {bacs.isLoading ? (
        <Chargement />
      ) : (
        <Contenu>
          {bacs.data?.map((bac) => {
            const c = couleursCategorie[bac.categorie] ?? couleursCategorie.AUTRES;
            return (
              <Carte key={bac.id} style={{ gap: espacement.md }}>
                <View style={styles.ligne}>
                  <PastilleBac categorie={bac.categorie} taille={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nom}>{c.libelle}</Text>
                    <Text style={styles.petit}>
                      Bac {bac.numero} · {bac.codeQr}
                    </Text>
                  </View>
                </View>

                <View style={styles.niveaux}>
                  {[0, 1, 2, 3].map((n) => (
                    <Bouton
                      key={n}
                      titre={`${n}/3`}
                      variante={bac.niveauTiers === n ? 'plein' : 'contour'}
                      style={{ flex: 1, height: 40 }}
                      onPress={() => majNiveau.mutate({ id: bac.id, niveauTiers: n })}
                    />
                  ))}
                </View>

                {bac.niveauTiers >= 2 && (
                  <View style={styles.avis}>
                    <Ionicons name="alert-circle" size={16} color={colors.alerte} />
                    <Text style={styles.avisTexte}>Ce bac est presque plein</Text>
                  </View>
                )}
              </Carte>
            );
          })}

          <Bouton
            titre="Demander une collecte"
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
