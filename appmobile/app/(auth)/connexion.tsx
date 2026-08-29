import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/auth';
import { Bouton, Champ, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useI18n } from '../../src/i18n';
import { useConfig } from '../../src/config';

export default function Connexion() {
  const router = useRouter();
  const { connexion } = useAuth();
  const { t } = useI18n();
  const { indicatif } = useConfig();

  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function valider() {
    setErreur(null);
    setEnvoi(true);
    try {
      const u = await connexion({ telephone, motDePasse });
      router.replace(u.role === 'CLIENT' ? '/(client)/accueil' : '/(collecteur)/missions');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t('connexion.echec'));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran bas>
      <EnTete titre={t('connexion.titre')} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          <Text style={styles.intro}>{t('connexion.intro')}</Text>

          <Champ
            libelle={t('connexion.telephone')}
            icone="call-outline"
            placeholder={`${indicatif} 6XX XX XX XX`}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={telephone}
            onChangeText={setTelephone}
          />

          <View>
            <Champ
              libelle={t('connexion.motDePasse')}
              icone="lock-closed-outline"
              placeholder={t('connexion.motDePasse')}
              secureTextEntry={!visible}
              autoComplete="current-password"
              value={motDePasse}
              onChangeText={setMotDePasse}
            />
            <Pressable
              onPress={() => setVisible((v) => !v)}
              style={styles.oeil}
              hitSlop={10}
              accessibilityLabel={
                visible ? t('connexion.masquerMotDePasse') : t('connexion.afficherMotDePasse')
              }
            >
              <Ionicons
                name={visible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.texteTertiaire}
              />
            </Pressable>
          </View>

          {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

          <Bouton
            titre={t('connexion.valider')}
            onPress={valider}
            charge={envoi}
            desactive={!telephone || !motDePasse}
          />

          <Bouton
            titre={t('connexion.pasDeCompte')}
            variante="texte"
            onPress={() => router.replace('/(auth)/inscription')}
          />
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.texteSecondaire, lineHeight: 20 },
  oeil: { position: 'absolute', right: espacement.md, top: 36 },
  erreur: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerClair,
    padding: espacement.md,
    borderRadius: 8,
  },
});
