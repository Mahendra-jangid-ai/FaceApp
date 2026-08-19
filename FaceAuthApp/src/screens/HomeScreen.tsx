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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
                <Text style={s.brandAccent}>FaceAuth</Text>
              </View>
              <Text style={s.brandSub}>Biometric Attendance System</Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={[s.statusPill, { backgroundColor: online ? colors.successDim : colors.dangerDim, borderColor: online ? '#BBF7D0' : '#FECACA' }]}>
            <View style={[s.statusDot, { backgroundColor: online ? colors.success : colors.danger }]} />
            <Text style={[s.statusText, { color: online ? colors.success : colors.danger }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* KPI Stats Grid */}
        <View style={s.statsRow}>
          {[
            { val: userCount, label: 'Enrolled', color: colors.accent, bg: colors.accentDim },
            { val: onSiteCount, label: 'On Site', color: colors.success, bg: colors.successDim },
            { val: todayCount, label: 'Scans', color: colors.cyan, bg: colors.cyanDim },
            { val: `${successRate}%`, label: 'Success', color: colors.warn, bg: colors.warnDim },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Primary Action Button (Main Focus) */}
        <TouchableOpacity style={s.heroScanBtn} onPress={navTo('Authenticate')} activeOpacity={0.88}>
          <View style={s.heroScanLeft}>
            <View style={s.heroScanIconWrap}>
              <Text style={s.heroScanIcon}>◎</Text>
            </View>
            <View style={s.heroScanTextWrap}>
              <Text style={s.heroScanTitle}>Scan Face</Text>
              <Text style={s.heroScanSub}>Liveness + Anti-Spoof Authentication</Text>
            </View>
          </View>
          <View style={s.heroScanArrow}>
            <Text style={s.heroScanArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Section Heading */}
        <Text style={s.sectionTitle}>Main Actions</Text>

        {/* Other Operations */}
        <View style={s.actionsGrid}>
          <TouchableOpacity style={s.actionCard} onPress={navTo('Attendance')} activeOpacity={0.8}>
            <View style={[s.actionIconWrap, { backgroundColor: colors.successDim }]}>
              <Text style={[s.actionIcon, { color: colors.success }]}>✓</Text>
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>Attendance</Text>
              <Text style={s.actionSub}>Check-in / Check-out with GPS</Text>
            </View>
            <Text style={s.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={navTo('Enroll')} activeOpacity={0.8}>
            <View style={[s.actionIconWrap, { backgroundColor: colors.cyanDim }]}>
              <Text style={[s.actionIcon, { color: colors.cyan }]}>＋</Text>
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>Enrol Worker</Text>
              <Text style={s.actionSub}>Register new face & Aadhaar</Text>
            </View>
            <Text style={s.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.actionCard} onPress={navTo('PPECheck')} activeOpacity={0.8}>
            <View style={[s.actionIconWrap, { backgroundColor: colors.warnDim }]}>
              <Text style={[s.actionIcon, { color: colors.warn }]}>🛡️</Text>
            </View>
            <View style={s.actionTextWrap}>
              <Text style={s.actionTitle}>PPE Safety Check</Text>
              <Text style={s.actionSub}>Verify helmet & safety vest</Text>
            </View>
            <Text style={s.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Nav Matrix */}
        <Text style={s.sectionTitle}>Quick Access</Text>
        <View style={s.gridRow}>
          {[
            { label: 'Workers', icon: '👥', screen: 'WorkerList' as const, color: colors.cyan, bg: colors.cyanDim },
            { label: 'Calendar', icon: '📅', screen: 'Calendar' as const, color: colors.accent, bg: colors.accentDim },
            { label: 'Analytics', icon: '📊', screen: 'Dashboard' as const, color: colors.success, bg: colors.successDim },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.gridCard} onPress={navTo(item.screen)} activeOpacity={0.75}>
              <View style={[s.gridIconWrap, { backgroundColor: item.bg }]}>
                <Text style={s.gridIconText}>{item.icon}</Text>
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.gridRow}>
          {[
            { label: 'History', icon: '📜', screen: 'History' as const, color: colors.info, bg: colors.infoDim },
            { label: 'Admin', icon: '🔐', screen: 'AdminLogin' as const, color: colors.warn, bg: colors.warnDim },
            { label: 'Settings', icon: '⚙️', screen: 'Settings' as const, color: colors.textDim, bg: colors.surfaceAlt },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.gridCard} onPress={navTo(item.screen)} activeOpacity={0.75}>
              <View style={[s.gridIconWrap, { backgroundColor: item.bg }]}>
                <Text style={s.gridIconText}>{item.icon}</Text>
              </View>
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security & System Info */}
        <View style={s.infoCard}>
          <Text style={s.infoLabel}>Security & Privacy</Text>
          <View style={s.tagRow}>
            {[
              { t: 'AES-256 Encrypted', c: colors.textDim },
              { t: 'BioHash ISO 24745', c: colors.cyan },
              { t: 'Differential Privacy', c: colors.success },
              { t: 'Offline Engine', c: colors.accent },
              { t: 'GPS Geofenced', c: colors.warn },
              { t: 'Anti-Spoof Protected', c: colors.danger },
            ].map((tag, i) => (
              <View key={i} style={s.tag}>
                <Text style={[s.tagText, { color: tag.c }]}>{tag.t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.xs, paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerLeft: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoBadge: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  logoImg: { width: '85%', height: '85%' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brand: { fontSize: 18, fontWeight: '800', color: colors.text },
  brandAccent: { fontSize: 18, fontWeight: '800', color: colors.accent },
  brandSub: { fontSize: 11, fontWeight: '500', color: colors.textDim, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: borderRadius.full, gap: 6, borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  statVal: { fontSize: 20, fontWeight: '800', fontFamily: MONO },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.textDim, marginTop: 2 },

  heroScanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.accent, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginTop: spacing.lg, ...shadows.md,
  },
  heroScanLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  heroScanIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  heroScanIcon: { fontSize: 24, color: '#FFFFFF', fontWeight: '700' },
  heroScanTextWrap: { flex: 1 },
  heroScanTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  heroScanSub: { fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', marginTop: 2 },
  heroScanArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  heroScanArrowText: { fontSize: 16, color: colors.accent, fontWeight: '800' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: colors.text,
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },

  actionsGrid: { gap: spacing.sm },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  actionIconWrap: {
    width: 40, height: 40, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  actionIcon: { fontSize: 18, fontWeight: '700' },
  actionTextWrap: { flex: 1 },
  actionTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  actionSub: { fontSize: 12, color: colors.textDim, marginTop: 1 },
  actionArrow: { fontSize: 22, color: colors.textFaint, fontWeight: '300', marginLeft: spacing.sm },

  gridRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  gridCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  gridIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  gridIconText: { fontSize: 18 },
  gridLabel: { fontSize: 12, fontWeight: '600', color: colors.text },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    padding: spacing.md, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  infoLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.sm + 2, paddingVertical: 4,
    borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.line,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
});
