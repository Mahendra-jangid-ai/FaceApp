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
      Alert.alert('SYNC SUCCESSFUL', `Synced: ${result.usersSynced} workers, ${result.logsSynced} logs, ${result.attendanceSynced} attendance records.`);
    } else {
      Alert.alert('SYNC FAILED', result.error || 'Unknown network error');
    }
    loadStats();
  };

  const handleCleanup = async () => {
    const result = await performCleanup();
    Alert.alert('CLEANUP COMPLETE', `Purged ${result.logsRemoved} historical logs and ${result.attendanceRemoved} attendance records.`);
    loadStats();
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.replace('Home');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>ADMIN CONSOLE</Text>
            <Text style={styles.headerSub}>Officer: {session?.userName || 'Administrator'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: online ? colors.successDim : colors.dangerDim, borderColor: online ? colors.success : colors.danger }]}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.danger }]} />
            <Text style={[styles.statusText, { color: online ? colors.success : colors.danger }]}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'REGISTERED', value: stats.enrolled, color: colors.accent },
          { label: 'ON SITE', value: stats.onSite, color: colors.success },
          { label: 'SCANS TODAY', value: stats.todayAuth, color: colors.cyan },
          { label: 'SUCCESS RATE', value: `${stats.successRate}%`, color: colors.warn },
          { label: 'AVG SCORE', value: `${stats.avgScore}%`, color: colors.accent },
          { label: 'PENDING SYNC', value: stats.syncPending, color: stats.syncPending > 0 ? colors.danger : colors.textDim },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { borderColor: colors.line }]}>
            <View style={[styles.statTopBorder, { backgroundColor: s.color }]} />
            <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Threshold Info Pill */}
      <View style={styles.thresholdCard}>
        <Text style={styles.thresholdText}>⚙️ {thresholdInfo}</Text>
      </View>

      {/* Management Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PERSONNEL MANAGEMENT</Text>
          <View style={styles.sectionLine} />
        </View>

        {[
          { title: 'Worker Directory', sub: 'View, search, or remove registered workers', screen: 'WorkerList' as const, icon: '👥', color: colors.cyan },
          { title: 'Attendance Calendar', sub: 'Inspect daily shift logs and working hours', screen: 'Calendar' as const, icon: '📅', color: colors.accent },
          { title: 'Enrol New Worker', sub: 'Register new face template + Aadhaar record', screen: 'Enroll' as const, icon: '➕', color: colors.success },
          { title: 'Authentication Audit Trail', sub: 'Real-time facial verification attempt logs', screen: 'History' as const, icon: '📜', color: colors.info },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuCard}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}>
            <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}15`, borderColor: `${item.color}40` }]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* System Maintenance Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SERVER SYNC & STORAGE</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.85}>
            {syncing ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.actionBtnText}>SYNC TO SERVER</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.lineBright }]}
            onPress={handleCleanup}
            activeOpacity={0.85}>
            <Text style={[styles.actionBtnText, { color: colors.text }]}>PURGE OLD DATA</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.storageText}>Local Encrypted DB Size: {stats.storageKB} KB</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>TERMINATE ADMIN SESSION</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.surface, padding: spacing.xl,
    paddingTop: spacing.xxl, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { ...typography.h2, letterSpacing: 1.5 },
  headerSub: { ...typography.bodySmall, color: colors.textDim, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full, gap: 5, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.sm,
  },
  statCard: {
    width: '31.3%', backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1,
    overflow: 'hidden', ...shadows.sm,
  },
  statTopBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statNum: { fontSize: 20, fontWeight: '800', fontFamily: MONO, marginTop: 2 },
  statLabel: { fontSize: 8.5, fontWeight: '700', color: colors.textDim, marginTop: 3, letterSpacing: 0.5 },

  thresholdCard: {
    marginHorizontal: spacing.md, backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.line, alignItems: 'center',
  },
  thresholdText: { fontFamily: MONO, fontSize: 11, color: colors.textDim },

  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.accent, letterSpacing: 1.2, fontWeight: '800' },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.line, marginLeft: spacing.md },

  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.line, ...shadows.sm,
  },
  menuIconWrap: { width: 38, height: 38, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: spacing.md },
  menuIcon: { fontSize: 18 },
  menuContent: { flex: 1 },
  menuTitle: { ...typography.body, fontWeight: '700', fontSize: 14 },
  menuSub: { ...typography.caption, color: colors.textDim, marginTop: 1, letterSpacing: 0.3 },
  menuArrow: { fontSize: 16, color: colors.textDim, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', ...shadows.md,
  },
  actionBtnText: { ...typography.button, color: colors.onAccent, fontSize: 12 },
  storageText: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm, color: colors.textDim },

  logoutBtn: {
    marginHorizontal: spacing.md, marginTop: spacing.xl,
    paddingVertical: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.danger, alignItems: 'center',
    backgroundColor: colors.dangerDim,
  },
  logoutText: { ...typography.button, color: colors.danger, fontSize: 13 },
});
