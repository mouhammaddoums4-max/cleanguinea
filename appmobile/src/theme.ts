/**
 * Charte Clean Guinée.
 * Les teintes de marque sont reprises du logo (moulinet turquoise / lime / vert / ardoise).
 */

export const brand = {
  tealFonce: '#14524F',
  teal: '#0FA085',
  lime: '#8CD211',
  vert: '#00B140',
  ardoise: '#2E4256',
} as const;

export const colors = {
  primary: '#16A34A',
  primaryFonce: '#15803D',
  primaryClair: '#DCFCE7',
  primaryTexte: '#166534',

  fond: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  bordure: '#E5E7EB',

  texte: '#111827',
  texteSecondaire: '#6B7280',
  texteTertiaire: '#9CA3AF',

  danger: '#DC2626',
  dangerClair: '#FEE2E2',
  alerte: '#F59E0B',
  alerteClair: '#FEF3C7',
  info: '#2563EB',
  infoClair: '#DBEAFE',

  blanc: '#FFFFFF',
  noir: '#000000',
} as const;

/**
 * Les couleurs et libelles des categories NE SONT PLUS ici : ils viennent de
 * l'API (`/api/config`), via `useConfig().categorie(code)` dans src/config.tsx.
 * Les modifier depuis le back-office suffit, sans nouvelle version de l'app.
 */

export const espacement = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const rayon = { sm: 8, md: 12, lg: 16, xl: 20, plein: 999 } as const;

export const typo = {
  titre: { fontSize: 22, fontWeight: '700' as const, color: colors.texte },
  sousTitre: { fontSize: 17, fontWeight: '600' as const, color: colors.texte },
  corps: { fontSize: 15, color: colors.texte },
  petit: { fontSize: 13, color: colors.texteSecondaire },
  minuscule: { fontSize: 11, color: colors.texteTertiaire },
};

export const ombre = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2,
};

