import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api, type Paiement } from '../../src/api';
import { Carte, Chargement, Contenu, Ecran, EnTete, Etiquette } from '../../src/components/ui';
import { colors, espacement, formaterDate, formaterGnf } from '../../src/theme';

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
  const donnees = useQuery({
    queryKey: ['mes-paiements'],
    queryFn: () => api<Reponse>('/api/paiements/mes-paiements'),
  });

  if (donnees.isLoading) {
    return (
      <Ecran bas>
        <EnTete titre="Paiements" retour />
        <Chargement />
      </Ecran>
    );
  }

  const abo = donnees.data?.abonnement;

  return (
    <Ecran bas>
      <EnTete titre="Paiements" retour />
      <Contenu>
        <Carte style={styles.carteVerte}>
          <Text style={styles.libelleClair}>{abo?.offre.libelle ?? 'Aucun abonnement'}</Text>
          <Text style={styles.montant}>
            {abo ? `${formaterGnf(abo.offre.tarifMensuelGnf)} / mois` : '—'}
          </Text>
          {!!abo?.prochainPrelevement && (
            <Text style={styles.libelleClair}>
              Prochain prélèvement {formaterDate(abo.prochainPrelevement)}
            </Text>
          )}
        </Carte>

        <Text style={styles.titre}>Historique des paiements</Text>

        <View style={{ gap: espacement.sm }}>
          {donnees.data?.paiements.map((p) => (
            <Carte key={p.id} style={styles.ligne}>
              <Text style={styles.datePaiement}>{formaterDate(p.payeLe ?? p.periodeDebut)}</Text>
              <Text style={styles.montantLigne}>{formaterGnf(p.montantGnf)}</Text>
              <Etiquette
                texte={
                  p.statut === 'PAYE' ? 'Payé' : p.statut === 'ECHOUE' ? 'Échoué' : 'En attente'
                }
                teinte={p.statut === 'PAYE' ? colors.primaryTexte : colors.danger}
                fond={p.statut === 'PAYE' ? colors.primaryClair : colors.dangerClair}
              />
            </Carte>
          ))}
        </View>

        <Text style={styles.note}>
          Paiement par Orange Money, MTN MoMo, Visa ou Mastercard. Vos points Clean peuvent
          couvrir tout ou partie de l'abonnement.
        </Text>
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
