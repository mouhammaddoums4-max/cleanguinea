import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useConfig } from '../../src/config';
import { useI18n, useFormat, LANGUES } from '../../src/i18n';
import { Carte, Contenu, Ecran, EnTete, Etiquette } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

type Entree = {
  icone: keyof typeof Ionicons.glyphMap;
  libelle: string;
  valeur?: string;
  route?: string;
  action?: () => void;
  danger?: boolean;
};

type Moi = {
  utilisateur: { identifiant?: string | null };
  client: { adresse: string; quartier: { nom: string; commune: { nom: string } } } | null;
};

export default function Profil() {
  const router = useRouter();
  const { utilisateur, deconnexion } = useAuth();
  const { t, langue } = useI18n();
  const format = useFormat();
  const { devise } = useConfig();

  const moi = useQuery({ queryKey: ['moi'], queryFn: () => api<Moi>('/api/auth/moi') });

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

  /**
   * Réglages groupés par intention plutôt qu'en liste continue : on cherche
   * « mon abonnement » ou « la langue », pas la douzième ligne d'un menu.
   */
  const sections: { titre: string; entrees: Entree[] }[] = [
    {
      titre: t('profil.sectionCompte'),
      entrees: [
        {
          icone: 'person-outline',
          libelle: t('profil.mesInformations'),
          route: '/(client)/mes-informations',
        },
        {
          icone: 'card-outline',
          libelle: t('profil.monAbonnement'),
          route: '/(client)/abonnement',
        },
        {
          icone: 'checkmark-done-outline',
          libelle: t('confirmation.titre'),
          route: '/(client)/confirmations',
        },
        { icone: 'cube-outline', libelle: t('profil.mesBacs'), route: '/(client)/collectes' },
        // L'historique a son propre onglet : le rappeler ici n'ajouterait
        // qu'un detour vers un ecran deja a portee de pouce.
      ],
    },
    {
      titre: t('profil.sectionPreferences'),
      entrees: [
        {
          icone: 'language-outline',
          libelle: t('profil.langue'),
          valeur: libelleLangue,
          route: '/(client)/langue',
        },
        {
          icone: 'notifications-outline',
          libelle: t('profil.notifications'),
          route: '/(client)/notifications',
        },
      ],
    },
    {
      titre: t('profil.sectionSupport'),
      entrees: [
        {
          icone: 'help-circle-outline',
          libelle: t('profil.aide'),
          route: '/(client)/aide',
        },
        {
          icone: 'call-outline',
          libelle: t('profil.contacterService'),
          action: () => Linking.openURL('tel:+224621000000'),
        },
        {
          icone: 'document-text-outline',
          libelle: t('profil.conditions'),
          route: '/(client)/aide',
        },
      ],
    },
    {
      titre: t('profil.sectionSession'),
      entrees: [
        {
          icone: 'log-out-outline',
          libelle: t('profil.seDeconnecter'),
          action: confirmerDeconnexion,
          danger: true,
        },
      ],
    },
  ];

  const initiales = (utilisateur?.nom ?? '')
    .split(' ')
    .slice(0, 2)
    .map((m) => m[0])
    .join('')
    .toUpperCase();

  return (
    <Ecran>
      <EnTete titre={t('profil.titre')} />
      <Contenu>
        {/* Identité */}
        <Carte style={styles.identite}>
          <View style={styles.avatar}>
            <Text style={styles.initiales}>{initiales || '?'}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.nom}>{utilisateur?.nom}</Text>
            <Text style={styles.petit}>{utilisateur?.telephone}</Text>
            {!!moi.data?.client && (
              <Text style={styles.petit}>
                {moi.data.client.quartier.nom} · {moi.data.client.quartier.commune.nom}
              </Text>
            )}
          </View>
        </Carte>

        {/* Numéro d'abonnement : c'est l'identifiant de connexion, il doit être
            retrouvable sans fouiller. */}
        {!!moi.data?.utilisateur.identifiant && (
          <Carte style={styles.abonnement}>
            <View style={{ flex: 1 }}>
              <Text style={styles.abonnementLibelle}>{t('connexion.numeroAbonnement')}</Text>
              <Text style={styles.abonnementValeur}>{moi.data.utilisateur.identifiant}</Text>
            </View>
            <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
          </Carte>
        )}

        {/* Sections de réglages */}
        {sections.map((section) => (
          <View key={section.titre} style={{ gap: espacement.sm }}>
            <Text style={styles.titreSection}>{section.titre}</Text>

            <Carte style={{ padding: 0, overflow: 'hidden' }}>
              {section.entrees.map((e, i) => (
                <Pressable
                  key={e.libelle}
                  onPress={
                    e.action ?? (e.route ? () => router.push(e.route as never) : undefined)
                  }
                  disabled={!e.action && !e.route}
                  style={({ pressed }) => [
                    styles.entree,
                    i > 0 && styles.separateur,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.iconeEntree,
                      e.danger && { backgroundColor: colors.dangerClair },
                    ]}
                  >
                    <Ionicons
                      name={e.icone}
                      size={17}
                      color={e.danger ? colors.danger : colors.texteSecondaire}
                    />
                  </View>

                  <Text style={[styles.entreeLibelle, e.danger && { color: colors.danger }]}>
                    {e.libelle}
                  </Text>

                  {!!e.valeur && <Text style={styles.entreeValeur}>{e.valeur}</Text>}

                  {!e.danger && (
                    <Ionicons name="chevron-forward" size={17} color={colors.texteTertiaire} />
                  )}
                </Pressable>
              ))}
            </Carte>
          </View>
        ))}

        {/* Isolé du reste : une suppression de compte ne doit pas voisiner
            avec des réglages anodins. */}
        <Pressable
          onPress={() => router.push('/(client)/supprimer-compte')}
          style={({ pressed }) => [styles.suppression, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initiales: { fontSize: 19, fontWeight: '800', color: colors.blanc },
  nom: { fontSize: 17, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },

  abonnement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
  },
  abonnementLibelle: { fontSize: 11, color: colors.primaryTexte },
  abonnementValeur: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryTexte,
    letterSpacing: 1,
    marginTop: 2,
  },

  points: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  iconePoints: {
    width: 38,
    height: 38,
    borderRadius: rayon.sm,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValeur: { fontSize: 15, fontWeight: '700', color: colors.texte },

  titreSection: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.texteTertiaire,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 4,
  },

  entree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.md,
  },
  separateur: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bordure },
  iconeEntree: {
    width: 32,
    height: 32,
    borderRadius: rayon.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entreeLibelle: { flex: 1, fontSize: 15, color: colors.texte },
  entreeValeur: { fontSize: 13, color: colors.texteSecondaire },

  suppression: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: espacement.md,
  },
  suppressionTexte: { fontSize: 13, color: colors.danger, fontWeight: '500' },
  version: { fontSize: 12, color: colors.texteTertiaire, textAlign: 'center' },
});
