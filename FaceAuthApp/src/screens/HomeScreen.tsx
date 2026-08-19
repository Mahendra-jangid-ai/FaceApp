import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { getEnrolledUsers, getAuthLogs, getTodayAttendance } from '../services/database';
import { isOnline } from '../services/syncService';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [userCount, setUserCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [onSiteCount, setOnSiteCount] = useState(0);
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
        setOnSiteCount(attendance.filter(a => a.checkOutTime === null).length);
        setSuccessRate(
          todayLogs.length > 0
            ? Math.round((todayLogs.filter(l => l.authenticated).length / todayLogs.length) * 100)
            : 0,
        );
        setOnline(await isOnline());
      })();
    }, []),
  );

  const navTo = (screen: keyof RootStackParamList) => () => navigation.navigate(screen as any);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoRow}>
            <View style={s.logoBadge}>
              <Image
                source={require('../assets/nhai_logo.png')}
                style={s.logoImg}
                resizeMode="contain"
              />
            </View>
            <View>
              <View style={s.brandRow}>
                <Text style={s.brand}>NHAI </Text>
                <Text style={s.brandAccent}>FACE AUTH</Text>
              </View>
              <Text style={s.brandSub}>NATIONAL HIGHWAYS BIOMETRIC SYSTEM</Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={[s.statusPill, { backgroundColor: online ? colors.successDim : colors.dangerDim, borderColor: online ? colors.success : colors.danger }]}>
            <View style={[s.statusDot, { backgroundColor: online ? colors.success : colors.danger }]} />
            <Text style={[s.statusText, { color: online ? colors.success : colors.danger }]}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <Text style={s.modelTag}>ML Kit Engine v3.0</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* KPI Stats Grid */}
        <View style={s.statsRow}>
          {[
            { val: userCount, label: 'ENROLLED', color: colors.accent, glow: colors.accentGlow },
            { val: onSiteCount, label: 'ON SITE', color: colors.success, glow: colors.successGlow },
            { val: todayCount, label: 'SCANS TODAY', color: colors.cyan, glow: colors.cyanGlow },
            { val: `${successRate}%`, label: 'ACCURACY', color: colors.warn, glow: colors.warnGlow },
          ].map((stat, i) => (
            <View key={i} style={[s.statCard, { shadowColor: stat.color }]}>
              <View style={[s.statTopBorder, { backgroundColor: stat.color }]} />
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Section Heading */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>CORE OPERATIONS</Text>
          <View style={s.sectionLine} />
        </View>

        {/* Main Action 1: SCAN */}
        <TouchableOpacity style={[s.primaryBtn, s.scanBtn]} onPress={navTo('Authenticate')} activeOpacity={0.85}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
            <Text style={[s.primaryIcon, { color: colors.accent }]}>{'◎'}</Text>
          </View>
          <View style={s.primaryText}>
            <View style={s.titleBadgeRow}>
              <Text style={s.primaryTitle}>SCAN & AUTHENTICATE</Text>
              <View style={[s.badgePill, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                <Text style={[s.badgePillText, { color: colors.accent }]}>FAST</Text>
              </View>
            </View>
            <Text style={s.primarySub}>Live Gesture + Anti-Spoof + BioHash AI</Text>
          </View>
          <View style={s.arrowCircle}>
            <Text style={s.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Main Action 2: ATTENDANCE */}
        <TouchableOpacity style={s.primaryBtn} onPress={navTo('Attendance')} activeOpacity={0.85}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.successDim, borderColor: colors.success }]}>
            <Text style={[s.primaryIcon, { color: colors.success }]}>{'✓'}</Text>
          </View>
          <View style={s.primaryText}>
            <View style={s.titleBadgeRow}>
              <Text style={s.primaryTitle}>MARK ATTENDANCE</Text>
              <View style={[s.badgePill, { backgroundColor: colors.successDim, borderColor: colors.success }]}>
                <Text style={[s.badgePillText, { color: colors.success }]}>GPS</Text>
              </View>
            </View>
            <Text style={s.primarySub}>Check-in & Check-out with Geofence Sync</Text>
          </View>
          <View style={s.arrowCircle}>
            <Text style={s.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Main Action 3: ENROL */}
        <TouchableOpacity style={s.primaryBtn} onPress={navTo('Enroll')} activeOpacity={0.85}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.cyanDim, borderColor: colors.cyan }]}>
            <Text style={[s.primaryIcon, { color: colors.cyan }]}>{'+'}</Text>
          </View>
          <View style={s.primaryText}>
            <View style={s.titleBadgeRow}>
              <Text style={s.primaryTitle}>ENROL NEW WORKER</Text>
              <View style={[s.badgePill, { backgroundColor: colors.cyanDim, borderColor: colors.cyan }]}>
                <Text style={[s.badgePillText, { color: colors.cyan }]}>SECURE</Text>
              </View>
            </View>
            <Text style={s.primarySub}>128D Face Vector + Aadhaar Vault Registration</Text>
          </View>
          <View style={s.arrowCircle}>
            <Text style={s.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Main Action 4: PPE */}
        <TouchableOpacity style={s.primaryBtn} onPress={navTo('PPECheck')} activeOpacity={0.85}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.warnDim, borderColor: colors.warn }]}>
            <Text style={[s.primaryIcon, { color: colors.warn }]}>{'🛡'}</Text>
          </View>
          <View style={s.primaryText}>
            <View style={s.titleBadgeRow}>
              <Text style={s.primaryTitle}>PPE SAFETY AUDIT</Text>
              <View style={[s.badgePill, { backgroundColor: colors.warnDim, borderColor: colors.warn }]}>
                <Text style={[s.badgePillText, { color: colors.warn }]}>AI</Text>
              </View>
            </View>
            <Text style={s.primarySub}>Detect Helmet & High-Vis Safety Vest</Text>
          </View>
          <View style={s.arrowCircle}>
            <Text style={s.arrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Nav Matrix */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>SYSTEM UTILITIES</Text>
          <View style={s.sectionLine} />
        </View>

        <View style={s.gridRow}>
          {[
            { label: 'WORKERS', desc: 'Directory', icon: '👥', screen: 'WorkerList' as const, color: colors.cyan },
            { label: 'CALENDAR', desc: 'Logs', icon: '📅', screen: 'Calendar' as const, color: colors.accent },
            { label: 'ANALYTICS', desc: 'Trends', icon: '📊', screen: 'Dashboard' as const, color: colors.success },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.gridCard} onPress={navTo(item.screen)} activeOpacity={0.75}>
              <View style={[s.gridIconWrap, { backgroundColor: `${item.color}15` }]}>
                <Text style={s.gridIconText}>{item.icon}</Text>
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
              <Text style={s.gridDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.gridRow}>
          {[
            { label: 'AUDIT', desc: 'History', icon: '📜', screen: 'History' as const, color: colors.info },
            { label: 'ADMIN', desc: 'Control', icon: '🔐', screen: 'AdminLogin' as const, color: colors.warn },
            { label: 'SETTINGS', desc: 'Config', icon: '⚙️', screen: 'Settings' as const, color: colors.textDim },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.gridCard} onPress={navTo(item.screen)} activeOpacity={0.75}>
              <View style={[s.gridIconWrap, { backgroundColor: `${item.color}15` }]}>
                <Text style={s.gridIconText}>{item.icon}</Text>
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
              <Text style={s.gridDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Stack Section */}
        <View style={s.infoCard}>
          <View style={s.infoCardHeader}>
            <Text style={s.infoLabel}>MILITARY-GRADE SECURITY STACK</Text>
            <View style={s.shieldDot} />
          </View>
          <View style={s.tagRow}>
            {[
              { t: 'AES-256 GCM', c: colors.accent },
              { t: 'BioHash ISO/IEC 24745', c: colors.cyan },
              { t: 'Dual Anti-Spoof', c: colors.danger },
              { t: 'Dynamic Liveness', c: colors.success },
              { t: 'GPS Geofencing', c: colors.warn },
              { t: 'PPE Compliance', c: colors.accent },
              { t: 'Diff Privacy ε=0.5', c: colors.cyan },
              { t: 'OTA Updates', c: colors.info },
              { t: 'Bilingual HI/EN', c: colors.textDim },
              { t: 'WCAG AAA Compliant', c: colors.success },
            ].map((tag, i) => (
              <View key={i} style={[s.tag, { borderColor: `${tag.c}60`, backgroundColor: `${tag.c}12` }]}>
                <Text style={[s.tagText, { color: tag.c }]}>{tag.t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* System Telemetry Card */}
        <View style={s.telemetryCard}>
          <View style={s.telemetryHeader}>
            <Text style={s.telemetryTitle}>SYSTEM TELEMETRY</Text>
            <Text style={s.telemetryStatus}>ACTIVE</Text>
          </View>
          <View style={s.telemetryRow}>
            <Text style={s.telemetryKey}>Inference Engine</Text>
            <Text style={s.telemetryVal}>MobileFaceNet INT8 (1.15 MB)</Text>
          </View>
          <View style={s.telemetryRow}>
            <Text style={s.telemetryKey}>LFW Benchmark</Text>
            <Text style={[s.telemetryVal, { color: colors.success }]}>99.28% Top-1</Text>
          </View>
          <View style={s.telemetryRow}>
            <Text style={s.telemetryKey}>Pipeline Latency</Text>
            <Text style={[s.telemetryVal, { color: colors.cyan }]}>~170ms E2E</Text>
          </View>
          <View style={s.telemetryRow}>
            <Text style={s.telemetryKey}>Key Management</Text>
            <Text style={s.telemetryVal}>Hardware Keystore / Secure Enclave</Text>
          </View>
          <View style={s.telemetryRow}>
            <Text style={s.telemetryKey}>Sync Protocol</Text>
            <Text style={s.telemetryVal}>Datalake 3.0 + Exponential Backoff</Text>
          </View>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.sm, paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerLeft: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoBadge: {
    width: 46, height: 46, borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    padding: 3, borderWidth: 1, borderColor: colors.lineBright, ...shadows.sm,
  },
  logoImg: { width: '100%', height: '100%' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  brandAccent: { fontSize: 18, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
  brandSub: { fontSize: 8.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.8, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', marginLeft: spacing.sm },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: borderRadius.full, gap: 6, borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modelTag: { fontFamily: MONO, fontSize: 9.5, color: colors.textFaint, marginTop: 4 },

  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
    overflow: 'hidden', ...shadows.sm,
  },
  statTopBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statVal: { fontSize: 22, fontWeight: '800', fontFamily: MONO, marginTop: 2 },
  statLabel: { ...typography.caption, fontSize: 8.5, marginTop: 4, color: colors.textDim },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.accent, letterSpacing: 1.5, fontWeight: '800' },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.line, marginLeft: spacing.md },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.md + 2, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.line, ...shadows.md,
  },
  scanBtn: {
    borderColor: colors.accent, borderWidth: 1.5,
    backgroundColor: 'rgba(255, 122, 26, 0.06)',
  },
  primaryIconWrap: {
    width: 46, height: 46, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  primaryIcon: { fontSize: 22, fontWeight: '700' },
  primaryText: { flex: 1, marginLeft: spacing.md },
  titleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primaryTitle: { ...typography.h3, fontSize: 14, letterSpacing: 0.6 },
  badgePill: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: borderRadius.xs, borderWidth: 1 },
  badgePillText: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8 },
  primarySub: { ...typography.bodySmall, fontSize: 11, marginTop: 2, color: colors.textDim },
  arrowCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line,
  },
  arrowText: { fontSize: 15, color: colors.textDim, fontWeight: '700' },

  gridRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  gridCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  gridIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  gridIconText: { fontSize: 18 },
  gridLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.text, marginTop: 2 },
  gridDesc: { fontSize: 9, fontWeight: '500', color: colors.textFaint, marginTop: 1 },

  infoCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.line,
  },
  infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.accent, letterSpacing: 1.2 },
  shieldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm, borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  telemetryCard: {
    backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  telemetryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  telemetryTitle: { ...typography.caption, color: colors.cyan, letterSpacing: 1.2 },
  telemetryStatus: { fontFamily: MONO, fontSize: 9, color: colors.success, fontWeight: '700' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  telemetryKey: { fontSize: 11.5, color: colors.textDim, fontWeight: '500' },
  telemetryVal: { fontFamily: MONO, fontSize: 11.5, color: colors.text, fontWeight: '600' },
});
