import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const fonts = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  extraBold: 'Poppins-ExtraBold',
};

export const colors = {
  // Clean Modern Palette
  bg: '#F8FAFC',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceHover: '#E2E8F0',
  line: '#E2E8F0',
  lineBright: '#CBD5E1',

  // FaceAuth Core Brand
  primary: '#2563EB',          // Vibrant Royal Blue
  primaryDim: '#EFF6FF',
  primaryDark: '#1D4ED8',
  
  accent: '#EA580C',           // Energetic Saffron Orange
  accentDim: '#FFF7ED',        // Soft Warm Cream
  accentGlow: 'rgba(234, 88, 12, 0.14)',

  navy: '#0F172A',             // Slate Midnight
  navyDim: '#1E293B',

  cyan: '#0284C7',             // Modern Sky Blue
  cyanDim: '#F0F9FF',
  cyanGlow: 'rgba(2, 132, 199, 0.14)',

  success: '#16A34A',          // Forest Emerald Green
  successDim: '#F0FDF4',
  successGlow: 'rgba(22, 163, 74, 0.14)',

  warn: '#D97706',             // Amber
  warnDim: '#FFFBEB',
  warnGlow: 'rgba(217, 119, 6, 0.14)',

  danger: '#DC2626',           // Clean Crimson
  dangerDim: '#FEF2F2',
  dangerGlow: 'rgba(220, 38, 38, 0.14)',

  purple: '#7C3AED',
  purpleDim: '#F5F3FF',

  info: '#0284C7',
  infoDim: '#F0F9FF',

  // Text Colors
  text: '#0F172A',
  textDim: '#475569',
  textFaint: '#94A3B8',
  textMuted: '#64748B',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',

  // Legacy compat aliases
  primaryLight: '#EFF6FF',
  secondary: '#0284C7',
  secondaryLight: '#F0F9FF',
  background: '#F8FAFC',
  card: '#FFFFFF',
  textSecondary: '#475569',
  textLight: '#94A3B8',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  successLight: '#F0FDF4',
  border: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.70)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const borderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const typography = {
  h1: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.4, color: colors.text },
  h2: { fontFamily: fonts.semiBold, fontSize: 20, letterSpacing: -0.3, color: colors.text },
  h3: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  bodySmall: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, color: colors.textDim },
  button: { fontFamily: fonts.semiBold, fontSize: 14, letterSpacing: 0.2 },
  mono: { fontFamily: MONO, fontSize: 13, color: colors.text },
};

export const shadows = {
  sm: { elevation: 1, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  md: { elevation: 2.5, shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  lg: { elevation: 4.5, shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  glowAccent: { elevation: 3, shadowColor: colors.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  glowPrimary: { elevation: 3, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  glowSuccess: { elevation: 3, shadowColor: colors.success, shadowOpacity: 0.20, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
};

export const screen = { width, height };

// Accessibility
let aaaModeEnabled = false;

export async function loadAccessibilityMode(): Promise<boolean> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem('@faceauth_aaa_mode');
    aaaModeEnabled = raw === 'true';
  } catch {}
  return aaaModeEnabled;
}

export async function setAccessibilityMode(enabled: boolean): Promise<void> {
  aaaModeEnabled = enabled;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('@faceauth_aaa_mode', enabled ? 'true' : 'false');
  } catch {}
}

export function isAccessibilityMode(): boolean {
  return aaaModeEnabled;
}
