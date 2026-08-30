import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';
import {
  Bouton, Carte, Chargement, Contenu, Ecran, EnTete, Etiquette,
} from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useEcranProtege } from '../../src/securite';

type Formule = {
  periodicite: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';
  libelle: string;
  mois: number;
  totalGnf: number;
  remisePct: number;
  remiseGnf: number;
  equivalentMensuelGnf: number;
};

type Offre = {
  id: string;
  type: 'ESSENTIEL' | 'STANDARD' | 'PRO';
  libelle: string;
  passagesParSemaine: number;
  nbBacsFournis: number;
  formules: Formule[];
};

type MonAbonnement = {
  periodicite: string;
  statut: string;
  prochainPrelevement: string | null;
  offre: { type: string; libelle: string };
} | null;

const MOYENS = [
  { code: 'ORANGE_MONEY', libelle: 'Orange Money', icone: 'phone-portrait-outline' },
  { code: 'MTN_MOMO', libelle: 'MTN MoMo', icone: 'phone-portrait-outline' },
  { code: 'VISA', libelle: 'Visa', icone: 'card-outline' },
  { code: 'MASTERCARD', libelle: 'Mastercard', icone: 'card-outline' },
] as const;

/**
 * Souscription et changement de formule.
 *
 * Le prix affiché vient du serveur, jamais d'un calcul local : c'est lui qui
 * fait foi à la facturation, et un écart entre les deux serait invisible
 * jusqu'à la réclamation.
 */
