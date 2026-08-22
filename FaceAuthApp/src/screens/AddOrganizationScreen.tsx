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
import DropdownPicker from '../components/DropdownPicker';

type Props = NativeStackScreenProps<RootStackParamList, 'AddOrganization'>;

// ─── Worker range options ───────────────────────────────────────────────────
const WORKER_RANGES = ['1–5', '6–10', '11–25', '26–50', '51–100', '101–250', '251–500', '500+'];

// ─── Industry options ───────────────────────────────────────────────────────
const INDUSTRIES = [
  'Construction', 'Infrastructure / Roads', 'Manufacturing',
  'Information Technology', 'Healthcare', 'Education',
  'Retail / E-commerce', 'Logistics / Transport', 'Agriculture',
  'Finance / Banking', 'Hospitality', 'Government / PSU', 'Other',
];

// ─── Org type options ───────────────────────────────────────────────────────
const ORG_TYPES = ['Private Ltd', 'Public Ltd', 'Government', 'PSU', 'NGO / Non-Profit', 'Partnership', 'Proprietorship', 'Other'];

// ─── Contact roles ──────────────────────────────────────────────────────────
const CONTACT_ROLES = ['Owner / Founder', 'CEO / Director', 'HR Manager', 'Operations Manager', 'Admin', 'Other'];

// ─── Indian States ──────────────────────────────────────────────────────────
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Other',
];

interface Form {
  // Basic
  name: string;
  email: string;
  phone: string;
  alternate_phone: string;
  website: string;
  // Organization details
  industry: string;
  organization_type: string;
  worker_range: string;
  // Location
  address: string;
  city: string;
  state: string;
  pincode: string;
  // Contact person
  contact_person: string;
  contact_role: string;
}

interface Errors { [key: string]: string }

const EMPTY: Form = {
  name: '', email: '', phone: '', alternate_phone: '', website: '',
  industry: '', organization_type: '', worker_range: '',
  address: '', city: '', state: '', pincode: '',
  contact_person: '', contact_role: '',
};

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim())            e.name            = 'Organization name is required';
  if (!f.email.trim())           e.email           = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email  = 'Enter a valid email';
  if (!f.phone.trim())           e.phone           = 'Phone number is required';
  if (!f.industry)               e.industry        = 'Please select an industry';
  if (!f.organization_type)      e.organization_type = 'Please select org type';
  if (!f.worker_range)           e.worker_range    = 'Please select worker range';
  if (!f.address.trim())         e.address         = 'Address is required';
  if (!f.city.trim())            e.city            = 'City is required';
  if (!f.state)                  e.state           = 'Please select a state';
  if (!f.pincode.trim())         e.pincode         = 'Pincode is required';
  if (!f.contact_person.trim())  e.contact_person  = 'Contact person name is required';
  if (!f.contact_role)           e.contact_role    = 'Please select contact role';
  return e;
}

