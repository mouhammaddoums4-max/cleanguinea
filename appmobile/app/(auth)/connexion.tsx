import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/auth';
import { useI18n } from '../../src/i18n';
import { useConfig } from '../../src/config';
import { Bouton, Champ, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { MarqueEnTete } from '../../src/components/MarqueEnTete';
import { colors, espacement, rayon } from '../../src/theme';

/**
 * Connexion unique, client comme collecteur.
 *
 * Un seul champ : le numero de telephone. Il est unique par personne, donc
 * inutile de demander « etes-vous client ou collecteur ? » — le serveur
 * renvoie le role et l'application oriente vers le bon espace.
 *
 * Le serveur accepte aussi le code client (CG-...) et le numero employe
 * (COL-...) : un collecteur habitue a saisir son matricule n'est pas bloque.
 */
export default function Connexion() {
  const router = useRouter();
  const { connexion } = useAuth();
  const { t } = useI18n();
  const { indicatif } = useConfig();

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function valider() {
    setErreur(null);
    setEnvoi(true);
    try {
      const u = await connexion({ identifiant: identifiant.trim(), motDePasse });
      // C'est le role renvoye par le serveur qui decide de la destination.
      router.replace(
        u.role === 'CLIENT' ? '/(client)/accueil' : '/(collecteur)/tableau-de-bord',
      );
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
          <MarqueEnTete />

          <Text style={styles.intro}>{t('connexion.introClient')}</Text>

          <View style={styles.ligneTel}>
            <View style={styles.indicatif}>
              <Text style={styles.indicatifTexte}>{indicatif}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Champ
                libelle={t('connexion.telephone')}
                icone="call-outline"
                placeholder="6XX XX XX XX"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={identifiant}
                onChangeText={(v) => {
                  setIdentifiant(v);
                  setErreur(null);
                }}
              />
            </View>
          </View>

          <View>
            <Champ
              libelle={t('connexion.motDePasse')}
              icone="lock-closed-outline"
              placeholder={t('connexion.motDePasse')}
              secureTextEntry={!visible}
              autoComplete="current-password"
              value={motDePasse}
              onChangeText={(v) => {
                setMotDePasse(v);
                setErreur(null);
              }}
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
            desactive={!identifiant.trim() || !motDePasse}
          />

          <View style={styles.aide}>
            <Ionicons name="information-circle-outline" size={15} color={colors.texteTertiaire} />
            <Text style={styles.aideTexte}>{t('connexion.aideClient')}</Text>
          </View>

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

  ligneTel: { flexDirection: 'row', gap: espacement.sm, alignItems: 'flex-end' },
  indicatif: {
    height: 50,
    paddingHorizontal: espacement.md,
    borderRadius: rayon.md,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  indicatifTexte: { fontSize: 15, fontWeight: '600', color: colors.texte },

  oeil: { position: 'absolute', right: espacement.md, top: 36 },
  erreur: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerClair,
    padding: espacement.md,
    borderRadius: 8,
  },
  aide: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  aideTexte: { flex: 1, fontSize: 12, color: colors.texteTertiaire, lineHeight: 17 },
});
