import { useWindowDimensions } from 'react-native';

/**
 * Mise en page adaptative.
 *
 * Une marge de 16 px codée en dur gaspille l'écran d'un petit téléphone et
 * paraît ridicule sur une tablette. Tout part donc de la largeur réelle de la
 * fenêtre, relue à chaque rotation par `useWindowDimensions`.
 *
 * Les seuils correspondent au parc réellement utilisé à Conakry : beaucoup
 * d'écrans de 5" à 5,5" (320–360 dp), quelques grands téléphones, et de rares
 * tablettes pour les superviseurs.
 */

export type Taille = 'compact' | 'normal' | 'large' | 'tablette';

/** Au-delà de cette largeur, une ligne de texte devient pénible à lire. */
const LARGEUR_MAX_CONTENU = 640;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const taille: Taille =
    width < 340 ? 'compact' : width < 400 ? 'normal' : width < 600 ? 'large' : 'tablette';

  // Marge latérale : elle doit rester une respiration, pas une bande.
  const marge = { compact: 10, normal: 14, large: 16, tablette: 24 }[taille];

  // Écart vertical entre les blocs.
  const ecart = { compact: 10, normal: 12, large: 14, tablette: 16 }[taille];

  return {
    largeur: width,
    hauteur: height,
    taille,
    marge,
    ecart,
    /** Vrai à partir d'une tablette : on centre et on borne la largeur. */
    estLarge: taille === 'tablette',
    /**
     * Style de contenu : marges adaptées, et sur grand écran une largeur
     * bornée puis centrée. Sans cela, une ligne traverse toute une tablette.
     */
    contenu: {
      paddingHorizontal: marge,
      gap: ecart,
      ...(width > LARGEUR_MAX_CONTENU
        ? { maxWidth: LARGEUR_MAX_CONTENU, width: '100%' as const, alignSelf: 'center' as const }
        : null),
    },
    /** Échelle typographique douce : ±1 px, pas de saut brutal. */
    police: (base: number) =>
      taille === 'compact' ? base - 1 : taille === 'tablette' ? base + 1 : base,
  };
}
