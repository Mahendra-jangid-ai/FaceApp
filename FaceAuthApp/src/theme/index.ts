import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const colors = {
  // Deep Cyber Dark Palette
  bg: '#080C14',
  bgElevated: '#0D1322',
  surface: '#111827',
  surfaceAlt: '#182234',
  surfaceHover: '#1F2C44',
  line: '#1E293B',
  lineBright: '#2C3B55',
  
  // Brand & Glow Colors
  accent: '#FF7A1A',
  accentDim: '#2E1705',
  accentGlow: 'rgba(255, 122, 26, 0.22)',
  
  cyan: '#00E5FF',
  cyanDim: '#032330',
  cyanGlow: 'rgba(0, 229, 255, 0.20)',
  
  success: '#10B981',
  successDim: '#062B1E',
  successGlow: 'rgba(16, 185, 129, 0.20)',
  
  warn: '#F59E0B',
  warnDim: '#332005',
  warnGlow: 'rgba(245, 158, 11, 0.20)',
  
  danger: '#F43F5E',
  dangerDim: '#340A13',
  dangerGlow: 'rgba(244, 63, 94, 0.20)',
  
  info: '#38BDF8',
  infoDim: '#08253B',
  
  // Text Colors
  text: '#F8FAFC',
  textDim: '#94A3B8',
  textFaint: '#64748B',
  textMuted: '#475569',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  
  // Legacy compat aliases (mapped to modern tokens)
  primary: '#FF7A1A',
  primaryDark: '#101726',
  primaryLight: '#2E1705',
  secondary: '#00E5FF',
  secondaryLight: '#032330',
  background: '#080C14',
  card: '#111827',
  textSecondary: '#94A3B8',
  textLight: '#64748B',
  error: '#F43F5E',
  errorLight: '#340A13',
  warning: '#F59E0B',
  warningLight: '#332005',
  successLight: '#062B1E',
  border: '#1E293B',
  overlay: 'rgba(8, 12, 20, 0.85)',
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  full: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: 0.5, color: colors.text },
  h2: { fontSize: 21, fontWeight: '700' as const, letterSpacing: 0.3, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: 0.2, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '500' as const, color: colors.textDim, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, color: colors.textDim },
  button: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.8 },
  mono: { fontFamily: MONO, fontSize: 13, color: colors.text },
};

export const shadows = {
  sm: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  md: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  lg: { elevation: 8, shadowColor: '#000', shadowOpacity: 0.65, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  glowAccent: { elevation: 6, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  glowCyan: { elevation: 6, shadowColor: colors.cyan, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  glowSuccess: { elevation: 6, shadowColor: colors.success, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
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
