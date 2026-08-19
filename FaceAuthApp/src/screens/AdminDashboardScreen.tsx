import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
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
      `Adaptive Threshold: ${adaptive.threshold.toFixed(3)} (${adaptive.genuineSamples}g / ${adaptive.impostorSamples}i)`,
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncToServer();
    setSyncing(false);
    if (result.success) {
      Alert.alert('Sync Successful', `Synced: ${result.usersSynced} workers, ${result.logsSynced} logs, ${result.attendanceSynced} attendance records.`);
    } else {
      Alert.alert('Sync Failed', result.error || 'Network error');
    }
    loadStats();
  };

  const handleCleanup = async () => {
    const result = await performCleanup();
    Alert.alert('Cleanup Complete', `Purged ${result.logsRemoved} historical logs and ${result.attendanceRemoved} attendance records.`);
    loadStats();
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Home');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Admin Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.adminBadgeRow}>
              <Text style={styles.headerTitle}>Admin Console</Text>
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>SUPERVISOR</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Officer: {session?.userName || 'Administrator'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: online ? colors.successDim : colors.dangerDim, borderColor: online ? '#BBF7D0' : '#FECACA' }]}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.danger }]} />
            <Text style={[styles.statusText, { color: online ? colors.success : colors.danger }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* KPI Overview Tiles */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Registered', value: stats.enrolled, color: colors.accent },
          { label: 'On Site', value: stats.onSite, color: colors.success },
          { label: 'Scans Today', value: stats.todayAuth, color: colors.cyan },
          { label: 'Success %', value: `${stats.successRate}%`, color: colors.warn },
          { label: 'Avg Match', value: `${stats.avgScore}%`, color: colors.accent },
          { label: 'Pending Sync', value: stats.syncPending, color: stats.syncPending > 0 ? colors.danger : colors.textDim },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Section 1: Personnel & Enrolment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Worker Management</Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Enroll', { role: 'worker' })}
          activeOpacity={0.8}>
          <View style={[styles.menuIconWrap, { backgroundColor: colors.accentDim }]}>
            <Text style={styles.menuIconText}>➕</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Enrol New Worker</Text>
            <Text style={styles.menuSub}>Register face biometric & Aadhaar profile</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('WorkerList')}
          activeOpacity={0.8}>
          <View style={[styles.menuIconWrap, { backgroundColor: colors.cyanDim }]}>
            <Text style={styles.menuIconText}>👥</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Worker Directory</Text>
            <Text style={styles.menuSub}>View, search, or remove registered workers ({stats.enrolled})</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Section 2: Reports & Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reports & Audits</Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.8}>
          <View style={[styles.menuIconWrap, { backgroundColor: colors.successDim }]}>
            <Text style={styles.menuIconText}>📊</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>System Analytics & KPIs</Text>
            <Text style={styles.menuSub}>7-day trend, match accuracy & latency meters</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Calendar')}
          activeOpacity={0.8}>
          <View style={[styles.menuIconWrap, { backgroundColor: colors.accentDim }]}>
            <Text style={styles.menuIconText}>📅</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Attendance Calendar</Text>
            <Text style={styles.menuSub}>Inspect daily shift logs and working hours</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('History')}
          activeOpacity={0.8}>
          <View style={[styles.menuIconWrap, { backgroundColor: colors.infoDim }]}>
            <Text style={styles.menuIconText}>📜</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Authentication Audit Trail</Text>
            <Text style={styles.menuSub}>Real-time scan attempt logs and anti-spoof records</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Section 3: Configuration & System Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Settings & Sync</Text>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}>
          <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={styles.menuIconText}>⚙️</Text>
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>System & Geofence Settings</Text>
            <Text style={styles.menuSub}>Geofence sites, voice prompts, server URL & retention</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.85}>
            {syncing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Sync to Cloud</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.lineBright }]}
            onPress={handleCleanup}
            activeOpacity={0.85}>
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Purge Old Data</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.storageText}>Local Encrypted DB Size: {stats.storageKB} KB</Text>
      </View>

      {/* Logout / Exit Admin Mode */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Exit Admin Console</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: '#FFFFFF', padding: spacing.lg,
    paddingTop: spacing.xxl, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  adminBadge: { backgroundColor: colors.accentDim, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: '#FED7AA' },
  adminBadgeText: { fontSize: 9.5, fontWeight: '800', color: colors.accent },
  headerSub: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full, gap: 5, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.sm,
  },
  statCard: {
    width: '31.3%', backgroundColor: '#FFFFFF', padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  statNum: { fontSize: 20, fontWeight: '800', fontFamily: MONO },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.textDim, marginTop: 2 },

  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.line, ...shadows.sm,
  },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  menuIconText: { fontSize: 18 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  menuSub: { fontSize: 12, color: colors.textDim, marginTop: 1 },
  menuArrow: { fontSize: 22, color: colors.textFaint, fontWeight: '300' },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  actionBtnText: { ...typography.button, color: '#FFFFFF', fontSize: 13.5 },
  storageText: { fontSize: 11.5, textAlign: 'center', marginTop: spacing.sm, color: colors.textDim },

  logoutBtn: {
    marginHorizontal: spacing.md, marginTop: spacing.xl,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: '#FECACA', alignItems: 'center',
    backgroundColor: colors.dangerDim,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: colors.danger },
});
