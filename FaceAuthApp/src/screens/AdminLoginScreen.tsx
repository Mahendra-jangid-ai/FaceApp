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
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { createSession } from '../auth/sessionStore';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLogin'>;

const DEFAULT_PIN = '1234';

export default function AdminLoginScreen({ navigation }: Props) {
  const [pin, setPin] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleLogin = async () => {
    if (!adminName.trim()) {
      Alert.alert('Required', 'Enter your name');
      return;
    }
    if (pin !== DEFAULT_PIN) {
      Alert.alert('Access Denied', 'Incorrect admin PIN');
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
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{'#'}</Text>
        </View>
        <Text style={styles.title}>Admin Access</Text>
        <Text style={styles.subtitle}>Enter admin credentials to manage workers</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Admin Name</Text>
          <TextInput
            style={styles.input}
            value={adminName}
            onChangeText={setAdminName}
            placeholder="Your name"
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Admin PIN</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter 4-digit PIN"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login as Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center',
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 36, fontWeight: '700', color: colors.primary },
  title: { ...typography.h1, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center' },
  inputGroup: { width: '100%', marginTop: spacing.lg },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16, color: colors.text,
  },
  button: {
    backgroundColor: colors.primary, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl, borderRadius: borderRadius.md,
    marginTop: spacing.xl, width: '100%', alignItems: 'center', ...shadows.md,
  },
  buttonText: { ...typography.button, color: colors.white },
  backLink: { marginTop: spacing.lg },
  backText: { ...typography.body, color: colors.primary },
});
