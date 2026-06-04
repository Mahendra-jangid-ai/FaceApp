import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getEnrolledUsers, getAuthLogs, getTodayAttendance } from '../services/database';
import { isOnline } from '../services/syncService';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [userCount, setUserCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [online, setOnline] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [users, logs, attendance] = await Promise.all([
          getEnrolledUsers(),
          getAuthLogs(),
          getTodayAttendance(),
        ]);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = logs.filter(l => l.timestamp >= today.getTime());
        setUserCount(users.length);
        setTodayCount(todayLogs.length);
        setAttendanceCount(attendance.length);
        setSuccessRate(
          todayLogs.length > 0
            ? Math.round(
                (todayLogs.filter(l => l.authenticated).length / todayLogs.length) * 100,
              )
            : 0,
        );
        setOnline(await isOnline());
      })();
    }, []),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FaceAuth Pro</Text>
        <Text style={styles.headerSubtitle}>
          Secure Offline Face Recognition & Attendance
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: online ? colors.success : colors.error }]} />
          <Text style={styles.statusText}>{online ? 'Online' : 'Offline Mode'}</Text>
          <View style={styles.modelBadge}>
            <Text style={styles.modelBadgeText}>99.28% LFW</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{userCount}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{todayCount}</Text>
            <Text style={styles.statLabel}>Auth Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.secondaryLight }]}>
            <Text style={[styles.statNumber, { color: colors.secondary }]}>{attendanceCount}</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>{successRate}%</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionCard, styles.primaryAction]}
          onPress={() => navigation.navigate('Attendance')}
          activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: colors.successLight }]}>
            <Text style={styles.actionIconText}>{'{'}</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Mark Attendance</Text>
            <Text style={styles.actionDescription}>
              Check-in / Check-out with GPS + PPE verification
            </Text>
          </View>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.primaryAction]}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.8}>
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>{'@'}</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Authenticate</Text>
            <Text style={styles.actionDescription}>
              Liveness + anti-spoof + BioHash face recognition
            </Text>
          </View>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.secondaryAction]}
          onPress={() => navigation.navigate('Enroll')}
          activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: colors.secondaryLight }]}>
            <Text style={styles.actionIconText}>{'+'}</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Enroll New User</Text>
            <Text style={styles.actionDescription}>
              Register face with BioHash + differential privacy
            </Text>
          </View>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning }]}
          onPress={() => navigation.navigate('PPECheck')}
          activeOpacity={0.8}>
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,145,0,0.15)' }]}>
            <Text style={styles.actionIconText}>{'!'}</Text>
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>PPE Compliance Check</Text>
            <Text style={styles.actionDescription}>
              Verify helmet & vest before site entry
            </Text>
          </View>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('Dashboard')}
            activeOpacity={0.8}>
            <Text style={styles.smallCardIcon}>{'~'}</Text>
            <Text style={styles.smallCardTitle}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('Calendar')}
            activeOpacity={0.8}>
            <Text style={styles.smallCardIcon}>{'#'}</Text>
            <Text style={styles.smallCardTitle}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}>
            <Text style={styles.smallCardIcon}>{'='}</Text>
            <Text style={styles.smallCardTitle}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.smallCard, { backgroundColor: colors.primaryLight }]}
            onPress={() => navigation.navigate('AdminLogin')}
            activeOpacity={0.8}>
            <Text style={[styles.smallCardIcon, { color: colors.primaryDark }]}>{'#'}</Text>
            <Text style={[styles.smallCardTitle, { color: colors.primaryDark }]}>Admin Panel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}>
            <Text style={styles.smallCardIcon}>{'*'}</Text>
            <Text style={styles.smallCardTitle}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallCard}
            onPress={() => navigation.navigate('WorkerList')}
            activeOpacity={0.8}>
            <Text style={styles.smallCardIcon}>{'&'}</Text>
            <Text style={styles.smallCardTitle}>Workers</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Datalake 3.0 Integration</Text>
          <Text style={styles.infoText}>
            100% offline face recognition with MobileFaceNet (1.15 MB).
            Multi-layer security: liveness challenges, anti-spoof texture analysis,
            BioHash (ISO/IEC 24745), differential privacy, geofence validation,
            AES-256 encrypted biometric storage with hardware keystore.
            Auto-syncs to AWS when connectivity restores.
          </Text>
        </View>

        <View style={styles.techCard}>
          <Text style={styles.techTitle}>Security Stack</Text>
          <View style={styles.techRow}>
            {[
              'AES-256', 'BioHash', 'Anti-Spoof', 'Liveness', 'Geofence',
              'PPE Detection', 'Play Integrity', 'Diff Privacy', 'OTA Updates',
              'WCAG AAA', 'Voice TTS', 'Hindi/EN',
            ].map((t, i) => (
              <View key={i} style={styles.techBadge}>
                <Text style={styles.techBadgeText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerTitle: { ...typography.h1, color: colors.white, fontSize: 32 },
  headerSubtitle: { ...typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  statusText: { ...typography.caption, color: 'rgba(255,255,255,0.9)' },
  modelBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  modelBadgeText: { fontSize: 11, color: colors.white, fontWeight: '600' },
  content: { flex: 1, padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statNumber: { fontSize: 24, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: 2, fontSize: 10 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  primaryAction: { backgroundColor: colors.white },
  secondaryAction: { backgroundColor: colors.white },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  actionTextContainer: { flex: 1, marginLeft: spacing.md },
  actionTitle: { ...typography.h3, fontSize: 16 },
  actionDescription: { ...typography.bodySmall, marginTop: 1, fontSize: 12 },
  arrow: { fontSize: 24, color: colors.textLight, fontWeight: '300' },
  bottomRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xs },
  smallCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  smallCardIcon: { fontSize: 22, marginBottom: spacing.xs, color: colors.primary, fontWeight: '700' },
  smallCardTitle: { ...typography.bodySmall, fontWeight: '600' },
  infoCard: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoTitle: { ...typography.body, fontWeight: '600', color: colors.primary, fontSize: 14 },
  infoText: { ...typography.bodySmall, color: colors.primaryDark, marginTop: spacing.xs, lineHeight: 20, fontSize: 12 },
  techCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xxl,
    ...shadows.sm,
  },
  techTitle: { ...typography.bodySmall, fontWeight: '700', marginBottom: spacing.sm },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  techBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  techBadgeText: { fontSize: 11, fontWeight: '600', color: colors.success },
});
