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
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (pin !== DEFAULT_PIN) {
      Alert.alert('Access Denied', 'Incorrect Admin PIN. Default is 1234.');
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
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Enter administrator credentials to access system management</Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADMIN NAME</Text>
            <TextInput
              style={styles.input}
              value={adminName}
              onChangeText={setAdminName}
              placeholder="e.g. Vikram Singh"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADMIN PIN</Text>
            <TextInput
              style={[styles.input, styles.pinInput]}
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </View>

          <View style={styles.pinHintBox}>
            <Text style={styles.pinHintText}>💡 Default PIN: <Text style={{ fontWeight: '700', color: colors.accent }}>1234</Text></Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}>
          <Text style={styles.backText}>← Back to Home</Text>
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
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  icon: { fontSize: 30 },
  title: { fontSize: 22, fontWeight: '800', marginTop: spacing.md, color: colors.text },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center', maxWidth: 280, color: colors.textDim },
  
  formCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    padding: spacing.xl, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  inputGroup: { width: '100%', marginBottom: spacing.md },
  label: { fontSize: 11, fontWeight: '700', color: colors.textDim, marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14.5, color: colors.text,
  },
  pinInput: {
    fontFamily: MONO, fontSize: 18, letterSpacing: 6, textAlign: 'center',
  },
  pinHintBox: {
    backgroundColor: colors.accentDim, padding: spacing.sm,
    borderRadius: borderRadius.sm, marginBottom: spacing.md, alignItems: 'center',
  },
  pinHintText: { fontSize: 12, color: colors.textDim },
  button: {
    backgroundColor: colors.accent, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, width: '100%', alignItems: 'center',
    marginTop: spacing.xs, ...shadows.sm,
  },
  buttonText: { ...typography.button, color: colors.onAccent },
  backLink: { marginTop: spacing.xl, padding: spacing.sm },
  backText: { fontSize: 13, color: colors.textDim, fontWeight: '600' },
});
