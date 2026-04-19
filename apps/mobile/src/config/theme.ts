// Material Design 3 token system for the Raquel mobile app.
// Colors mirror the web brand palette (indigo / coral / peach) so that
// users moving between desktop and mobile see one cohesive identity.

export const MD3 = {
  colors: {
    // Primary
    primary: '#4F46E5',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E0FF',
    onPrimaryContainer: '#0F0066',

    // Secondary
    secondary: '#EC4899',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFD9E6',
    onSecondaryContainer: '#3E0021',

    // Tertiary
    tertiary: '#FB923C',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFE4CC',
    onTertiaryContainer: '#3D1500',

    // Surface
    surface: '#FFFBFF',
    onSurface: '#1C1B1F',
    surfaceVariant: '#F5F0F0',
    onSurfaceVariant: '#49454F',
    surfaceDim: '#DED8E1',

    // Background
    background: '#FFFBFF',
    onBackground: '#1C1B1F',

    // Error
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410002',

    // Outline
    outline: '#79747E',
    outlineVariant: '#CAC4D0',

    // Semantic (custom — not in MD3 spec but needed for app)
    success: '#2E7D32',
    successContainer: '#C8E6C9',
    onSuccessContainer: '#1B5E20',
    warning: '#ED6C02',
    warningContainer: '#FFE0B2',
    onWarningContainer: '#5D2C00',
    info: '#0288D1',
    infoContainer: '#B3E5FC',
    onInfoContainer: '#00345B',

    // Scrim / backdrop
    scrim: 'rgba(0, 0, 0, 0.4)',
  },

  typography: {
    displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400' as const },
    displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: '400' as const },
    displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: '400' as const },
    headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '400' as const },
    headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '400' as const },
    headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '400' as const },
    titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '500' as const },
    titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
    titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
    labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
    labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500' as const },
  },

  shape: {
    none: 0,
    extraSmall: 4,
    small: 8,
    medium: 12,
    large: 16,
    extraLarge: 28,
    full: 9999,
  },

  elevation: {
    level0: { shadowOpacity: 0, elevation: 0 },
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    level3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.11,
      shadowRadius: 8,
      elevation: 6,
    },
    level4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.13,
      shadowRadius: 10,
      elevation: 8,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Touch target minimums per Android Material guidelines
  touchTarget: {
    minimum: 48,
  },
} as const;

export type Theme = typeof MD3;
