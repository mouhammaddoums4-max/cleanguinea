import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, espacement, rayon, ombre } from '../theme';

/**
 * Conteneur d'ecran, plein ecran.
 *
 * Le fond couvre TOUT l'ecran, y compris sous la barre de statut et sous la
 * barre de navigation : c'est un simple View, pas un SafeAreaView, sinon
 * l'application apparaitrait encadree de bandes.
 *
 * Ce sont les *marges du contenu* qui evitent les barres systeme, pas le fond :
 *   - `bas = false` (defaut) pour un ecran a onglets : la BarreOnglets absorbe
 *     deja l'inset du bas, l'ajouter ici le compterait DEUX FOIS ;
 *   - `bas = true` pour un ecran empile, sans quoi le contenu passerait sous la
 *     barre de navigation du telephone.
 *
 * `souslaBarreDeStatut` laisse le contenu remonter sous la barre de statut,
 * pour les ecrans dont l'en-tete colore doit aller jusqu'en haut.
 */
export function Ecran({
  children, bas = false, sousLaBarreDeStatut = false, style,
}: {
  children: React.ReactNode;
  bas?: boolean;
  sousLaBarreDeStatut?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.ecran,
        {
          paddingTop: sousLaBarreDeStatut ? 0 : insets.top,
          paddingBottom: bas ? insets.bottom : 0,
          // Encoches laterales en paysage : sans elles, le contenu passe dessous.
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function EnTete({
  titre, sousTitre, retour = false, action,
}: { titre: string; sousTitre?: string; retour?: boolean; action?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.enTete}>
      {retour && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.texte} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.enTeteTitre}>{titre}</Text>
        {!!sousTitre && <Text style={styles.enTeteSousTitre}>{sousTitre}</Text>}
      </View>
      {action}
    </View>
  );
}

export function Carte({
  children, style, onPress,
}: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.carte, style, pressed && { opacity: 0.7 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.carte, style]}>{children}</View>;
}

export function Bouton({
  titre, onPress, variante = 'plein', charge = false, desactive = false, icone, style,
}: {
  titre: string;
  onPress: () => void;
  variante?: 'plein' | 'contour' | 'texte';
  charge?: boolean;
  desactive?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const inactif = desactive || charge;
  const teinte = variante === 'plein' ? colors.blanc : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: charge }}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'plein' && styles.boutonPlein,
        variante === 'contour' && styles.boutonContour,
        variante === 'texte' && styles.boutonTexte,
        inactif && { opacity: 0.5 },
        pressed && !inactif && { opacity: 0.85 },
        style,
      ]}
    >
      {charge ? (
        <ActivityIndicator color={teinte} />
      ) : (
        <>
          {icone && <Ionicons name={icone} size={18} color={teinte} />}
          <Text style={[styles.boutonLibelle, { color: teinte }]}>{titre}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Champ({
  libelle, icone, erreur, ...props
}: TextInputProps & {
  libelle?: string;
  icone?: keyof typeof Ionicons.glyphMap;
  erreur?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      {!!libelle && <Text style={styles.champLibelle}>{libelle}</Text>}
      <View style={[styles.champ, !!erreur && { borderColor: colors.danger }]}>
        {icone && <Ionicons name={icone} size={18} color={colors.texteTertiaire} />}
        <TextInput
          placeholderTextColor={colors.texteTertiaire}
          style={styles.champSaisie}
          {...props}
        />
      </View>
      {!!erreur && <Text style={styles.champErreur}>{erreur}</Text>}
    </View>
  );
}

/**
 * Pastille coloree d'une categorie de dechet.
 * Les couleurs viennent de l'API : passez-les en props depuis `useConfig().categorie(code)`,
 * pour qu'un changement fait dans le back-office se voie sans nouvelle version.
 */
export function PastilleBac({
  couleur, couleurFond, icone = 'trash', taille = 36,
}: {
  couleur: string;
  couleurFond: string;
  icone?: string;
  taille?: number;
}) {
  return (
    <View
      style={{
        width: taille,
        height: taille,
        borderRadius: rayon.sm,
        backgroundColor: couleurFond,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={icone as keyof typeof Ionicons.glyphMap}
        size={taille * 0.5}
        color={couleur}
      />
    </View>
  );
}

export function Etiquette({
  texte, teinte = colors.primary, fond = colors.primaryClair,
}: { texte: string; teinte?: string; fond?: string }) {
  return (
    <View style={[styles.etiquette, { backgroundColor: fond }]}>
      <Text style={[styles.etiquetteTexte, { color: teinte }]}>{texte}</Text>
    </View>
  );
}

export function Chargement({ texte = 'Chargement...' }: { texte?: string }) {
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.centreTexte}>{texte}</Text>
    </View>
  );
}

export function Vide({
  icone = 'file-tray-outline', titre, message,
}: { icone?: keyof typeof Ionicons.glyphMap; titre: string; message?: string }) {
  return (
    <View style={styles.centre}>
      <Ionicons name={icone} size={44} color={colors.texteTertiaire} />
      <Text style={styles.videTitre}>{titre}</Text>
      {!!message && <Text style={styles.centreTexte}>{message}</Text>}
    </View>
  );
}

export function Contenu({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.contenu}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.fond },
  contenu: { padding: espacement.lg, gap: espacement.lg, paddingBottom: espacement.xxl },

  enTete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  enTeteTitre: { fontSize: 18, fontWeight: '700', color: colors.texte },
  enTeteSousTitre: { fontSize: 13, color: colors.texteSecondaire, marginTop: 2 },

  carte: {
    backgroundColor: colors.surface,
    borderRadius: rayon.lg,
    padding: espacement.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordure,
    ...ombre,
  },

  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacement.sm,
    height: 50,
    borderRadius: rayon.md,
    paddingHorizontal: espacement.lg,
  },
  boutonPlein: { backgroundColor: colors.primary },
  boutonContour: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  boutonTexte: { height: 40 },
  boutonLibelle: { fontSize: 15, fontWeight: '600' },

  champLibelle: { fontSize: 13, fontWeight: '600', color: colors.texteSecondaire },
  champ: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.sm,
    height: 50,
    paddingHorizontal: espacement.md,
    borderRadius: rayon.md,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.surface,
  },
  champSaisie: { flex: 1, fontSize: 15, color: colors.texte },
  champErreur: { fontSize: 12, color: colors.danger },

  etiquette: {
    paddingHorizontal: espacement.md,
    paddingVertical: 4,
    borderRadius: rayon.plein,
    alignSelf: 'flex-start',
  },
  etiquetteTexte: { fontSize: 12, fontWeight: '600' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacement.sm, padding: espacement.xl },
  centreTexte: { fontSize: 14, color: colors.texteSecondaire, textAlign: 'center' },
  videTitre: { fontSize: 16, fontWeight: '600', color: colors.texte, marginTop: espacement.sm },
});
