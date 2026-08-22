import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows, fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Logo & App Name ─────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.logoBox}>
          <Text style={s.logoText}>FA</Text>
        </View>
        <Text style={s.appName}>FaceApp</Text>
        <Text style={s.tagline}>Secure face-based attendance management</Text>
      </View>

      {/* ── Divider ─────────────────────────────────────────── */}
      <View style={s.dividerRow}>
        <View style={s.divider} />
        <Text style={s.dividerText}>CHOOSE YOUR ROLE</Text>
        <View style={s.divider} />
      </View>

      {/* ── Cards ────────────────────────────────────────────── */}
      <View style={s.cardsWrap}>

        {/* Organization / Admin Card */}
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('OrganizationAdmin')}>
          <View style={[s.cardIconBox, { backgroundColor: '#EEF3F7' }]}>
            <Text style={s.cardEmoji}>🏢</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardTitle}>Organization</Text>
            <Text style={s.cardRole}>Admin Portal</Text>
            <Text style={s.cardDesc}>
              Manage your organization, enroll workers, view analytics and control attendance
            </Text>
          </View>
          <View style={s.cardArrowBox}>
            <Text style={s.cardArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* User / Worker Card */}
        <TouchableOpacity
          style={[s.card, s.cardUser]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Home')}>
          <View style={[s.cardIconBox, { backgroundColor: '#F0F5F2' }]}>
            <Text style={s.cardEmoji}>👤</Text>
          </View>
          <View style={s.cardBody}>
            <Text style={s.cardTitle}>User</Text>
            <Text style={[s.cardRole, { color: colors.success }]}>Worker Portal</Text>
            <Text style={s.cardDesc}>
              Mark attendance, check your schedule and view personal records
            </Text>
          </View>
          <View style={s.cardArrowBox}>
            <Text style={s.cardArrow}>›</Text>
          </View>
        </TouchableOpacity>

      </View>

      {/* ── Footer ───────────────────────────────────────────── */}
      <View style={s.footer}>
        <View style={s.footerDot} />
        <Text style={s.footerText}>Powered by on-device face recognition</Text>
        <View style={s.footerDot} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* Header */
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.xxl,
  },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.glowPrimary,
  },
  logoText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textDim,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 1.4,
    marginHorizontal: spacing.md,
  },

  /* Cards */
  cardsWrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.primaryDim,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardUser: {
    borderColor: colors.successDim,
  },
  cardIconBox: {
    width: 58,
    height: 58,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  cardRole: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
    marginTop: 1,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textDim,
    lineHeight: 17,
  },
  cardArrowBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  cardArrow: {
    fontSize: 20,
    color: colors.textDim,
    lineHeight: 24,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: colors.textFaint,
  },
});
