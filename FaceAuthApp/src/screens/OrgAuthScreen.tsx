import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { getOrganizations } from '../services/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrgAuth'>;
type Tab = 'login' | 'signup';
type LoginStep = 'select' | 'orgForm'; // login tab ke 2 steps

export default function OrgAuthScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('login');

  function switchTab(t: Tab) {
    setTab(t);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Logo ─────────────────────────────────────────────── */}
      <View style={s.logoSection}>
        <View style={s.logoBox}>
          <Text style={s.logoText}>FA</Text>
        </View>
        <Text style={s.appName}>FaceApp</Text>
        <Text style={s.tagline}>Organization Management Portal</Text>
      </View>

      {/* ── Tab Switcher ──────────────────────────────────────── */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'login' && s.tabBtnActive]}
          onPress={() => switchTab('login')}
          activeOpacity={0.8}>
          <Text style={[s.tabBtnText, tab === 'login' && s.tabBtnTextActive]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'signup' && s.tabBtnActive]}
          onPress={() => switchTab('signup')}
          activeOpacity={0.8}>
          <Text style={[s.tabBtnText, tab === 'signup' && s.tabBtnTextActive]}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Content ───────────────────────────────────────── */}
      {tab === 'login'
        ? <LoginTab navigation={navigation} />
        : <SignUpTab navigation={navigation} />
      }
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN TAB  —  Step 1: select role  |  Step 2: org form
══════════════════════════════════════════════════════════════════ */
function LoginTab({ navigation }: { navigation: Props['navigation'] }) {
  const [step, setStep] = useState<LoginStep>('select');

  if (step === 'orgForm') {
    return <OrgLoginForm navigation={navigation} onBack={() => setStep('select')} />;
  }

  // Step 1 — Role Selection
  return (
    <ScrollView
      contentContainerStyle={s.formScroll}
      showsVerticalScrollIndicator={false}>

      <Text style={s.formTitle}>Welcome Back</Text>
      <Text style={s.formSubtitle}>Choose how you want to login</Text>

      {/* Organization Card */}
      <TouchableOpacity
        style={s.roleCard}
        activeOpacity={0.85}
        onPress={() => setStep('orgForm')}>
        <View style={[s.roleIconBox, { backgroundColor: colors.primaryDim }]}>
          <Text style={s.roleIcon}>🏢</Text>
        </View>
        <View style={s.roleCardBody}>
          <Text style={s.roleCardTitle}>Organization</Text>
          <Text style={s.roleCardDesc}>
            Login as admin to manage attendance and workers
          </Text>
        </View>
        <Text style={s.roleArrow}>›</Text>
      </TouchableOpacity>

      {/* User Card */}
      <TouchableOpacity
        style={s.roleCard}
        activeOpacity={0.85}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}>
        <View style={[s.roleIconBox, { backgroundColor: colors.successDim }]}>
          <Text style={s.roleIcon}>👤</Text>
        </View>
        <View style={s.roleCardBody}>
          <Text style={s.roleCardTitle}>User</Text>
          <Text style={s.roleCardDesc}>
            Login as worker to mark attendance and view records
          </Text>
        </View>
        <Text style={s.roleArrow}>›</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ── Organization Login Form ──────────────────────────────────────────────── */
function OrgLoginForm({
  navigation,
  onBack,
}: {
  navigation: Props['navigation'];
  onBack: () => void;
}) {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!orgName.trim()) {
      setError('Please enter your organization name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await getOrganizations();
      const match = res.organizations.find(
        o => o.name.toLowerCase() === orgName.trim().toLowerCase(),
      );
      if (!match) {
        setError('No organization found. Please sign up first.');
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'OrganizationAdmin' }] });
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={s.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity style={s.backRow} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        {/* Icon + Title */}
        <View style={s.formHeader}>
          <View style={[s.roleIconBox, { backgroundColor: colors.primaryDim, marginBottom: spacing.lg }]}>
            <Text style={s.roleIcon}>🏢</Text>
          </View>
          <Text style={s.formTitle}>Organization Login</Text>
          <Text style={s.formSubtitle}>Enter your organization name to continue</Text>
        </View>

        {/* Field */}
        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>Organization Name</Text>
          <TextInput
            style={[s.input, error ? s.inputErr : null]}
            placeholder="e.g. NHAI, Tata Consultancy"
            placeholderTextColor={colors.textFaint}
            value={orgName}
            onChangeText={v => { setOrgName(v); setError(''); }}
            autoCapitalize="words"
          />
          {error ? <Text style={s.errText}>{error}</Text> : null}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <Text style={s.btnText}>Login</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SIGN UP TAB
══════════════════════════════════════════════════════════════════ */
function SignUpTab({ navigation }: { navigation: Props['navigation'] }) {
  return (
    <ScrollView
      contentContainerStyle={s.formScroll}
      showsVerticalScrollIndicator={false}>

      <Text style={s.formTitle}>Get Started</Text>
      <Text style={s.formSubtitle}>Choose how you want to create your account</Text>

      {/* Register Organization */}
      <TouchableOpacity
        style={s.roleCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddOrganization')}>
        <View style={[s.roleIconBox, { backgroundColor: colors.primaryDim }]}>
          <Text style={s.roleIcon}>🏢</Text>
        </View>
        <View style={s.roleCardBody}>
          <Text style={s.roleCardTitle}>Register Organization</Text>
          <Text style={s.roleCardDesc}>
            Create your organization to manage attendance
          </Text>
        </View>
        <Text style={s.roleArrow}>›</Text>
      </TouchableOpacity>

      {/* Continue as User */}
      <TouchableOpacity
        style={s.roleCard}
        activeOpacity={0.85}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}>
        <View style={[s.roleIconBox, { backgroundColor: colors.successDim }]}>
          <Text style={s.roleIcon}>👤</Text>
        </View>
        <View style={s.roleCardBody}>
          <Text style={s.roleCardTitle}>Continue as User</Text>
          <Text style={s.roleCardDesc}>
            Mark attendance and view your personal records
          </Text>
        </View>
        <Text style={s.roleArrow}>›</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  /* Logo */
  logoSection: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, ...shadows.glowPrimary,
  },
  logoText: { fontFamily: fonts.bold, fontSize: 28, color: '#FFFFFF', letterSpacing: 1 },
  appName: { fontFamily: fonts.bold, fontSize: 24, color: colors.primary },
  tagline: {
    fontFamily: fonts.regular, fontSize: 12.5,
    color: colors.textDim, marginTop: 4, textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },

  /* Tab Switcher */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.line,
    padding: 4, marginBottom: spacing.xl,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.md,
    alignItems: 'center', borderRadius: borderRadius.md,
  },
  tabBtnActive: { backgroundColor: colors.bg, ...shadows.sm },
  tabBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDim },
  tabBtnTextActive: { fontFamily: fonts.semiBold, color: colors.primary },

  /* Common Form */
  formScroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  formHeader: { alignItems: 'center', marginBottom: spacing.lg },
  formTitle: {
    fontFamily: fonts.bold, fontSize: 20,
    color: colors.text, marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontFamily: fonts.regular, fontSize: 13,
    color: colors.textDim, marginBottom: spacing.xl,
  },

  /* Back row */
  backRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backArrow: { fontSize: 24, color: colors.primary, lineHeight: 28 },
  backText: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary, marginLeft: 4 },

  /* Role Cards */
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5, borderColor: colors.line,
    padding: spacing.lg, marginBottom: spacing.lg,
    ...shadows.md,
  },
  roleIconBox: {
    width: 54, height: 54, borderRadius: borderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.lg,
  },
  roleIcon: { fontSize: 26 },
  roleCardBody: { flex: 1 },
  roleCardTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  roleCardDesc: {
    fontFamily: fonts.regular, fontSize: 12.5,
    color: colors.textDim, marginTop: 3, lineHeight: 18,
  },
  roleArrow: { fontSize: 24, color: colors.textFaint, marginLeft: spacing.sm },

  /* Field */
  fieldWrap: { marginBottom: spacing.lg },
  fieldLabel: {
    fontFamily: fonts.medium, fontSize: 12.5,
    color: colors.text, marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    fontFamily: fonts.regular, fontSize: 14,
    color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  inputErr: { borderColor: colors.danger, backgroundColor: colors.dangerDim },
  errText: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginTop: 4 },

  /* Button */
  btn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginTop: spacing.sm, ...shadows.glowPrimary,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});
