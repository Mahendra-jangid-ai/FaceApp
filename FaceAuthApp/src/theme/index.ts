import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const colors = {
  // Clean Enterprise Light Palette
  bg: '#F8FAFC',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceHover: '#E2E8F0',
  line: '#E2E8F0',
  lineBright: '#CBD5E1',
  
  // NHAI Official Brand & Semantic Colors
  accent: '#EA580C',          // NHAI Deep Saffron
  accentDim: '#FFF7ED',       // Soft warm cream
  accentGlow: 'rgba(234, 88, 12, 0.12)',
  
  navy: '#0F172A',            // Deep Corporate Navy
  navyDim: '#F1F5F9',
  
  cyan: '#0284C7',            // Corporate Sky Blue
  cyanDim: '#F0F9FF',
  cyanGlow: 'rgba(2, 132, 199, 0.12)',
  
  success: '#16A34A',         // Forest Emerald Green
  successDim: '#F0FDF4',
  successGlow: 'rgba(22, 163, 74, 0.12)',
  
  warn: '#D97706',            // Amber
  warnDim: '#FFFBEB',
  warnGlow: 'rgba(217, 119, 6, 0.12)',
  
  danger: '#DC2626',          // Clean Crimson
  dangerDim: '#FEF2F2',
  dangerGlow: 'rgba(220, 38, 38, 0.12)',
  
  info: '#0284C7',
  infoDim: '#F0F9FF',
  
  // Text Colors (High Contrast & Legible)
  text: '#0F172A',
  textDim: '#475569',
  textFaint: '#94A3B8',
  textMuted: '#64748B',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  
  // Legacy compat aliases (mapped to modern light tokens)
  primary: '#EA580C',
  primaryDark: '#0F172A',
  primaryLight: '#FFF7ED',
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
  full: 999,
};

export const typography = {
  h1: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2, color: colors.text },
  h3: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14.5, fontWeight: '500' as const, color: colors.text, lineHeight: 21 },
  bodySmall: { fontSize: 13, fontWeight: '500' as const, color: colors.textDim, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, color: colors.textDim },
  button: { fontSize: 14.5, fontWeight: '700' as const, letterSpacing: 0.3 },
  mono: { fontFamily: MONO, fontSize: 13, color: colors.text },
};

export const shadows = {
  sm: { elevation: 1, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  md: { elevation: 2, shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  lg: { elevation: 4, shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  glowAccent: { elevation: 3, shadowColor: colors.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  glowCyan: { elevation: 3, shadowColor: colors.cyan, shadowOpacity: 0.20, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
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