export default function Abonnement() {
  // Ecran sensible : ni capture, ni apercu dans les applications recentes.
  useEcranProtege();
  const router = useRouter();
  const client = useQueryClient();
  const { t, langue } = useI18n();
  const format = useFormat();
  const { devise } = useConfig();

  const [offreChoisie, setOffreChoisie] = useState<Offre['type']>('STANDARD');
  const [formuleChoisie, setFormuleChoisie] = useState<Formule['periodicite']>('MENSUEL');
  const [moyen, setMoyen] = useState<(typeof MOYENS)[number]['code']>('ORANGE_MONEY');

  const formules = useQuery({
    queryKey: ['formules', langue],
    queryFn: () => api<Offre[]>(`/api/abonnements/formules?langue=${langue}`),
  });

  const actuel = useQuery({
    queryKey: ['mon-abonnement'],
    queryFn: () => api<MonAbonnement>('/api/abonnements/mon-abonnement'),
  });

  const souscrire = useMutation({
    mutationFn: () =>
      api<{ paiement: { montantGnf: number; statut: string } }>('/api/abonnements/souscrire', {
        method: 'POST',
        body: { offreType: offreChoisie, periodicite: formuleChoisie, moyen },
      }),
    onSuccess: (rep) => {
      client.invalidateQueries({ queryKey: ['mon-abonnement'] });
      client.invalidateQueries({ queryKey: ['mes-paiements'] });

      Alert.alert(
        t('abonnement.souscrit'),
        rep.paiement.statut === 'PAYE'
          ? t('abonnement.actif')
          : t('abonnement.validerPaiement', {
              montant: format.montant(rep.paiement.montantGnf, devise),
            }),
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert(t('abonnement.echec'), e instanceof Error ? e.message : ''),
  });

  if (formules.isLoading) {
    return (
      <Ecran bas>
        <EnTete titre={t('abonnement.titre')} retour />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  const offre = formules.data?.find((o) => o.type === offreChoisie);
  const formule = offre?.formules.find((f) => f.periodicite === formuleChoisie);

  return (
    <Ecran bas>
      <EnTete titre={t('abonnement.titre')} retour />
      <Contenu>
        {/* Abonnement en cours */}
        {!!actuel.data && (
          <Carte style={styles.actuel}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primaryTexte} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actuelTitre}>
                {actuel.data.offre.libelle} · {t(`abonnement.${actuel.data.periodicite}`)}
              </Text>
              {!!actuel.data.prochainPrelevement && (
                <Text style={styles.actuelTexte}>
                  {t('abonnement.jusquau')} {format.date(actuel.data.prochainPrelevement)}
                </Text>
              )}
            </View>
          </Carte>
        )}

        {/* Choix de l'offre */}
        <Text style={styles.titreSection}>{t('abonnement.choisirOffre')}</Text>
        <View style={{ gap: espacement.sm }}>
          {formules.data?.map((o) => {
            const choisie = o.type === offreChoisie;
            const mensuel = o.formules.find((f) => f.periodicite === 'MENSUEL');
            return (
              <Carte
                key={o.id}
                onPress={() => setOffreChoisie(o.type)}
                style={[styles.option, choisie && styles.optionChoisie]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitre}>{o.libelle}</Text>
                  <Text style={styles.petit}>
                    {o.passagesParSemaine} {t('abonnement.passagesSemaine')} ·{' '}
                    {o.nbBacsFournis} {t('abonnement.bacs')}
                  </Text>
                </View>
                <Text style={styles.optionPrix}>
                  {format.montant(mensuel?.totalGnf ?? 0, devise)}
                </Text>
                <Ionicons
                  name={choisie ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={choisie ? colors.primary : colors.texteTertiaire}
                />
              </Carte>
            );
          })}
        </View>

        {/* Choix de la durée */}
        <Text style={styles.titreSection}>{t('abonnement.choisirDuree')}</Text>
        <View style={{ gap: espacement.sm }}>
          {offre?.formules.map((f) => {
            const choisie = f.periodicite === formuleChoisie;
            return (
              <Carte
                key={f.periodicite}
                onPress={() => setFormuleChoisie(f.periodicite)}
                style={[styles.option, choisie && styles.optionChoisie]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.ligneLibelle}>
                    <Text style={styles.optionTitre}>{f.libelle}</Text>
                    {f.remisePct > 0 && (
                      <Etiquette texte={`−${f.remisePct} %`} />
                    )}
                  </View>
                  {/* Le prix au mois est la seule comparaison honnête entre des
                      durées différentes. */}
                  <Text style={styles.petit}>
                    {format.montant(f.equivalentMensuelGnf, devise)} {t('paiements.parMois')}
                  </Text>
                </View>
                <Text style={styles.optionPrix}>{format.montant(f.totalGnf, devise)}</Text>
                <Ionicons
                  name={choisie ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={choisie ? colors.primary : colors.texteTertiaire}
                />
              </Carte>
            );
          })}
        </View>

        {/* Moyen de paiement */}
        <Text style={styles.titreSection}>{t('abonnement.moyenPaiement')}</Text>
        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {MOYENS.map((m, i) => (
            <Pressable
              key={m.code}
              onPress={() => setMoyen(m.code)}
              style={({ pressed }) => [
                styles.moyen,
                i > 0 && styles.separateur,
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Ionicons name={m.icone} size={19} color={colors.texteSecondaire} />
              <Text style={styles.moyenLibelle}>{m.libelle}</Text>
              <Ionicons
                name={moyen === m.code ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={moyen === m.code ? colors.primary : colors.texteTertiaire}
              />
            </Pressable>
          ))}
        </Carte>

        {/* Récapitulatif */}
        {!!formule && (
          <Carte style={styles.recap}>
            <View style={styles.ligneRecap}>
              <Text style={styles.recapLibelle}>{offre?.libelle}</Text>
              <Text style={styles.recapValeur}>{formule.libelle}</Text>
            </View>
            {formule.remiseGnf > 0 && (
              <View style={styles.ligneRecap}>
                <Text style={styles.recapLibelle}>{t('abonnement.remise')}</Text>
                <Text style={styles.recapRemise}>
                  −{format.montant(formule.remiseGnf, devise)}
                </Text>
              </View>
            )}
            <View style={[styles.ligneRecap, styles.ligneTotal]}>
              <Text style={styles.totalLibelle}>{t('abonnement.total')}</Text>
              <Text style={styles.totalValeur}>
                {format.montant(formule.totalGnf, devise)}
              </Text>
            </View>
          </Carte>
        )}

        <Bouton
          titre={t('abonnement.souscrire')}
          icone="card-outline"
          onPress={() => souscrire.mutate()}
          charge={souscrire.isPending}
        />

        <Text style={styles.note}>{t('abonnement.note')}</Text>
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  actuel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
  },
  actuelTitre: { fontSize: 14, fontWeight: '700', color: colors.primaryTexte },
  actuelTexte: { fontSize: 12, color: colors.primaryTexte, marginTop: 2 },

  titreSection: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.texteTertiaire,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 4,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  optionChoisie: { borderColor: colors.primary, borderWidth: 1.5 },
  ligneLibelle: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  optionTitre: { fontSize: 15, fontWeight: '600', color: colors.texte },
  optionPrix: { fontSize: 14, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },

  moyen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.md,
  },
  separateur: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bordure },
  moyenLibelle: { flex: 1, fontSize: 15, color: colors.texte },

  recap: { gap: espacement.sm },
  ligneRecap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapLibelle: { fontSize: 14, color: colors.texteSecondaire },
  recapValeur: { fontSize: 14, fontWeight: '600', color: colors.texte },
  recapRemise: { fontSize: 14, fontWeight: '600', color: colors.primary },
  ligneTotal: {
    paddingTop: espacement.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
  },
  totalLibelle: { fontSize: 15, fontWeight: '700', color: colors.texte },
  totalValeur: { fontSize: 19, fontWeight: '800', color: colors.primary },

  note: { fontSize: 12, color: colors.texteTertiaire, lineHeight: 17 },
});
