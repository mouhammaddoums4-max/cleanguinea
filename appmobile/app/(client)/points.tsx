import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type SoldePoints } from '../../src/api';
import { Carte, Chargement, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';

type Bareme = {
  gnfParPoint: number;
  validiteMois: number;
  bareme: { categorie: string; libelle: string; couleur: string; pointsParKg: number }[];
  niveaux: { code: string; libelle: string; seuil: number; bonusPct: number }[];
};

export default function Points() {
  const { t, langue } = useI18n();
  const format = useFormat();
  const solde = useQuery({
    queryKey: ['points'],
    queryFn: () => api<SoldePoints>('/api/points/mon-solde'),
  });
  const bareme = useQuery({
    queryKey: ['bareme', langue],
    queryFn: () => api<Bareme>(`/api/points/bareme?langue=${langue}`),
  });

  if (solde.isLoading) {
    return (
      <Ecran bas>
        <EnTete titre={t('points.titre')} retour />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  return (
    <Ecran bas>
      <EnTete titre={t('points.titre')} retour />
      <Contenu>
        <Carte style={styles.carteVerte}>
          <Text style={styles.libelleClair}>{t('points.soldeDisponible')}</Text>
          <Text style={styles.solde}>{solde.data?.solde ?? 0} pts</Text>
          <Text style={styles.libelleClair}>
            {t('points.soit')} {format.montant(solde.data?.valeurGnf ?? 0)}
          </Text>

          <View style={styles.niveauLigne}>
            <Ionicons name="trophy" size={15} color={colors.blanc} />
            <Text style={styles.niveauTexte}>
              {t('accueil.niveau')} {solde.data?.niveauLibelle ?? solde.data?.niveau} (+
              {solde.data?.bonusPct} % {t('points.bonusSurGains')})
            </Text>
          </View>

          {!!solde.data?.prochainNiveau && (
            <Text style={styles.libelleClair}>
              {t('points.encorePts', {
                n: solde.data.prochainNiveau.pointsRestants,
                niveau: solde.data.prochainNiveau.libelle,
              })}
            </Text>
          )}
        </Carte>

        <Text style={styles.titre}>{t('points.baremeParMatiere')}</Text>
        <Carte style={{ gap: espacement.sm }}>
          {bareme.data?.bareme
            .filter((b) => b.pointsParKg > 0)
            .map((b) => (
              <View key={b.categorie} style={styles.baremeLigne}>
                <View style={[styles.pastille, { backgroundColor: b.couleur }]} />
                <Text style={styles.baremeNom}>{b.libelle}</Text>
                <Text style={styles.baremePts}>
                  {b.pointsParKg} {t('points.ptsParKg')}
                </Text>
              </View>
            ))}
          <Text style={styles.note}>
            {t('points.note', { taux: 1000 / (bareme.data?.gnfParPoint ?? 10) })}
          </Text>
        </Carte>

        <Text style={styles.titre}>{t('points.derniersMouvements')}</Text>
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
                <Text style={styles.petit}>{format.date(m.createdAt)}</Text>
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