export default function AddOrganizationScreen({ navigation }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  function set(field: keyof Form, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n; });
  }

  async function submit() {
    const e = validate(form);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      Alert.alert('Missing Fields', 'Please fill all required fields marked with *');
      return;
    }
    setLoading(true);
    try {
      const res = await createOrganization({
        name:              form.name.trim(),
        email:             form.email.trim().toLowerCase(),
        phone:             form.phone.trim(),
        alternate_phone:   form.alternate_phone.trim() || undefined,
        website:           form.website.trim() || undefined,
        industry:          form.industry,
        organization_type: form.organization_type,
        worker_range:      form.worker_range,
        address:           form.address.trim(),
        city:              form.city.trim(),
        state:             form.state,
        pincode:           form.pincode.trim(),
        country:           'India',
        contact_person:    form.contact_person.trim(),
        contact_role:      form.contact_role,
      });
      // Navigate to SetPassword — pass org name
      navigation.replace('SetPassword', { orgName: res.organization.name });
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
            <View style={s.iconBox}><Text style={s.icon}>🏢</Text></View>
            <Text style={s.title}>Register Organization</Text>
            <Text style={s.subtitle}>Fill in your details to get started</Text>
          </View>

          {/* ═══════════════════════════════════════════════════
              SECTION 1 — Basic Information
          ═══════════════════════════════════════════════════ */}
          <SectionHeader title="Basic Information" icon="📋" />

          <Field label="Organization Name *" placeholder="e.g. NHAI, Tata Consultancy"
            value={form.name} onChangeText={v => set('name', v)} error={errors.name} autoCapitalize="words" />

          <Field label="Email Address *" placeholder="contact@organization.com"
            value={form.email} onChangeText={v => set('email', v)} error={errors.email}
            keyboardType="email-address" autoCapitalize="none" />

          <View style={s.row}>
            <View style={s.halfWrap}>
              <Field label="Phone Number *" placeholder="+91 98765 43210"
                value={form.phone} onChangeText={v => set('phone', v)} error={errors.phone}
                keyboardType="phone-pad" />
            </View>
            <View style={s.halfWrap}>
              <Field label="Alternate Phone" placeholder="Optional"
                value={form.alternate_phone} onChangeText={v => set('alternate_phone', v)}
                keyboardType="phone-pad" />
            </View>
          </View>

          <Field label="Website" placeholder="https://www.example.com"
            value={form.website} onChangeText={v => set('website', v)}
            keyboardType="url" autoCapitalize="none" />

          {/* ═══════════════════════════════════════════════════
              SECTION 2 — Organization Details
          ═══════════════════════════════════════════════════ */}
          <SectionHeader title="Organization Details" icon="🏭" />

          <DropdownPicker
            label="Industry *"
            options={INDUSTRIES}
            value={form.industry}
            onSelect={v => set('industry', v)}
            error={errors.industry}
            placeholder="Select Industry"
          />

          <DropdownPicker
            label="Organization Type *"
            options={ORG_TYPES}
            value={form.organization_type}
            onSelect={v => set('organization_type', v)}
            error={errors.organization_type}
            placeholder="Select Type"
          />

          <DropdownPicker
            label="Number of Workers *"
            options={WORKER_RANGES}
            value={form.worker_range}
            onSelect={v => set('worker_range', v)}
            error={errors.worker_range}
            placeholder="Select Range"
            searchable={false}
          />

          {/* ═══════════════════════════════════════════════════
              SECTION 3 — Location
          ═══════════════════════════════════════════════════ */}
          <SectionHeader title="Location" icon="📍" />

          <Field label="Office / Site Address *" placeholder="Building, Street, Area"
            value={form.address} onChangeText={v => set('address', v)} error={errors.address}
            multiline />

          <View style={s.row}>
            <View style={s.halfWrap}>
              <Field label="City *" placeholder="e.g. Delhi"
                value={form.city} onChangeText={v => set('city', v)} error={errors.city}
                autoCapitalize="words" />
            </View>
            <View style={s.halfWrap}>
              <Field label="Pincode *" placeholder="110001"
                value={form.pincode} onChangeText={v => set('pincode', v)} error={errors.pincode}
                keyboardType="numeric" />
            </View>
          </View>

          <DropdownPicker
            label="State *"
            options={STATES}
            value={form.state}
            onSelect={v => set('state', v)}
            error={errors.state}
            placeholder="Select State"
          />

          {/* ═══════════════════════════════════════════════════
              SECTION 5 — Primary Contact Person
          ═══════════════════════════════════════════════════ */}
          <SectionHeader title="Primary Contact Person" icon="👤" />

          <Field label="Full Name *" placeholder="e.g. Mahendra Kumar"
            value={form.contact_person} onChangeText={v => set('contact_person', v)}
            error={errors.contact_person} autoCapitalize="words" />

          <DropdownPicker
            label="Role / Designation *"
            options={CONTACT_ROLES}
            value={form.contact_role}
            onSelect={v => set('contact_role', v)}
            error={errors.contact_role}
            placeholder="Select Role"
            searchable={false}
          />

          {/* ── Submit Button ──────────────────────────────── */}
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

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={sh.wrap}>
      <Text style={sh.icon}>{icon}</Text>
      <Text style={sh.title}>{title}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.xl, marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  icon: { fontSize: 16, marginRight: spacing.sm },
  title: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
});

// ─── Text Field ──────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'url';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
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
const f = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.text, marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: fonts.regular, fontSize: 13.5, color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
  multiline: { minHeight: 80, paddingTop: spacing.md },
  inputErr: { borderColor: colors.danger, backgroundColor: colors.dangerDim },
  err: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.danger, marginTop: 3 },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  header: { alignItems: 'center', marginBottom: spacing.md },
  iconBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, ...shadows.sm,
  },
  icon: { fontSize: 32 },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginBottom: 4 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textDim, textAlign: 'center' },

  row: { flexDirection: 'row', gap: spacing.sm },
  halfWrap: { flex: 1 },

  btn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
    marginTop: spacing.xl, ...shadows.glowPrimary,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { fontFamily: fonts.semiBold, fontSize: 15, color: '#FFFFFF' },
});
