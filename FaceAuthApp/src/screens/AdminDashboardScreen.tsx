import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getEnrolledUsers, getAuthLogs, getTodayAttendance } from '../services/database';
import { syncToServer, isOnline } from '../services/syncService';
import { getStorageStats, performCleanup } from '../services/dataRetention';
import { getAdaptiveStats } from '../services/adaptiveThreshold';
import { clearSession, getSession } from '../auth/sessionStore';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

export default function AdminDashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState({
    enrolled: 0, todayAuth: 0, todayAttendance: 0,
    onSite: 0, successRate: 0, syncPending: 0,
    storageKB: 0, avgScore: 0,
  });
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [thresholdInfo, setThresholdInfo] = useState('');
  const session = getSession();

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const loadStats = async () => {
    const [users, logs, attendance, netStatus, storage, adaptive] = await Promise.all([
      getEnrolledUsers(),
      getAuthLogs(),
      getTodayAttendance(),
      isOnline(),
      getStorageStats(),
      getAdaptiveStats(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter(l => l.timestamp >= today.getTime());
    const successLogs = todayLogs.filter(l => l.authenticated);
    const onSite = attendance.filter(a => a.checkOutTime === null);

    setStats({
      enrolled: users.length,
      todayAuth: todayLogs.length,
      todayAttendance: attendance.length,
      onSite: onSite.length,
      successRate: todayLogs.length > 0 ? Math.round((successLogs.length / todayLogs.length) * 100) : 0,
      syncPending: storage.totalLogs - storage.syncedLogs + storage.totalAttendance - storage.syncedAttendance,
      storageKB: storage.estimatedSizeKB,
      avgScore: successLogs.length > 0
        ? Math.round((successLogs.reduce((a, l) => a + l.matchScore, 0) / successLogs.length) * 100)
        : 0,
    });
    setOnline(netStatus);
    setThresholdInfo(
      `Threshold: ${adaptive.threshold.toFixed(3)} (${adaptive.genuineSamples}g/${adaptive.impostorSamples}i samples)`,
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncToServer();
    setSyncing(false);
    if (result.success) {
      Alert.alert('Sync Complete', `Users: ${result.usersSynced}, Logs: ${result.logsSynced}, Attendance: ${result.attendanceSynced}`);
    } else {
      Alert.alert('Sync Failed', result.error || 'Unknown error');
    }
    loadStats();
  };

  const handleCleanup = async () => {
    const result = await performCleanup();
    Alert.alert('Cleanup Done', `Removed ${result.logsRemoved} logs, ${result.attendanceRemoved} attendance records`);
    loadStats();
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Home');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Welcome, {session?.userName || 'Admin'}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.error }]} />
          <Text style={styles.statusText}>{online ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[
          { label: 'Enrolled', value: stats.enrolled, color: colors.primary },
          { label: 'On Site', value: stats.onSite, color: colors.success },
          { label: 'Auth Today', value: stats.todayAuth, color: colors.secondary },
          { label: 'Success %', value: `${stats.successRate}%`, color: colors.warning },
          { label: 'Avg Score', value: `${stats.avgScore}%`, color: colors.primary },
          { label: 'Pending Sync', value: stats.syncPending, color: colors.error },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.thresholdText}>{thresholdInfo}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>
        {[
          { title: 'Manage Workers', sub: 'View, add, remove enrolled workers', screen: 'WorkerList' as const },
          { title: 'Attendance Calendar', sub: 'View attendance history by date', screen: 'Calendar' as const },
          { title: 'Enroll New Worker', sub: 'Register a new worker face + Aadhaar', screen: 'Enroll' as const },
          { title: 'Auth History', sub: 'View all authentication attempts', screen: 'History' as const },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuCard}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={styles.menuArrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleSync}
            disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.actionBtnText}>Sync Now</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={handleCleanup}>
            <Text style={styles.actionBtnText}>Cleanup</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.storageText}>Storage: {stats.storageKB} KB</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primaryDark, padding: spacing.xl,
    paddingTop: spacing.xxl, borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTitle: { ...typography.h1, color: colors.white, fontSize: 28 },
  headerSub: { ...typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  statusText: { ...typography.caption, color: 'rgba(255,255,255,0.9)' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.sm,
  },
  statCard: {
    width: '31%', backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: 2 },
  thresholdText: {
    ...typography.caption, textAlign: 'center', marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: {
    ...typography.bodySmall, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  menuContent: { flex: 1 },
  menuTitle: { ...typography.body, fontWeight: '600' },
  menuSub: { ...typography.caption, marginTop: 2 },
  menuArrow: { fontSize: 20, color: colors.textLight },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', ...shadows.md,
  },
  actionBtnText: { ...typography.button, color: colors.white },
  storageText: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  logoutBtn: {
    marginHorizontal: spacing.md, marginTop: spacing.xl,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.error, alignItems: 'center',
  },
  logoutText: { ...typography.button, color: colors.error },
});
