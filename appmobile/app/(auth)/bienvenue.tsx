import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Bouton, Ecran } from '../../src/components/ui';
import { Logo } from '../../src/components/Logo';
import { colors, espacement } from '../../src/theme';

/** Ecran 1 des maquettes : logo, deux actions, bascule FR / EN. */
export default function Bienvenue() {
  const router = useRouter();
  const [langue, setLangue] = useState<'FR' | 'EN'>('FR');

  return (
    // bas: true — ecran sans onglets, la zone systeme doit etre respectee ici.
    <Ecran bas style={{ backgroundColor: colors.surface }}>
      <View style={styles.conteneur}>
        <View style={styles.bloc}>
          <Logo taille={130} />
          <View style={{ height: espacement.lg }} />
          <Text style={styles.nom}>CLEAN</Text>
          <Text style={styles.nomSecond}>GUINÉE</Text>
          <Text style={styles.slogan}>Du déchet à la valeur ♻</Text>
        </View>

        <View style={styles.actions}>
          <Bouton titre="Se connecter" onPress={() => router.push('/(auth)/connexion')} />
          <Bouton
            titre="Créer un compte"
            variante="contour"
            onPress={() => router.push('/(auth)/inscription')}
          />

          <View style={styles.langues}>
            {(['FR', 'EN'] as const).map((l, i) => (
              <View key={l} style={styles.langueLigne}>
                {i > 0 && <Text style={styles.separateur}>|</Text>}
                <Pressable onPress={() => setLangue(l)} hitSlop={10}>
                  <Text style={[styles.langue, langue === l && styles.langueActive]}>{l}</Text>
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
    paddingHorizontal: espacement.xl,
    paddingVertical: espacement.xxl,
  },
  bloc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  nom: { fontSize: 34, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  nomSecond: { fontSize: 22, fontWeight: '700', color: colors.primary, letterSpacing: 5 },
  slogan: { fontSize: 14, color: colors.texteSecondaire, marginTop: espacement.md },
  actions: { gap: espacement.md },
  langues: { flexDirection: 'row', justifyContent: 'center', marginTop: espacement.lg },
  langueLigne: { flexDirection: 'row', alignItems: 'center' },
  separateur: { color: colors.bordure, marginHorizontal: espacement.md },
  langue: { fontSize: 14, color: colors.texteTertiaire, fontWeight: '600' },
  langueActive: { color: colors.primary },
});
