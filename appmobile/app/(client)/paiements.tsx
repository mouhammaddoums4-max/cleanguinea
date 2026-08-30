import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api, type Paiement } from '../../src/api';
import { useConfig } from '../../src/config';
import { useRouter } from 'expo-router';
import { useI18n, useFormat } from '../../src/i18n';
import {
  Bouton, Carte, Chargement, Contenu, Ecran, EnTete, Etiquette,
} from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useEcranProtege } from '../../src/securite';

type Reponse = {
  abonnement: {
    reference: string;
    prochainPrelevement: string | null;
    offre: { libelle: string; tarifMensuelGnf: number };
  } | null;
  paiements: Paiement[];
};

/** Ecran 7 des maquettes : abonnement et historique des paiements. */
export default function Paiements() {
  // Ecran sensible : ni capture, ni apercu dans les applications recentes.
  useEcranProtege();
  const router = useRouter();
  const { t } = useI18n();
  const format = useFormat();
  const { devise } = useConfig();

  const donnees = useQuery({
    queryKey: ['mes-paiements'],
    queryFn: () => api<Reponse>('/api/paiements/mes-paiements'),
  });

  if (donnees.isLoading) {
    return (
      <Ecran>
        <EnTete titre={t('paiements.titre')} />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  const abo = donnees.data?.abonnement;

  const libelleStatut = (statut: Paiement['statut']) =>
    statut === 'PAYE'
      ? t('paiements.paye')
      : statut === 'ECHOUE'
        ? t('paiements.echoue')
        : t('paiements.enAttente');

  return (
    <Ecran>
      <EnTete titre={t('paiements.titre')} />
      <Contenu>
        <Carte style={styles.carteVerte}>
          <Text style={styles.libelleClair}>
            {abo?.offre.libelle ?? t('paiements.aucunAbonnement')}
          </Text>
          <Text style={styles.montant}>
            {abo
              ? `${format.montant(abo.offre.tarifMensuelGnf, devise)} ${t('paiements.parMois')}`
              : '—'}
          </Text>
          {!!abo?.prochainPrelevement && (
            <Text style={styles.libelleClair}>
              {t('paiements.prochainPrelevement')} {format.date(abo.prochainPrelevement)}
            </Text>
          )}
        </Carte>

        <Bouton
          titre={abo ? t('abonnement.titre') : t('abonnement.souscrire')}
          variante={abo ? 'contour' : 'plein'}
          icone="card-outline"
          onPress={() => router.push('/(client)/abonnement')}
        />

        <Text style={styles.titre}>{t('paiements.historique')}</Text>

        <View style={{ gap: espacement.sm }}>
          {donnees.data?.paiements.map((p) => (
            <Carte key={p.id} style={styles.ligne}>
              <Text style={styles.datePaiement}>{format.date(p.payeLe ?? p.periodeDebut)}</Text>
              <Text style={styles.montantLigne}>{format.montant(p.montantGnf, devise)}</Text>
              <Etiquette
                texte={libelleStatut(p.statut)}
                teinte={p.statut === 'PAYE' ? colors.primaryTexte : colors.danger}
                fond={p.statut === 'PAYE' ? colors.primaryClair : colors.dangerClair}
              />
            </Carte>
          ))}
        </View>

        <Text style={styles.note}>{t('paiements.note')}</Text>
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carteVerte: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 4 },
  libelleClair: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  montant: { fontSize: 22, fontWeight: '800', color: colors.blanc },
  titre: { fontSize: 16, fontWeight: '700', color: colors.texte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  datePaiement: { flex: 1, fontSize: 14, color: colors.texteSecondaire },
  montantLigne: { fontSize: 14, fontWeight: '700', color: colors.texte },
  note: { fontSize: 12, color: colors.texteSecondaire, lineHeight: 18 },
});
