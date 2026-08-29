import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Carte, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

type Entree = {
  icone: keyof typeof Ionicons.glyphMap;
  libelle: string;
  route?: string;
  danger?: boolean;
  action?: () => void;
};

/** Ecran 8 des maquettes : profil et reglages. */
export default function Profil() {
  const router = useRouter();
  const { utilisateur, deconnexion } = useAuth();

  const profil = useQuery({
    queryKey: ['moi'],
    queryFn: () => api<{ client: { adresse: string } | null }>('/api/auth/moi'),
  });

  function confirmerDeconnexion() {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment quitter votre session ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await deconnexion();
          router.replace('/(auth)/bienvenue');
        },
      },
    ]);
  }

  const entrees: Entree[] = [
    { icone: 'person-outline', libelle: 'Mes informations' },
    { icone: 'card-outline', libelle: 'Mon abonnement', route: '/(client)/paiements' },
    { icone: 'cube-outline', libelle: 'Mes bacs', route: '/(client)/collectes' },
    { icone: 'leaf-outline', libelle: 'Mes points Clean', route: '/(client)/points' },
    { icone: 'notifications-outline', libelle: 'Notifications' },
    { icone: 'help-circle-outline', libelle: 'Aide & FAQ' },
    { icone: 'settings-outline', libelle: 'Paramètres' },
    { icone: 'log-out-outline', libelle: 'Se déconnecter', danger: true, action: confirmerDeconnexion },
  ];

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
            {!!profil.data?.client?.adresse && (
              <Text style={styles.petit}>{profil.data.client.adresse}</Text>
            )}
          </View>
        </Carte>

        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {entrees.map((e, i) => (
            <Pressable
              key={e.libelle}
              onPress={e.action ?? (e.route ? () => router.push(e.route as never) : undefined)}
              style={({ pressed }) => [
                styles.entree,
                i > 0 && styles.separateur,
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name={e.icone}
                size={20}
                color={e.danger ? colors.danger : colors.texteSecondaire}
              />
              <Text style={[styles.entreeLibelle, e.danger && { color: colors.danger }]}>
                {e.libelle}
              </Text>
              {!e.danger && (
                <Ionicons name="chevron-forward" size={18} color={colors.texteTertiaire} />
              )}
            </Pressable>
          ))}
        </Carte>

        <Text style={styles.version}>Clean Guinée · version 1.0.0</Text>
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
  entree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.lg,
  },
  separateur: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bordure },
  entreeLibelle: { flex: 1, fontSize: 15, color: colors.texte },
  version: { fontSize: 12, color: colors.texteTertiaire, textAlign: 'center' },
});
