import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useI18n, LANGUES, type Langue } from '../../src/i18n';
import { Carte, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';

export default function ChoixLangue() {
  const { langue, changerLangue, t } = useI18n();

  return (
    <Ecran bas>
      <EnTete titre={t('langue.titre')} retour />
      <Contenu>
        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {LANGUES.map((l, i) => {
            const actif = langue === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => changerLangue(l.code as Langue)}
                style={({ pressed }) => [
                  styles.ligne,
                  i > 0 && styles.separateur,
                  pressed && { backgroundColor: colors.surfaceAlt },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
              >
                <Text style={styles.drapeau}>{l.code === 'fr' ? '🇫🇷' : '🇬🇧'}</Text>
                <Text style={[styles.libelle, actif && styles.libelleActif]}>{l.libelle}</Text>
                {actif && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            );
          })}
        </Carte>

        <Text style={styles.note}>
          {langue === 'fr'
            ? 'Ce choix s’applique à l’application et aux SMS que vous recevez.'
            : 'This choice applies to the app and to the SMS you receive.'}
        </Text>
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.lg,
  },
  separateur: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bordure },
  drapeau: { fontSize: 22 },
  libelle: { flex: 1, fontSize: 15, color: colors.texte },
  libelleActif: { fontWeight: '700', color: colors.primary },
  note: { fontSize: 12, color: colors.texteSecondaire, lineHeight: 18 },
});
