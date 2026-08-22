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
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { createOrganization } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddOrganization'>;

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface FieldError {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

function validate(form: FormState): FieldError {
  const errors: FieldError = {};
  if (!form.name.trim()) errors.name = 'Organization name is required';
  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!/^\+?[\d\s\-]{8,15}$/.test(form.phone)) {
    errors.phone = 'Enter a valid phone number';
  }
  if (!form.address.trim()) errors.address = 'Address is required';
  return errors;
}

export default function AddOrganizationScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit() {
    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await createOrganization({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      Alert.alert(
        'Success',
        `"${res.organization.name}" has been registered successfully.`,
        [
          {
            text: 'Go to Home',
            onPress: () => navigation.navigate('Home'),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Top Banner */}
        <View style={styles.banner}>
          <View style={styles.iconWrap}>
            <Text style={styles.bannerIcon}>🏢</Text>
          </View>
          <Text style={styles.bannerTitle}>Add Organization</Text>
          <Text style={styles.bannerSub}>
            Fill in your organization details. This info will be used across the app.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Field
            label="Organization Name"
            placeholder="e.g. NHAI, Tata Consultancy"
            value={form.name}
            onChangeText={v => update('name', v)}
            error={errors.name}
            autoCapitalize="words"
          />
          <Field
            label="Email Address"
            placeholder="contact@organization.com"
            value={form.email}
            onChangeText={v => update('email', v)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChangeText={v => update('phone', v)}
            error={errors.phone}
            keyboardType="phone-pad"
          />
          <Field
            label="Address"
            placeholder="Full address of the organization"
            value={form.address}
            onChangeText={v => update('address', v)}
            error={errors.address}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} size="small" />
          ) : (
            <Text style={styles.btnText}>Register Organization</Text>
          )}
        </TouchableOpacity>

        {/* Back link */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backText}>← Back to selection</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Reusable Field Component ─────────────────────────────────────────────────

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  multiline?: boolean;
  numberOfLines?: number;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
}: FieldProps) {
  return (
    <View style={field.wrap}>
      <Text style={field.label}>{label}</Text>
      <TextInput
        style={[
          field.input,
          multiline && field.multiline,
          error ? field.inputError : null,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <Text style={field.error}>{error}</Text> : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  banner: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  bannerIcon: { fontSize: 30 },
  bannerTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  bannerSub: {
    ...typography.bodySmall,
    color: colors.textDim,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  form: {
    marginTop: spacing.sm,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.glowPrimary,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    ...typography.button,
    color: colors.onAccent,
    fontSize: 15,
  },
  backBtn: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
});

const field = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
    fontFamily: 'Poppins-Medium',
    fontSize: 12.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    fontSize: 14,
  },
  multiline: {
    minHeight: 90,
    paddingTop: spacing.md,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerDim,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
  },
});
