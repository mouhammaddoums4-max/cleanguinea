import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/auth';
import { Bouton, Champ, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { MarqueEnTete } from '../../src/components/MarqueEnTete';
import { colors, espacement, rayon } from '../../src/theme';
import { useI18n } from '../../src/i18n';
import { useConfig } from '../../src/config';

/** Ecran 2 des maquettes : creation de compte client. */
export default function Inscription() {
  const router = useRouter();
  const { inscription } = useAuth();
  const { t, langue } = useI18n();
  const { indicatif } = useConfig();

  const [f, setF] = useState({
    nom: '', telephone: '', email: '', adresse: '', commune: '', quartier: '', motDePasse: '',
  });
  const [cgu, setCgu] = useState(false);
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const maj = (cle: keyof typeof f) => (valeur: string) => setF((p) => ({ ...p, [cle]: valeur }));

  const complet =
    f.nom.length > 1 &&
    f.telephone.length >= 8 &&
    f.adresse.length > 2 &&
    f.commune.length > 1 &&
    f.quartier.length > 1 &&
    f.motDePasse.length >= 6 &&
    cgu;

  async function valider() {
    setErreur(null);
    setEnvoi(true);
    try {
      const { codeClient } = await inscription({
        ...f,
        email: f.email || undefined,
        langue,
        cguAcceptees: true,
      });
      router.replace({ pathname: '/(auth)/code-client', params: { code: codeClient } });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : t('inscription.echec'));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Ecran bas>
      <EnTete titre={t('inscription.titre')} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          {/* Slogan omis ici : le formulaire est long, on garde l'ecran compact. */}
          <MarqueEnTete taille={60} avecSlogan={false} />

          <Champ
            icone="person-outline"
            placeholder={t('inscription.nomComplet')}
            value={f.nom}
            onChangeText={maj('nom')}
            autoComplete="name"
          />

          <View style={styles.ligneTel}>
            <View style={styles.indicatif}>
              <Text style={styles.indicatifTexte}>{indicatif}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Champ
                icone="call-outline"
                placeholder={t('inscription.telephone')}
                keyboardType="phone-pad"
                value={f.telephone}
                onChangeText={maj('telephone')}
              />
            </View>
          </View>

          <Champ
            icone="mail-outline"
            placeholder={t('inscription.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            value={f.email}
            onChangeText={maj('email')}
          />
          <Champ
            icone="location-outline"
            placeholder={t('inscription.adresse')}
            value={f.adresse}
            onChangeText={maj('adresse')}
          />
          <Champ
            icone="business-outline"
            placeholder={t('inscription.commune')}
            value={f.commune}
            onChangeText={maj('commune')}
          />
          <Champ
            icone="map-outline"
            placeholder={t('inscription.quartier')}
            value={f.quartier}
            onChangeText={maj('quartier')}
          />

          <View>
            <Champ
              icone="lock-closed-outline"
              placeholder={t('inscription.motDePasse')}
              secureTextEntry={!visible}
              value={f.motDePasse}
              onChangeText={maj('motDePasse')}
            />
            <Pressable onPress={() => setVisible((v) => !v)} style={styles.oeil} hitSlop={10}>
              <Ionicons
                name={visible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.texteTertiaire}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setCgu((c) => !c)}
            style={styles.cgu}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cgu }}
          >
            <View style={[styles.case, cgu && styles.caseCochee]}>
              {cgu && <Ionicons name="checkmark" size={14} color={colors.blanc} />}
            </View>
            <Text style={styles.cguTexte}>{t('inscription.accepterCgu')}</Text>
          </Pressable>

          {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

          <Bouton
            titre={t('inscription.valider')}
            onPress={valider}
            charge={envoi}
            desactive={!complet}
          />

          <Bouton
            titre={t('inscription.dejaCompte')}
            variante="texte"
            onPress={() => router.replace('/(auth)/connexion')}
          />
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligneTel: { flexDirection: 'row', gap: espacement.sm, alignItems: 'center' },
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
  oeil: { position: 'absolute', right: espacement.md, top: 15 },
  cgu: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  case: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseCochee: { backgroundColor: colors.primary, borderColor: colors.primary },
  cguTexte: { fontSize: 14, color: colors.texteSecondaire },
  erreur: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerClair,
    padding: espacement.md,
    borderRadius: 8,
  },
});
