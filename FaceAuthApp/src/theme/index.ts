import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export const colors = {
  primary: '#1A73E8',
  primaryDark: '#1557B0',
  primaryLight: '#E8F0FE',
  secondary: '#00BFA5',
  secondaryLight: '#E0F7FA',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  success: '#00C853',
  successLight: '#E8F5E9',
  error: '#FF1744',
  errorLight: '#FFEBEE',
  warning: '#FF9100',
  warningLight: '#FFF3E0',
  border: '#E5E7EB',
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  black: '#000000',
};

// WCAG AAA high-contrast theme for outdoor/accessibility use
export const aaaColors = {
  primary: '#FFD700',
  primaryDark: '#FFC107',
  primaryLight: '#1A1A1A',
  secondary: '#00E676',
  secondaryLight: '#0D0D0D',
  background: '#000000',
  surface: '#1A1A1A',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textLight: '#BDBDBD',
  success: '#00E676',
  successLight: '#0D2E1A',
  error: '#FF5252',
  errorLight: '#2E0D0D',
  warning: '#FFD740',
  warningLight: '#2E2A0D',
  border: '#424242',
  overlay: 'rgba(0,0,0,0.8)',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textLight },
  button: { fontSize: 16, fontWeight: '600' as const },
};

// WCAG AAA typography - larger sizes for outdoor visibility
export const aaaTypography = {
  h1: { fontSize: 34, fontWeight: '700' as const, color: aaaColors.text },
  h2: { fontSize: 28, fontWeight: '600' as const, color: aaaColors.text },
  h3: { fontSize: 22, fontWeight: '600' as const, color: aaaColors.text },
  body: { fontSize: 20, fontWeight: '400' as const, color: aaaColors.text },
  bodySmall: { fontSize: 18, fontWeight: '400' as const, color: aaaColors.textSecondary },
  caption: { fontSize: 16, fontWeight: '400' as const, color: aaaColors.textLight },
  button: { fontSize: 20, fontWeight: '600' as const },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const screen = { width, height };

// Accessibility mode management
const AAA_MODE_KEY = '@faceauth_aaa_mode';
let aaaModeEnabled = false;

export async function loadAccessibilityMode(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(AAA_MODE_KEY);
  aaaModeEnabled = raw === 'true';
  return aaaModeEnabled;
}

export async function setAccessibilityMode(enabled: boolean): Promise<void> {
  aaaModeEnabled = enabled;
  await AsyncStorage.setItem(AAA_MODE_KEY, enabled ? 'true' : 'false');
}

export function isAccessibilityMode(): boolean {
  return aaaModeEnabled;
}

export function getColors() {
  return aaaModeEnabled ? aaaColors : colors;
}

export function getTypography() {
  return aaaModeEnabled ? aaaTypography : typography;
}
