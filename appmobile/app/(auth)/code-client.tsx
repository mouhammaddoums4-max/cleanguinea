import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../../src/i18n';
import { Bouton, Carte, Ecran, useHautBarreStatut } from '../../src/components/ui';
import { MarqueEnTete } from '../../src/components/MarqueEnTete';
import { colors, espacement, rayon } from '../../src/theme';

/**
 * Affiché juste après l'inscription.
 *
 * C'est le seul moment où le client voit son code de connexion dans
 * l'application. Il part aussi par SMS, mais un écran plein qu'on doit valider
 * explicitement évite qu'il file sans l'avoir lu.
 */
export default function CodeClient() {
  const router = useRouter();
  const { t } = useI18n();
  const hautBarre = useHautBarreStatut();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [copie, setCopie] = useState(false);

  async function copier() {
    await Clipboard.setStringAsync(code ?? '');
    setCopie(true);
  }

  return (
    <Ecran bas>
      <View style={[styles.conteneur, { paddingTop: hautBarre + espacement.xl }]}>
        <View style={styles.haut}>
          <MarqueEnTete taille={64} avecSlogan={false} />

          <View style={styles.succes}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            <Text style={styles.succesTexte}>{t('codeClient.compteCree')}</Text>
          </View>

          <Text style={styles.intro}>{t('codeClient.intro')}</Text>

          {/* Le code, en grand : c'est la seule chose à retenir de cet écran. */}
          <Carte style={styles.carteCode}>
            <Text style={styles.libelle}>{t('codeClient.votreCode')}</Text>
            <Text style={styles.code} selectable>
              {code}
            </Text>

            <Bouton
              titre={copie ? t('codeClient.copie') : t('codeClient.copier')}
              variante="contour"
              icone={copie ? 'checkmark' : 'copy-outline'}
              style={styles.boutonCopier}
              onPress={copier}
            />
          </Carte>

          <View style={styles.rappels}>
            <Rappel icone="chatbubble-outline" texte={t('codeClient.parSms')} />
            <Rappel icone="lock-closed-outline" texte={t('codeClient.pourSeConnecter')} />
            <Rappel icone="person-outline" texte={t('codeClient.retrouvable')} />
          </View>
        </View>

        <Bouton
          titre={t('codeClient.continuer')}
          icone="arrow-forward"
          onPress={() => router.replace('/(client)/accueil')}
        />
      </View>
    </Ecran>
  );
}

function Rappel({ icone, texte }: { icone: keyof typeof Ionicons.glyphMap; texte: string }) {
  return (
    <View style={styles.rappel}>
      <View style={styles.iconeRappel}>
        <Ionicons name={icone} size={15} color={colors.texteSecondaire} />
      </View>
      <Text style={styles.rappelTexte}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: espacement.lg,
    paddingBottom: espacement.xl,
  },
  haut: { gap: espacement.lg },

  succes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacement.sm,
  },
  succesTexte: { fontSize: 17, fontWeight: '700', color: colors.texte },
  intro: {
    fontSize: 14,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },

  carteCode: {
    alignItems: 'center',
    gap: espacement.sm,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
    paddingVertical: espacement.xl,
  },
  libelle: { fontSize: 12, color: colors.primaryTexte, letterSpacing: 0.5 },
  code: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryTexte,
    letterSpacing: 2,
  },
  boutonCopier: {
    marginTop: espacement.sm,
    backgroundColor: colors.blanc,
    borderColor: colors.primary,
    paddingHorizontal: espacement.xl,
  },

  rappels: { gap: espacement.md },
  rappel: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  iconeRappel: {
    width: 30,
    height: 30,
    borderRadius: rayon.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rappelTexte: { flex: 1, fontSize: 13, color: colors.texteSecondaire, lineHeight: 18 },
});
