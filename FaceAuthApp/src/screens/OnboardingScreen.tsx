import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>FA</Text>
        </View>
        <Text style={styles.appName}>FaceApp</Text>
        <Text style={styles.tagline}>
          Secure face-based attendance management
        </Text>
      </View>

      {/* Cards */}
      <View style={styles.body}>
        <Text style={styles.sectionLabel}>GET STARTED</Text>
        <Text style={styles.title}>What do you want to set up?</Text>

        {/* Organization Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddOrganization')}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
            <Text style={styles.cardIcon}>🏢</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Organization</Text>
            <Text style={styles.cardDesc}>
              Register your company or institution to manage attendance
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* User Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Home')}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successDim }]}>
            <Text style={styles.cardIcon}>👤</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>User</Text>
            <Text style={styles.cardDesc}>
              Enroll or authenticate workers using face recognition
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by on-device face recognition
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.glowPrimary,
  },
  logoText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 26,
    color: colors.onAccent,
    letterSpacing: 1,
  },
  appName: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.textDim,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.primary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    ...typography.bodySmall,
    color: colors.textDim,
    lineHeight: 17,
  },
  arrow: {
    fontSize: 24,
    color: colors.textFaint,
    marginLeft: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    ...typography.caption,
    color: colors.textFaint,
  },
});
