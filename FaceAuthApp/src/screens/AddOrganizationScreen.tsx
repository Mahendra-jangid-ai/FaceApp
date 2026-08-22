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
import { createOrganization } from '../services/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddOrganization'>;

interface Form {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Errors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim())    e.name    = 'Organization name is required';
  if (!f.email.trim())   e.email   = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Enter a valid email';
  if (!f.phone.trim())   e.phone   = 'Phone number is required';
  if (!f.address.trim()) e.address = 'Address is required';
  return e;
}

export default function AddOrganizationScreen({ navigation }: Props) {
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', address: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  function set(field: keyof Form, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  }

  async function submit() {
    const e = validate(form);
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setLoading(true);
    try {
      const res = await createOrganization({
        name:    form.name.trim(),
        email:   form.email.trim().toLowerCase(),
        phone:   form.phone.trim(),
        address: form.address.trim(),
      });
      Alert.alert('Success', `"${res.organization.name}" registered successfully.`, [
        {
          text: 'Continue',
          onPress: () =>
            navigation.reset({
              index: 1,
              routes: [{ name: 'Onboarding' }, { name: 'OrganizationAdmin' }],
            }),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.iconBox}>
              <Text style={s.icon}>🏢</Text>
            </View>
            <Text style={s.title}>Register Organization</Text>
            <Text style={s.subtitle}>Fill in your organization details below</Text>
          </View>

          {/* Form Fields */}
          <Field
            label="Organization Name"
            placeholder="e.g. NHAI, Tata Consultancy"
            value={form.name}
            onChangeText={v => set('name', v)}
            error={errors.name}
            autoCapitalize="words"
          />
          <Field
            label="Email Address"
            placeholder="contact@organization.com"
            value={form.email}
            onChangeText={v => set('email', v)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChangeText={v => set('phone', v)}
            error={errors.phone}
            keyboardType="phone-pad"
          />
          <Field
            label="Address"
            placeholder="Full address of the organization"
            value={form.address}
            onChangeText={v => set('address', v)}
            error={errors.address}
            multiline
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={submit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.btnText}>Register Organization</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Reusable Field ──────────────────────────────────────────────────────────── */
interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  multiline?: boolean;
}

function Field({ label, placeholder, value, onChangeText, error,
  keyboardType = 'default', autoCapitalize = 'sentences', multiline = false }: FieldProps) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && f.multiline, error ? f.inputErr : null]}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <Text style={f.err}>{error}</Text> : null}
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg, ...shadows.sm,
  },
  icon: { fontSize: 32 },
  title: {
    fontFamily: fonts.bold, fontSize: 22,
    color: colors.primary, marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular, fontSize: 13,
    color: colors.textDim, textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.glowPrimary,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});

const f = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontFamily: fonts.medium, fontSize: 12.5,
    color: colors.text, marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: fonts.regular, fontSize: 14,
    color: colors.text, backgroundColor: colors.surfaceAlt,
  },
  multiline: { minHeight: 90, paddingTop: spacing.md },
  inputErr: { borderColor: colors.danger, backgroundColor: colors.dangerDim },
  err: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, marginTop: 4 },
});
