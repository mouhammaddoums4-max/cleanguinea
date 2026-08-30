import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Bouton, Ecran, useHautBarreStatut } from '../../src/components/ui';
import { Logo } from '../../src/components/Logo';
import { colors, espacement } from '../../src/theme';
import { useResponsive } from '../../src/responsive';
import { useI18n, LANGUES, type Langue } from '../../src/i18n';
import { useConfig } from '../../src/config';

/** Ecran 1 des maquettes : logo, deux actions, bascule FR / EN. */
export default function Bienvenue() {
  const router = useRouter();
  const r = useResponsive();
  const { langue, changerLangue, t } = useI18n();
  const { slogan } = useConfig();
  const hautBarre = useHautBarreStatut();

  return (
    // bas: true — ecran sans onglets, la zone systeme doit etre respectee ici.
    <Ecran bas style={{ backgroundColor: colors.surface }}>
      <View style={[styles.conteneur, r.contenu, { paddingTop: hautBarre + espacement.xxl }]}>
        <View style={styles.bloc}>
          <Logo taille={130} />
          <View style={{ height: espacement.lg }} />
          <Text style={styles.nom}>SÉNYI</Text>
          <Text style={styles.slogan}>{slogan} ♻</Text>
        </View>

        <View style={styles.actions}>
          <Bouton
            titre={t('bienvenue.seConnecter')}
            onPress={() => router.push('/(auth)/connexion')}
          />
          <Bouton
            titre={t('bienvenue.creerCompte')}
            variante="contour"
            onPress={() => router.push('/(auth)/inscription')}
          />

          <View style={styles.langues}>
            {LANGUES.map((l, i) => (
              <View key={l.code} style={styles.langueLigne}>
                {i > 0 && <Text style={styles.separateur}>|</Text>}
                <Pressable
                  onPress={() => changerLangue(l.code as Langue)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={l.libelle}
                >
                  <Text style={[styles.langue, langue === l.code && styles.langueActive]}>
                    {l.code.toUpperCase()}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: espacement.xxl,
  },
  bloc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  // Un seul mot : il peut respirer davantage que l'ancien nom sur deux lignes.
  nom: { fontSize: 38, fontWeight: '800', color: colors.primary, letterSpacing: 3 },
  slogan: { fontSize: 14, color: colors.texteSecondaire, marginTop: espacement.md },
  actions: { gap: espacement.md },
  langues: { flexDirection: 'row', justifyContent: 'center', marginTop: espacement.lg },
  langueLigne: { flexDirection: 'row', alignItems: 'center' },
  separateur: { color: colors.bordure, marginHorizontal: espacement.md },
  langue: { fontSize: 14, color: colors.texteTertiaire, fontWeight: '600' },
  langueActive: { color: colors.primary },
});
