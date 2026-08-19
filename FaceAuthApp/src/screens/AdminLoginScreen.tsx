import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { createSession } from '../auth/sessionStore';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLogin'>;

const DEFAULT_PIN = '1234';

export default function AdminLoginScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleLogin = async () => {
    if (!adminName.trim()) {
      Alert.alert('REQUIRED', 'Please enter Admin Name');
      return;
    }
    if (pin !== DEFAULT_PIN) {
      Alert.alert('ACCESS DENIED', 'Incorrect Admin PIN. Default is 1234.');
      setPin('');
      return;
    }

    await createSession({
      userId: `admin-${Date.now().toString(36)}`,
      userName: adminName.trim(),
      role: 'admin',
      employeeId: 'ADMIN',
      loginTime: Date.now(),
    });

    navigation.replace('AdminDashboard');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <Text style={styles.title}>ADMIN CONSOLE</Text>
        <Text style={styles.subtitle}>Authorized personnel biometric & management access</Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADMINISTRATOR NAME</Text>
            <TextInput
              style={styles.input}
              value={adminName}
              onChangeText={setAdminName}
              placeholder="e.g. Officer Vikram Singh"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>4-DIGIT SECURITY PIN</Text>
            <TextInput
              style={[styles.input, styles.pinInput]}
              value={pin}
              onChangeText={setPin}
              placeholder="• • • •"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </View>

          <View style={styles.pinHintBox}>
            <Text style={styles.pinHintText}>💡 Default Admin PIN is <Text style={{ color: colors.accent, fontWeight: '800' }}>1234</Text></Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.buttonText}>AUTHENTICATE & ENTER</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}>
          <Text style={styles.backText}>← Return to Main Terminal</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center',
  },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.lineBright, ...shadows.md,
  },
  icon: { fontSize: 34 },
  title: { ...typography.h2, marginTop: spacing.lg, letterSpacing: 2, textAlign: 'center' },
  subtitle: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center', maxWidth: 280, color: colors.textDim },
  
  formCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.xl, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.line,
    ...shadows.md,
  },
  inputGroup: { width: '100%', marginBottom: spacing.md },
  label: { ...typography.caption, color: colors.accent, marginBottom: spacing.xs, fontSize: 10 },
  input: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14.5, color: colors.text,
  },
  pinInput: {
    fontFamily: MONO, fontSize: 20, letterSpacing: 8, textAlign: 'center',
  },
  pinHintBox: {
    backgroundColor: colors.surfaceAlt, padding: spacing.sm,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.line,
    marginBottom: spacing.md, alignItems: 'center',
  },
  pinHintText: { fontFamily: MONO, fontSize: 11, color: colors.textDim },
  button: {
    backgroundColor: colors.accent, paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md, width: '100%', alignItems: 'center',
    marginTop: spacing.sm, ...shadows.glowAccent,
  },
  buttonText: { ...typography.button, color: colors.onAccent, fontSize: 14 },
  backLink: { marginTop: spacing.xl, padding: spacing.sm },
  backText: { fontSize: 13, color: colors.textDim, fontWeight: '600' },
});
