/**
 * Nano Design System
 * Design system for small merchant mobile app
 */

import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';

// Brand Colors
export const colors = {
  // Primary - Brand Blue
  primary: '#0066FF',
  primaryLight: '#3385FF',
  primaryDark: '#0052CC',

  // Secondary - Accent colors
  secondary: '#2ECC71',
  secondaryLight: '#58D68D',
  secondaryDark: '#27AE60',

  // Semantic colors
  success: '#2ECC71',
  successLight: '#D1FAE5',
  warning: '#F39C12',
  warningLight: '#FEF3C7',
  error: '#E74C3C',
  errorLight: '#FEE2E2',
  info: '#3498DB',
  infoLight: '#DBEAFE',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F3F5',

  // Gray scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Text colors
  text: '#212529',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  textDisabled: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Border colors
  border: '#DEE2E6',
  borderLight: '#E9ECEF',

  // Transaction colors
  credit: '#2ECC71',
  debit: '#E74C3C',
  pending: '#F39C12',
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Typography
const fontConfig = {
  fontFamily: 'System',
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryLight,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    error: colors.error,
    onPrimary: colors.textInverse,
    onSecondary: colors.textInverse,
    onBackground: colors.textPrimary,
    onSurface: colors.textPrimary,
    outline: colors.border,
  },
  fonts: configureFonts({ config: fontConfig }),
  custom: {
    colors,
    spacing,
    borderRadius,
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primaryLight,
    primaryContainer: colors.primaryDark,
    secondary: colors.secondaryLight,
    secondaryContainer: colors.secondaryDark,
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2D2D2D',
    error: colors.error,
    onPrimary: colors.textPrimary,
    onSecondary: colors.textPrimary,
    onBackground: colors.textInverse,
    onSurface: colors.textInverse,
    outline: '#3D3D3D',
  },
  fonts: configureFonts({ config: fontConfig }),
  custom: {
    colors,
    spacing,
    borderRadius,
  },
};

// Shadow styles
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Named export for convenience
export const theme = lightTheme;

export default lightTheme;
