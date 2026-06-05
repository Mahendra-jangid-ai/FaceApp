import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const colors = {
  bg: '#0A0E1A',
  surface: '#131829',
  surfaceAlt: '#1A2038',
  line: '#232B45',
  lineBright: '#2E3A5C',
  accent: '#FF6B35',
  accentDim: '#2A1508',
  accentGlow: 'rgba(255,107,53,0.18)',
  cyan: '#00D4FF',
  cyanDim: '#041E2B',
  success: '#00E676',
  successDim: '#0A2E1A',
  warn: '#FFB300',
  warnDim: '#2E2A0D',
  danger: '#FF5252',
  dangerDim: '#3A1614',
  info: '#4FC3F7',
  text: '#F0F4F8',
  textDim: '#94A3B8',
  textFaint: '#64748B',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
  // Legacy compat aliases
  primary: '#FF6B35',
  primaryDark: '#2A1508',
  primaryLight: '#2A1508',
  secondary: '#00D4FF',
  secondaryLight: '#041E2B',
  background: '#0A0E1A',
  card: '#131829',
  textSecondary: '#94A3B8',
  textLight: '#64748B',
  error: '#FF5252',
  errorLight: '#3A1614',
  warning: '#FFB300',
  warningLight: '#2E2A0D',
  successLight: '#0A2E1A',
  border: '#232B45',
  overlay: 'rgba(0,0,0,0.7)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: 0.3, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  bodySmall: { fontSize: 13, fontWeight: '500' as const, color: colors.textDim },
  caption: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5, color: colors.textDim },
  button: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.5 },
  mono: { fontFamily: MONO, fontSize: 13, color: colors.text },
};

export const shadows = {
  sm: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  md: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  lg: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
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
