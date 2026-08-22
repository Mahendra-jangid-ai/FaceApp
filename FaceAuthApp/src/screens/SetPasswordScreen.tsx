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
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { setOrgPassword } from '../services/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SetPassword'>;

export default function SetPasswordScreen({ route, navigation }: Props) {
  const { orgName } = route.params;

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState<{ password?: string; confirm?: string }>({});

  // Password strength
  const strength = getStrength(password);

  function validate() {
    const e: typeof errors = {};
    if (!password)              e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters required';
    if (!confirm)               e.confirm  = 'Please confirm your password';
    else if (password !== confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    try {
      await setOrgPassword(orgName, password);
      Alert.alert(
        'All Set! 🎉',
        `Password created successfully for "${orgName}". You can now login anytime.`,
        [{
          text: 'Go to Dashboard',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'OrganizationAdmin' }] }),
        }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Header ──────────────────────────────────────── */}
          <View style={s.header}>
            <View style={s.iconBox}>
              <Text style={s.icon}>🔐</Text>
            </View>
            <Text style={s.title}>Set Your Password</Text>
            <View style={s.orgBadge}>
              <Text style={s.orgBadgeText}>{orgName}</Text>
            </View>
            <Text style={s.subtitle}>
              Create a secure password to protect your organization account
            </Text>
          </View>

          {/* ── Password Field ──────────────────────────────── */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Password *</Text>
            <View style={[s.inputRow, errors.password ? s.inputRowErr : null]}>
              <TextInput
                style={s.input}
                placeholder="Enter password (min. 6 characters)"
                placeholderTextColor={colors.textFaint}
                value={password}
                onChangeText={v => { setPassword(v); setErrors(p => ({ ...p, password: undefined })); }}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={s.eyeBtn} activeOpacity={0.7}>
                <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={s.err}>{errors.password}</Text> : null}

            {/* Strength bar */}
            {password.length > 0 && (
              <View style={s.strengthWrap}>
                <View style={s.strengthBar}>
                  <View style={[s.strengthFill, { width: `${strength.pct}%` as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          {/* ── Confirm Password ────────────────────────────── */}
          <View style={s.fieldWrap}>
            <Text style={s.label}>Confirm Password *</Text>
            <View style={[s.inputRow, errors.confirm ? s.inputRowErr : null]}>
              <TextInput
                style={s.input}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textFaint}
                value={confirm}
                onChangeText={v => { setConfirm(v); setErrors(p => ({ ...p, confirm: undefined })); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={s.eyeBtn} activeOpacity={0.7}>
                <Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirm ? <Text style={s.err}>{errors.confirm}</Text> : null}

            {/* Match indicator */}
            {confirm.length > 0 && (
              <View style={s.matchRow}>
                <Text style={password === confirm ? s.matchOk : s.matchErr}>
                  {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* ── Password Tips ────────────────────────────────── */}
          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>Tips for a strong password</Text>
            {[
              'Use at least 8 characters',
              'Mix uppercase & lowercase letters',
              'Include numbers (0–9)',
              'Add special characters (!@#$%)',
            ].map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={[s.tipDot, password.length >= 8 && i === 0 ? s.tipDotOk : null]} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* ── Submit ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.btnText}>Set Password & Continue</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Password strength helper ─────────────────────────────────────────────────
function getStrength(pwd: string): { pct: number; label: string; color: string } {
  if (!pwd) return { pct: 0, label: '', color: colors.line };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { pct: 20,  label: 'Very Weak',  color: colors.danger };
  if (score === 2) return { pct: 40, label: 'Weak',        color: '#E07B2A' };
  if (score === 3) return { pct: 60, label: 'Fair',        color: colors.warn };
  if (score === 4) return { pct: 80, label: 'Strong',      color: '#4A8C6F' };
  return               { pct: 100, label: 'Very Strong',  color: colors.success };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  iconBox: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg, ...shadows.sm,
  },
  icon: { fontSize: 36 },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginBottom: spacing.sm },
  orgBadge: {
    backgroundColor: colors.primaryDim,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  orgBadgeText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  subtitle: {
    fontFamily: fonts.regular, fontSize: 13, color: colors.textDim,
    textAlign: 'center', paddingHorizontal: spacing.lg,
  },

  /* Fields */
  fieldWrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.lg,
  },
  inputRowErr: { borderColor: colors.danger, backgroundColor: colors.dangerDim },
  input: {
    flex: 1, fontFamily: fonts.regular, fontSize: 14,
    color: colors.text, paddingVertical: spacing.md + 2,
  },
  eyeBtn: { padding: spacing.sm },
  eyeIcon: { fontSize: 18 },
  err: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.danger, marginTop: 4 },

  /* Strength bar */
  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  strengthBar: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: colors.line, overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthLabel: { fontFamily: fonts.medium, fontSize: 11.5, minWidth: 70, textAlign: 'right' },

  /* Match indicator */
  matchRow: { marginTop: 5 },
  matchOk: { fontFamily: fonts.medium, fontSize: 12, color: colors.success },
  matchErr: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },

  /* Tips */
  tipsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  tipsTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, marginBottom: spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.line, marginRight: spacing.sm,
  },
  tipDotOk: { backgroundColor: colors.success },
  tipText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textDim },

  /* Button */
  btn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
    ...shadows.glowPrimary,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});
