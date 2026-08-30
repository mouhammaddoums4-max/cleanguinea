import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api, ErreurApi } from '../../src/api';
import { useI18n } from '../../src/i18n';
import { Bouton, Champ, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { MarqueEnTete } from '../../src/components/MarqueEnTete';
import { colors, espacement, rayon } from '../../src/theme';
import { useEcranProtege } from '../../src/securite';

/**
 * Mot de passe oublie, en trois etapes sur un seul ecran.
 *
 * Un seul ecran et non trois routes : l'utilisateur quitte l'application pour
 * lire son SMS et y revient. Empiler des ecrans ferait perdre l'identifiant
 * saisi a chaque aller-retour, sur des telephones qui tuent volontiers les
 * applications en arriere-plan.
 *
 * Le serveur repond la meme chose que le compte existe ou non. L'ecran passe
 * donc toujours a l'etape du code : lui dire « numero inconnu » supposerait une
 * information que l'API refuse — a raison — de donner.
 */

type Etape = 'identifiant' | 'code' | 'nouveau' | 'termine';

const LONGUEUR_CODE = 6;

export default function MotDePasseOublie() {
  // Ecran sensible : ni capture, ni apercu dans les applications recentes.
  useEcranProtege();
  const router = useRouter();
  const { t } = useI18n();

  const [etape, setEtape] = useState<Etape>('identifiant');
  const [identifiant, setIdentifiant] = useState('');
  const [code, setCode] = useState('');
  const [jeton, setJeton] = useState<string | null>(null);
  const [validite, setValidite] = useState(10);
  const [essais, setEssais] = useState<number | null>(null);

  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);

  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const champCode = useRef<TextInput>(null);

  // Le clavier s'ouvre sur le champ du code des l'arrivee a l'etape : le
  // geste attendu apres avoir lu le SMS est de taper, pas de viser un champ.
  useEffect(() => {
    if (etape === 'code') {
      const minuteur = setTimeout(() => champCode.current?.focus(), 350);
      return () => clearTimeout(minuteur);
    }
  }, [etape]);

  function messageErreur(e: unknown) {
    return e instanceof Error ? e.message : t('oubli.echec');
  }

  async function demanderCode() {
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await api<{ validiteMinutes: number }>('/api/mot-de-passe/demande', {
        method: 'POST',
        sansAuth: true,
        body: { identifiant: identifiant.trim() },
      });
      setValidite(r.validiteMinutes);
      setCode('');
      setEssais(null);
      setEtape('code');
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  async function verifier(saisi: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await api<{ jeton: string }>('/api/mot-de-passe/verifier', {
        method: 'POST',
        sansAuth: true,
        body: { identifiant: identifiant.trim(), code: saisi },
      });
      setJeton(r.jeton);
      setEtape('nouveau');
    } catch (e) {
      const restants =
        e instanceof ErreurApi && typeof e.corps?.essaisRestants === 'number'
          ? e.corps.essaisRestants
          : null;
      setEssais(restants);
      setCode('');
      setErreur(messageErreur(e));
      champCode.current?.focus();
    } finally {
      setEnvoi(false);
    }
  }

  async function enregistrer() {
    if (nouveau.length < 6) return setErreur(t('oubli.tropCourt'));
    if (nouveau !== confirmation) return setErreur(t('oubli.differents'));

    setErreur(null);
    setEnvoi(true);
    try {
      await api('/api/mot-de-passe/reinitialiser', {
        method: 'POST',
        sansAuth: true,
        body: { jeton, nouveau },
      });
      setEtape('termine');
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran bas>
      <EnTete titre={t('oubli.titre')} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          <MarqueEnTete avecSlogan={false} />

          {etape === 'identifiant' && (
            <>
              <Text style={styles.intro}>{t('oubli.introIdentifiant')}</Text>
              <Champ
                libelle={t('oubli.identifiant')}
                icone="call-outline"
                placeholder="6XX XX XX XX"
                keyboardType="default"
                autoCapitalize="characters"
                autoCorrect={false}
                value={identifiant}
                onChangeText={(v) => {
                  setIdentifiant(v);
                  setErreur(null);
                }}
                onSubmitEditing={() => identifiant.trim() && demanderCode()}
                returnKeyType="send"
              />
              {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
              <Bouton
                titre={t('oubli.envoyerCode')}
                onPress={demanderCode}
                charge={envoi}
                desactive={identifiant.trim().length < 3}
              />
            </>
          )}

          {etape === 'code' && (
            <>
              <Text style={styles.intro}>
                {t('oubli.introCode').replace('{n}', String(validite))}
              </Text>

              <TextInput
                ref={champCode}
                value={code}
                onChangeText={(v) => {
                  const chiffres = v.replace(/\D/g, '').slice(0, LONGUEUR_CODE);
                  setCode(chiffres);
                  setErreur(null);
                  // Verification automatique au sixieme chiffre : personne ne
                  // cherche un bouton apres avoir recopie un code de SMS.
                  if (chiffres.length === LONGUEUR_CODE) verifier(chiffres);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={LONGUEUR_CODE}
                editable={!envoi}
                accessibilityLabel={t('oubli.code')}
                style={styles.champCode}
              />

              {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
              {essais !== null && essais > 0 && (
                <Text style={styles.essais}>
                  {t('oubli.essaisRestants').replace('{n}', String(essais))}
                </Text>
              )}

              <Bouton
                titre={t('oubli.verifier')}
                onPress={() => verifier(code)}
                charge={envoi}
                desactive={code.length !== LONGUEUR_CODE}
              />
              <Bouton titre={t('oubli.renvoyer')} variante="contour" onPress={demanderCode} />
              <Bouton
                titre={t('oubli.changerNumero')}
                variante="texte"
                onPress={() => {
                  setCode('');
                  setErreur(null);
                  setEssais(null);
                  setEtape('identifiant');
                }}
              />
            </>
          )}

          {etape === 'nouveau' && (
            <>
              <Text style={styles.intro}>{t('oubli.introNouveau')}</Text>

              <View>
                <Champ
                  libelle={t('oubli.nouveau')}
                  icone="lock-closed-outline"
                  secureTextEntry={!visible}
                  autoComplete="new-password"
                  value={nouveau}
                  onChangeText={(v) => {
                    setNouveau(v);
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

              <Champ
                libelle={t('oubli.confirmation')}
                icone="lock-closed-outline"
                secureTextEntry={!visible}
                autoComplete="new-password"
                value={confirmation}
                onChangeText={(v) => {
                  setConfirmation(v);
                  setErreur(null);
                }}
                onSubmitEditing={enregistrer}
                returnKeyType="done"
              />

              {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

              <Bouton
                titre={t('oubli.valider')}
                onPress={enregistrer}
                charge={envoi}
                desactive={!nouveau || !confirmation}
              />
            </>
          )}

          {etape === 'termine' && (
            <View style={styles.fin}>
              <View style={styles.rond}>
                <Ionicons name="checkmark" size={34} color={colors.blanc} />
              </View>
              <Text style={styles.finTitre}>{t('oubli.reussi')}</Text>
              <Text style={styles.finTexte}>{t('oubli.reussiTexte')}</Text>
              <Bouton
                titre={t('oubli.retourConnexion')}
                onPress={() => router.replace('/(auth)/connexion')}
                style={{ alignSelf: 'stretch' }}
              />
            </View>
          )}

          {etape !== 'termine' && (
            <View style={styles.aide}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color={colors.texteTertiaire}
              />
              <Text style={styles.aideTexte}>{t('oubli.note')}</Text>
            </View>
          )}
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.texteSecondaire, lineHeight: 20 },

  champCode: {
    height: 62,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.surface,
    borderRadius: rayon.md,
    textAlign: 'center',
    // Chasse fixe et lettres espacees : on relit six chiffres en les comparant
    // a un SMS, pas en les lisant comme un mot.
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 10,
    color: colors.texte,
  },
  essais: { fontSize: 12, color: colors.texteTertiaire, textAlign: 'center' },

  oeil: { position: 'absolute', right: espacement.md, top: 36 },
  erreur: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerClair,
    padding: espacement.md,
    borderRadius: 8,
  },

  fin: { alignItems: 'center', gap: espacement.md, paddingVertical: espacement.lg },
  rond: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finTitre: { fontSize: 19, fontWeight: '700', color: colors.texte },
  finTexte: {
    fontSize: 14,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },

  aide: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  aideTexte: { flex: 1, fontSize: 12, color: colors.texteTertiaire, lineHeight: 17 },
});
