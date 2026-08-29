import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type SoldePoints } from '../../src/api';
import { Carte, Chargement, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, couleursCategorie, espacement, formaterDate } from '../../src/theme';

type Bareme = {
  gnfParPoint: number;
  bareme: { categorie: string; pointsParKg: number }[];
  niveaux: { nom: string; seuil: number; bonusPct: number }[];
};

export default function Points() {
  const solde = useQuery({
    queryKey: ['points'],
    queryFn: () => api<SoldePoints>('/api/points/mon-solde'),
  });
  const bareme = useQuery({
    queryKey: ['bareme'],
    queryFn: () => api<Bareme>('/api/points/bareme'),
  });

  if (solde.isLoading) {
    return (
      <Ecran bas>
        <EnTete titre="Points Clean" retour />
        <Chargement />
      </Ecran>
    );
  }

  return (
    <Ecran bas>
      <EnTete titre="Points Clean" retour />
      <Contenu>
        <Carte style={styles.carteVerte}>
          <Text style={styles.libelleClair}>Solde disponible</Text>
          <Text style={styles.solde}>{solde.data?.solde ?? 0} pts</Text>
          <Text style={styles.libelleClair}>
            soit {(solde.data?.valeurGnf ?? 0).toLocaleString('fr-FR')} GNF
          </Text>

          <View style={styles.niveauLigne}>
            <Ionicons name="trophy" size={15} color={colors.blanc} />
            <Text style={styles.niveauTexte}>
              Niveau {solde.data?.niveau} (+{solde.data?.bonusPct} % sur vos gains)
            </Text>
          </View>

          {!!solde.data?.prochainNiveau && (
            <Text style={styles.libelleClair}>
              Encore {solde.data.prochainNiveau.pointsRestants} pts pour le niveau{' '}
              {solde.data.prochainNiveau.nom}
            </Text>
          )}
        </Carte>

        <Text style={styles.titre}>Barème par matière</Text>
        <Carte style={{ gap: espacement.sm }}>
          {bareme.data?.bareme
            .filter((b) => b.pointsParKg > 0)
            .map((b) => {
              const c = couleursCategorie[b.categorie];
              return (
                <View key={b.categorie} style={styles.baremeLigne}>
                  <View
                    style={[styles.pastille, { backgroundColor: c?.teinte ?? colors.texteTertiaire }]}
                  />
                  <Text style={styles.baremeNom}>{c?.libelle ?? b.categorie}</Text>
                  <Text style={styles.baremePts}>{b.pointsParKg} pts / kg</Text>
                </View>
              );
            })}
          <Text style={styles.note}>
            100 points = 1 000 GNF · convertibles en réduction d'abonnement, crédit Orange Money
            ou bons d'achat.
          </Text>
        </Carte>

        <Text style={styles.titre}>Derniers mouvements</Text>
        <View style={{ gap: espacement.sm }}>
          {solde.data?.mouvements.slice(0, 15).map((m) => (
            <Carte key={m.id} style={styles.mouvement}>
              <Ionicons
                name={m.sens === 'CREDIT' ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={20}
                color={m.sens === 'CREDIT' ? colors.primary : colors.danger}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.motif}>{m.motif}</Text>
                <Text style={styles.petit}>{formaterDate(m.createdAt)}</Text>
              </View>
              <Text
                style={[styles.points, { color: m.sens === 'CREDIT' ? colors.primary : colors.danger }]}
              >
                {m.sens === 'CREDIT' ? '+' : '−'}
                {m.points}
              </Text>
            </Carte>
          ))}
        </View>
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carteVerte: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 4 },
  libelleClair: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  solde: { fontSize: 34, fontWeight: '800', color: colors.blanc },
  niveauLigne: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: espacement.sm },
  niveauTexte: { fontSize: 13, color: colors.blanc, fontWeight: '600' },
  titre: { fontSize: 16, fontWeight: '700', color: colors.texte },
  baremeLigne: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  pastille: { width: 10, height: 10, borderRadius: 5 },
  baremeNom: { flex: 1, fontSize: 14, color: colors.texte },
  baremePts: { fontSize: 14, fontWeight: '700', color: colors.primary },
  note: { fontSize: 12, color: colors.texteSecondaire, marginTop: espacement.sm, lineHeight: 18 },
  mouvement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  motif: { fontSize: 14, color: colors.texte },
  petit: { fontSize: 11, color: colors.texteSecondaire, marginTop: 2 },
  points: { fontSize: 15, fontWeight: '700' },
});
