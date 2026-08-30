import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, URL_API, lireJeton } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useI18n } from '../../src/i18n';
import { Bouton, Carte, Champ, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useEcranProtege } from '../../src/securite';

/**
 * Suppression de compte.
 *
 * Trois garde-fous délibérés avant l'appel : mot de passe, saisie exacte du mot de
 * confirmation, puis une alerte système. Une suppression ne doit pas pouvoir arriver
 * par un appui malheureux.
 */
export default function SupprimerCompte() {
  // Ecran sensible : ni capture, ni apercu dans les applications recentes.
  useEcranProtege();
  const router = useRouter();
  const { t, tListe } = useI18n();
  const { deconnexion } = useAuth();

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [exporte, setExporte] = useState(false);

  const motAttendu = t('suppression.motConfirmation');
  const pretASupprimer = motDePasse.length > 0 && confirmation.trim().toUpperCase() === motAttendu;

  const exporter = useMutation({
    mutationFn: async () => {
      // On vérifie que l'export répond avant d'annoncer quoi que ce soit.
      const jeton = await lireJeton();
      const reponse = await fetch(`${URL_API}/api/compte/donnees`, {
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
      return reponse.json();
    },
    onSuccess: (donnees) => {
      setExporte(true);
      const sections = Object.keys(donnees).length;
      Alert.alert(
        t('suppression.exportReussi'),
        `${sections} sections · ${donnees.missions?.length ?? 0} collectes · ${donnees.paiements?.length ?? 0} paiements`,
      );
    },
    onError: (e) => setErreur(e instanceof Error ? e.message : 'Export impossible'),
  });

  const supprimer = useMutation({
    mutationFn: () =>
      api<{ supprime: boolean; message: string }>('/api/compte', {
        method: 'DELETE',
        body: { motDePasse, confirmation: motAttendu === 'DELETE' ? 'DELETE' : 'SUPPRIMER' },
      }),
    onSuccess: async (rep) => {
      await deconnexion();
      Alert.alert(t('suppression.succes'), rep.message, [
        { text: 'OK', onPress: () => router.replace('/(auth)/bienvenue') },
      ]);
    },
    onError: (e) => setErreur(e instanceof Error ? e.message : t('suppression.echec')),
  });

  function demanderConfirmation() {
    setErreur(null);
    Alert.alert(t('suppression.confirmationTitre'), t('suppression.confirmationTexte'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('suppression.supprimerDefinitivement'),
        style: 'destructive',
        onPress: () => supprimer.mutate(),
      },
    ]);
  }

  return (
    <Ecran bas>
      <EnTete titre={t('suppression.titre')} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          <Carte style={styles.avertissement}>
            <View style={styles.ligneAvertissement}>
              <Ionicons name="warning" size={20} color={colors.danger} />
              <Text style={styles.avertissementTexte}>{t('suppression.avertissement')}</Text>
            </View>
          </Carte>

          <Carte style={{ gap: espacement.sm }}>
            <Text style={styles.titreBloc}>{t('suppression.ceQuiEstSupprime')}</Text>
            {tListe('suppression.listeSupprime').map((ligne) => (
              <View key={ligne} style={styles.puce}>
                <Ionicons name="close-circle" size={16} color={colors.danger} />
                <Text style={styles.puceTexte}>{ligne}</Text>
              </View>
            ))}
          </Carte>

          <Carte style={{ gap: espacement.sm }}>
            <Text style={styles.titreBloc}>{t('suppression.ceQuiEstConserve')}</Text>
            {tListe('suppression.listeConserve').map((ligne) => (
              <View key={ligne} style={styles.puce}>
                <Ionicons name="archive-outline" size={16} color={colors.texteSecondaire} />
                <Text style={styles.puceTexte}>{ligne}</Text>
              </View>
            ))}
            <Text style={styles.note}>{t('suppression.consequences')}</Text>
          </Carte>

          <Bouton
            titre={t('suppression.exporter')}
            variante="contour"
            icone={exporte ? 'checkmark-circle-outline' : 'download-outline'}
            charge={exporter.isPending}
            onPress={() => exporter.mutate()}
          />

          <Carte style={{ gap: espacement.md }}>
            <Champ
              libelle={t('suppression.motDePasse')}
              icone="lock-closed-outline"
              secureTextEntry
              value={motDePasse}
              onChangeText={(v) => {
                setMotDePasse(v);
                setErreur(null);
              }}
            />

            <Champ
              libelle={t('suppression.tapezPourConfirmer', { mot: motAttendu })}
              icone="create-outline"
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={motAttendu}
              value={confirmation}
              onChangeText={(v) => {
                setConfirmation(v);
                setErreur(null);
              }}
            />
          </Carte>

          {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

          <Bouton
            titre={t('suppression.supprimerDefinitivement')}
            icone="trash-outline"
            onPress={demanderConfirmation}
            charge={supprimer.isPending}
            desactive={!pretASupprimer}
            style={styles.boutonDanger}
          />

          <Bouton
            titre={t('commun.annuler')}
            variante="texte"
            onPress={() => router.back()}
          />
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  avertissement: { backgroundColor: colors.dangerClair, borderColor: colors.dangerClair },
  ligneAvertissement: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  avertissementTexte: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.danger },
  titreBloc: { fontSize: 14, fontWeight: '700', color: colors.texte },
  puce: { flexDirection: 'row', alignItems: 'flex-start', gap: espacement.sm },
  puceTexte: { flex: 1, fontSize: 13, color: colors.texteSecondaire, lineHeight: 19 },
  note: { fontSize: 12, color: colors.texteTertiaire, marginTop: espacement.sm, lineHeight: 18 },
  erreur: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerClair,
    padding: espacement.md,
    borderRadius: 8,
  },
  boutonDanger: { backgroundColor: colors.danger },
});
