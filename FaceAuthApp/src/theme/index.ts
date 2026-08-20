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
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F6F8',
  surfaceHover: '#EEF0F3',
  line: '#E6E8EC',
  lineBright: '#D5D8DE',

  primary: '#1B4F72',
  primaryDim: '#EEF3F7',
  primaryDark: '#163E59',

  accent: '#1B4F72',
  accentDim: '#EEF3F7',
  accentGlow: 'rgba(27, 79, 114, 0.10)',

  navy: '#2C3540',
  navyDim: '#3D4854',

  cyan: '#2E6A86',
  cyanDim: '#EEF3F7',
  cyanGlow: 'rgba(46, 106, 134, 0.10)',

  success: '#2F6B4F',
  successDim: '#F0F5F2',
  successGlow: 'rgba(47, 107, 79, 0.10)',

  warn: '#8A6230',
  warnDim: '#F7F3EE',
  warnGlow: 'rgba(138, 98, 48, 0.10)',

  danger: '#9A4338',
  dangerDim: '#F7F1F0',
  dangerGlow: 'rgba(154, 67, 56, 0.10)',

  purple: '#4A5568',
  purpleDim: '#F4F6F8',

  info: '#2E6A86',
  infoDim: '#EEF3F7',

  text: '#2C3540',
  textDim: '#5B6570',
  textFaint: '#8B939C',
  textMuted: '#6B7280',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#2C3540',

  primaryLight: '#EEF3F7',
  secondary: '#2E6A86',
  secondaryLight: '#EEF3F7',
  background: '#FFFFFF',
  card: '#FFFFFF',
  textSecondary: '#5B6570',
  textLight: '#8B939C',
  error: '#9A4338',
  errorLight: '#F7F1F0',
  warning: '#8A6230',
  warningLight: '#F7F3EE',
  successLight: '#F0F5F2',
  border: '#E6E8EC',
  overlay: 'rgba(44, 53, 64, 0.45)',
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
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 18,
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
  sm: { elevation: 1, shadowColor: '#2C3540', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  md: { elevation: 2, shadowColor: '#2C3540', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  lg: { elevation: 3, shadowColor: '#2C3540', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
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
