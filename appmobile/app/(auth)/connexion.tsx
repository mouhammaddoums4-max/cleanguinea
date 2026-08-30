import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../src/auth';
import { useI18n } from '../../src/i18n';
import { Bouton, Champ, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { MarqueEnTete } from '../../src/components/MarqueEnTete';
import { colors, espacement, rayon } from '../../src/theme';

type Profil = 'CLIENT' | 'COLLECTEUR';

/**
 * Connexion unique pour les deux profils, comme sur la maquette.
 *
 * L'identifiant change selon le profil choisi :
 *   - client     : numero d'abonnement, CG-2026-000001
 *   - collecteur : numero employe, COL-001
 *
 * Le serveur resout les deux formes (et le telephone), mais le choix ici sert
 * l'utilisateur : il oriente le clavier, l'exemple affiche et l'aide.
 */
export default function Connexion() {
  const router = useRouter();
  const { connexion } = useAuth();
  const { t } = useI18n();

  const [profil, setProfil] = useState<Profil>('CLIENT');
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const estClient = profil === 'CLIENT';

  function changerProfil(p: Profil) {
    setProfil(p);
    setIdentifiant('');
    setErreur(null);
  }

  async function valider() {
    setErreur(null);
    setEnvoi(true);
    try {
      const u = await connexion({ identifiant: identifiant.trim(), motDePasse });
      router.replace(u.role === 'CLIENT' ? '/(client)/accueil' : '/(collecteur)/zones');
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

          {/* Sélecteur de profil */}
          <View style={styles.selecteur}>
            {(
              [
                { cle: 'CLIENT' as const, icone: 'person' as const, libelle: t('connexion.profilClient') },
                { cle: 'COLLECTEUR' as const, icone: 'car' as const, libelle: t('connexion.profilCollecteur') },
              ]
            ).map((p) => {
              const actif = profil === p.cle;
              return (
                <Pressable
                  key={p.cle}
                  onPress={() => changerProfil(p.cle)}
                  style={[styles.onglet, actif && styles.ongletActif]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: actif }}
                >
                  <Ionicons
                    name={p.icone}
                    size={17}
                    color={actif ? colors.blanc : colors.texteSecondaire}
                  />
                  <Text style={[styles.ongletTexte, actif && styles.ongletTexteActif]}>
                    {p.libelle}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.intro}>
            {estClient ? t('connexion.introClient') : t('connexion.introCollecteur')}
          </Text>

          <Champ
            libelle={estClient ? t('connexion.numeroAbonnement') : t('connexion.numeroEmploye')}
            icone={estClient ? 'card-outline' : 'id-card-outline'}
            placeholder={estClient ? 'CG-2026-000001' : 'COL-001'}
            autoCapitalize="characters"
            autoCorrect={false}
            value={identifiant}
            onChangeText={(v) => {
              setIdentifiant(v);
              setErreur(null);
            }}
          />

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
            <Text style={styles.aideTexte}>
              {estClient ? t('connexion.aideClient') : t('connexion.aideCollecteur')}
            </Text>
          </View>

          {estClient && (
            <Bouton
              titre={t('connexion.pasDeCompte')}
              variante="texte"
              onPress={() => router.replace('/(auth)/inscription')}
            />
          )}
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  selecteur: {
    flexDirection: 'row',
    gap: espacement.sm,
    backgroundColor: colors.surfaceAlt,
    padding: 4,
    borderRadius: rayon.md,
  },
  onglet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: rayon.sm,
  },
  ongletActif: { backgroundColor: colors.primary },
  ongletTexte: { fontSize: 14, fontWeight: '600', color: colors.texteSecondaire },
  ongletTexteActif: { color: colors.blanc },

  intro: { fontSize: 14, color: colors.texteSecondaire, lineHeight: 20 },
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
