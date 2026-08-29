import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useI18n, LANGUES } from '../../src/i18n';
import { Carte, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';

type Entree = {
  icone: keyof typeof Ionicons.glyphMap;
  libelle: string;
  valeur?: string;
  route?: string;
  danger?: boolean;
  action?: () => void;
};

/** Ecran 8 des maquettes : profil et reglages. */
export default function Profil() {
  const router = useRouter();
  const { utilisateur, deconnexion } = useAuth();
  const { t, langue } = useI18n();

  const profil = useQuery({
    queryKey: ['moi'],
    queryFn: () => api<{ client: { adresse: string } | null }>('/api/auth/moi'),
  });

  function confirmerDeconnexion() {
    Alert.alert(t('profil.seDeconnecter'), t('profil.confirmerDeconnexion'), [
      { text: t('commun.annuler'), style: 'cancel' },
      {
        text: t('profil.seDeconnecter'),
        style: 'destructive',
        onPress: async () => {
          await deconnexion();
          router.replace('/(auth)/bienvenue');
        },
      },
    ]);
  }

  const libelleLangue = LANGUES.find((l) => l.code === langue)?.libelle ?? langue;

  const entrees: Entree[] = [
    { icone: 'person-outline', libelle: t('profil.mesInformations') },
    { icone: 'card-outline', libelle: t('profil.monAbonnement'), route: '/(client)/paiements' },
    { icone: 'cube-outline', libelle: t('profil.mesBacs'), route: '/(client)/collectes' },
    { icone: 'leaf-outline', libelle: t('profil.mesPoints'), route: '/(client)/points' },
    {
      icone: 'language-outline',
      libelle: t('profil.langue'),
      valeur: libelleLangue,
      route: '/(client)/langue',
    },
    { icone: 'notifications-outline', libelle: t('profil.notifications') },
    { icone: 'help-circle-outline', libelle: t('profil.aide') },
    { icone: 'settings-outline', libelle: t('profil.parametres') },
    {
      icone: 'log-out-outline',
      libelle: t('profil.seDeconnecter'),
      danger: true,
      action: confirmerDeconnexion,
    },
  ];

  return (
    <Ecran>
      <EnTete titre={t('profil.titre')} />
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
              {!!e.valeur && <Text style={styles.entreeValeur}>{e.valeur}</Text>}
              {!e.danger && (
                <Ionicons name="chevron-forward" size={18} color={colors.texteTertiaire} />
              )}
            </Pressable>
          ))}
        </Carte>

        {/* Isole du reste : une suppression de compte ne doit pas voisiner
            avec des reglages anodins. */}
        <Pressable
          onPress={() => router.push('/(client)/supprimer-compte')}
          style={({ pressed }) => [styles.suppression, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.suppressionTexte}>{t('profil.supprimerCompte')}</Text>
        </Pressable>

        <Text style={styles.version}>Clean Guinée · {t('profil.version')} 1.0.0</Text>
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
  entreeValeur: { fontSize: 13, color: colors.texteSecondaire },
  suppression: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacement.sm,
    paddingVertical: espacement.md,
  },
  suppressionTexte: { fontSize: 13, color: colors.danger, fontWeight: '500' },
  version: { fontSize: 12, color: colors.texteTertiaire, textAlign: 'center' },
});
