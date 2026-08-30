import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';
import { Bouton, Carte, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

const TELEPHONE_SERVICE = '+224621000000';

/** Aide, questions fréquentes et contact du service client. */
export default function Aide() {
  const { t } = useI18n();
  const format = useFormat();
  const { config, devise } = useConfig();
  const [ouverte, setOuverte] = useState<number | null>(0);

  // Les réponses citent les vrais tarifs et barèmes : une FAQ qui contredit
  // l'application est pire que pas de FAQ du tout.
  const offreStandard = config?.offres.find((o) => o.type === 'STANDARD');

  const questions = [
    {
      q: t('aide.q1'),
      r: t('aide.r1', {
        tarif: offreStandard ? format.montant(offreStandard.tarifMensuelGnf, devise) : '—',
        passages: offreStandard?.passagesParSemaine ?? 3,
      }),
    },
    { q: t('aide.q2'), r: t('aide.r2') },
    { q: t('aide.q3'), r: t('aide.r3') },
    { q: t('aide.q4'), r: t('aide.r4') },
    { q: t('aide.q5'), r: t('aide.r5') },
    { q: t('aide.q6'), r: t('aide.r6') },
  ];

  return (
    <Ecran bas>
      <EnTete titre={t('profil.aide')} retour />
      <Contenu>
        {/* Contact direct en haut : quelqu'un qui ouvre l'aide a souvent
            un problème précis et pressé. */}
        <Carte style={styles.contact}>
          <View style={styles.iconeContact}>
            <Ionicons name="headset" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitre}>{t('aide.serviceClient')}</Text>
            <Text style={styles.petit}>{t('aide.horaires')}</Text>
          </View>
        </Carte>

        <View style={styles.actions}>
          <Bouton
            titre={t('profil.contacterService')}
            icone="call-outline"
            style={{ flex: 1 }}
            onPress={() => Linking.openURL(`tel:${TELEPHONE_SERVICE}`)}
          />
          <Bouton
            titre="WhatsApp"
            variante="contour"
            icone="logo-whatsapp"
            style={{ flex: 1 }}
            onPress={() =>
              Linking.openURL(`https://wa.me/${TELEPHONE_SERVICE.replace('+', '')}`)
            }
          />
        </View>

        <Text style={styles.titreSection}>{t('aide.questionsFrequentes')}</Text>

        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {questions.map((item, i) => {
            const estOuverte = ouverte === i;
            return (
              <View key={item.q} style={i > 0 ? styles.separateur : undefined}>
                <Pressable
                  onPress={() => setOuverte(estOuverte ? null : i)}
                  style={({ pressed }) => [
                    styles.question,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: estOuverte }}
                >
                  <Text style={styles.questionTexte}>{item.q}</Text>
                  <Ionicons
                    name={estOuverte ? 'chevron-up' : 'chevron-down'}
                    size={17}
                    color={colors.texteTertiaire}
                  />
                </Pressable>

                {estOuverte && <Text style={styles.reponse}>{item.r}</Text>}
              </View>
            );
          })}
        </Carte>

        <Text style={styles.titreSection}>{t('profil.conditions')}</Text>
        <Carte>
          <Text style={styles.cgu}>{t('aide.cguResume')}</Text>
        </Carte>

        <Text style={styles.version}>Sényi · {t('profil.version')} 1.0.0</Text>
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
  },
  iconeContact: {
    width: 40,
    height: 40,
    borderRadius: rayon.sm,
    backgroundColor: colors.blanc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTitre: { fontSize: 15, fontWeight: '700', color: colors.primaryTexte },
  petit: { fontSize: 12, color: colors.primaryTexte, marginTop: 2 },

  actions: { flexDirection: 'row', gap: espacement.sm },

  titreSection: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.texteTertiaire,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 4,
  },

  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.md,
  },
  questionTexte: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.texte },
  reponse: {
    fontSize: 13,
    color: colors.texteSecondaire,
    lineHeight: 20,
    paddingHorizontal: espacement.lg,
    paddingBottom: espacement.lg,
  },
  separateur: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bordure },

  cgu: { fontSize: 13, color: colors.texteSecondaire, lineHeight: 20 },
  version: { fontSize: 12, color: colors.texteTertiaire, textAlign: 'center' },
});
