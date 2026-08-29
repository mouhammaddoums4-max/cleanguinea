import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Bouton, Carte, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';

type Moi = {
  utilisateur: { nom: string; telephone: string };
  collecteur?: { matricule: string; vehicule: string | null; note: number; nbEvaluations: number };
};

export default function ProfilCollecteur() {
  const router = useRouter();
  const { utilisateur, deconnexion } = useAuth();

  const moi = useQuery({ queryKey: ['moi'], queryFn: () => api<Moi>('/api/auth/moi') });
  const c = moi.data?.collecteur;

  return (
    <Ecran>
      <EnTete titre="Profil" />
      <Contenu>
        <Carte style={styles.identite}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nom}>{utilisateur?.nom}</Text>
            <Text style={styles.petit}>{utilisateur?.telephone}</Text>
          </View>
          {!!c && (
            <View style={styles.note}>
              <Ionicons name="star" size={14} color={colors.alerte} />
              <Text style={styles.noteTexte}>{c.note.toFixed(1)}</Text>
            </View>
          )}
        </Carte>

        {!!c && (
          <Carte style={{ gap: espacement.md }}>
            {[
              { libelle: 'Matricule', valeur: c.matricule },
              { libelle: 'Véhicule', valeur: c.vehicule ?? '—' },
              { libelle: 'Évaluations reçues', valeur: String(c.nbEvaluations) },
            ].map((l) => (
              <View key={l.libelle} style={styles.ligne}>
                <Text style={styles.libelle}>{l.libelle}</Text>
                <Text style={styles.valeur}>{l.valeur}</Text>
              </View>
            ))}
          </Carte>
        )}

        <Bouton
          titre="Se déconnecter"
          variante="contour"
          icone="log-out-outline"
          onPress={() =>
            Alert.alert('Se déconnecter', 'Quitter votre session ?', [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Se déconnecter',
                style: 'destructive',
                onPress: async () => {
                  await deconnexion();
                  router.replace('/(auth)/bienvenue');
                },
              },
            ])
          }
        />
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  identite: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: { fontSize: 17, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteTexte: { fontSize: 14, fontWeight: '700', color: colors.texte },
  ligne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  libelle: { fontSize: 14, color: colors.texteSecondaire },
  valeur: { fontSize: 14, fontWeight: '600', color: colors.texte },
});
