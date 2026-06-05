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
              <Text style={s.brand}>NHAI <Text style={s.brandAccent}>FACE AUTH</Text></Text>
              <Text style={s.brandSub}>NHAI BIOMETRIC SYSTEM</Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={[s.statusPill, { backgroundColor: online ? colors.successDim : colors.dangerDim }]}>
            <View style={[s.statusDot, { backgroundColor: online ? colors.success : colors.danger }]} />
            <Text style={[s.statusText, { color: online ? colors.success : colors.danger }]}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <Text style={s.modelTag}>ML Kit Face Engine</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={s.statsRow}>
          {[
            { val: userCount, label: 'ENROLLED', color: colors.accent },
            { val: onSiteCount, label: 'ON SITE', color: colors.success },
            { val: todayCount, label: 'AUTH TODAY', color: colors.cyan },
            { val: `${successRate}%`, label: 'SUCCESS', color: colors.warn },
          ].map((stat, i) => (
            <View key={i} style={s.statCard}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Primary Actions */}
        <TouchableOpacity style={[s.primaryBtn, s.scanBtn]} onPress={navTo('Authenticate')} activeOpacity={0.8}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.accentDim }]}>
            <Text style={[s.primaryIcon, { color: colors.accent }]}>{'◎'}</Text>
          </View>
          <View style={s.primaryText}>
            <Text style={s.primaryTitle}>SCAN & AUTHENTICATE</Text>
            <Text style={s.primarySub}>Liveness + Anti-Spoof + BioHash Recognition</Text>
          </View>
          <Text style={s.chevron}>{'›'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.primaryBtn} onPress={navTo('Attendance')} activeOpacity={0.8}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.successDim }]}>
            <Text style={[s.primaryIcon, { color: colors.success }]}>{'✓'}</Text>
          </View>
          <View style={s.primaryText}>
            <Text style={s.primaryTitle}>MARK ATTENDANCE</Text>
            <Text style={s.primarySub}>Check-in / Check-out with GPS Verification</Text>
          </View>
          <Text style={s.chevron}>{'›'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.primaryBtn} onPress={navTo('Enroll')} activeOpacity={0.8}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.cyanDim }]}>
            <Text style={[s.primaryIcon, { color: colors.cyan }]}>{'＋'}</Text>
          </View>
          <View style={s.primaryText}>
            <Text style={s.primaryTitle}>ENROL NEW WORKER</Text>
            <Text style={s.primarySub}>Register Face + Aadhaar + BioHash Protection</Text>
          </View>
          <Text style={s.chevron}>{'›'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.primaryBtn} onPress={navTo('PPECheck')} activeOpacity={0.8}>
          <View style={[s.primaryIconWrap, { backgroundColor: colors.warnDim }]}>
            <Text style={[s.primaryIcon, { color: colors.warn }]}>{'⚠'}</Text>
          </View>
          <View style={s.primaryText}>
            <Text style={s.primaryTitle}>PPE COMPLIANCE</Text>
            <Text style={s.primarySub}>Verify Helmet & Vest Before Site Entry</Text>
          </View>
          <Text style={s.chevron}>{'›'}</Text>
        </TouchableOpacity>

        {/* Quick Nav Grid */}
        <View style={s.gridRow}>
          {[
            { label: 'PEOPLE', icon: '☰', screen: 'WorkerList' as const, color: colors.cyan },
            { label: 'CALENDAR', icon: '▣', screen: 'Calendar' as const, color: colors.accent },
            { label: 'DASHBOARD', icon: '◈', screen: 'Dashboard' as const, color: colors.success },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.gridCard} onPress={navTo(item.screen)} activeOpacity={0.7}>
              <Text style={[s.gridIcon, { color: item.color }]}>{item.icon}</Text>
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.gridRow}>
          {[
            { label: 'HISTORY', icon: '◷', screen: 'History' as const, color: colors.info },
            { label: 'ADMIN', icon: '⌘', screen: 'AdminLogin' as const, color: colors.warn },
            { label: 'SYSTEM', icon: '⚙', screen: 'Settings' as const, color: colors.textDim },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.gridCard} onPress={navTo(item.screen)} activeOpacity={0.7}>
              <Text style={[s.gridIcon, { color: item.color }]}>{item.icon}</Text>
              <Text style={s.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Stack */}
        <View style={s.infoCard}>
          <Text style={s.infoLabel}>SECURITY STACK</Text>
          <View style={s.tagRow}>
            {[
              { t: 'AES-256', c: colors.accent },
              { t: 'BioHash', c: colors.cyan },
              { t: 'Anti-Spoof', c: colors.danger },
              { t: 'Liveness', c: colors.success },
              { t: 'Geofence', c: colors.warn },
              { t: 'PPE Detect', c: colors.accent },
              { t: 'Diff Privacy', c: colors.cyan },
              { t: 'OTA Updates', c: colors.info },
              { t: 'Hindi/EN', c: colors.textDim },
              { t: 'WCAG AAA', c: colors.success },
            ].map((tag, i) => (
              <View key={i} style={[s.tag, { borderColor: tag.c }]}>
                <Text style={[s.tagText, { color: tag.c }]}>{tag.t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* System Info */}
        <View style={s.infoCard}>
          <Text style={s.infoLabel}>SYSTEM INFO</Text>
          <Text style={s.mono}>Model    : MobileFaceNet INT8 (1.15 MB)</Text>
          <Text style={s.mono}>Accuracy : 99.28% LFW</Text>
          <Text style={s.mono}>Pipeline : ~170ms end-to-end</Text>
          <Text style={s.mono}>Storage  : AES-256 + Hardware Keystore</Text>
          <Text style={s.mono}>Sync     : Datalake 3.0 with Retry Backoff</Text>
          <Text style={s.mono}>Privacy  : ISO/IEC 24745 BioHash</Text>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: spacing.xxxl + spacing.lg, paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerLeft: {},
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoBadge: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    padding: 4, ...shadows.sm,
  },
  logoImg: { width: '100%', height: '100%' },
  brand: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: 1.5 },
  brandAccent: { color: colors.accent },
  brandSub: { fontSize: 9, fontWeight: '700', color: colors.textFaint, letterSpacing: 1.5, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: borderRadius.full, gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modelTag: { fontFamily: MONO, fontSize: 9, color: colors.textFaint, marginTop: 4 },

  scroll: { flex: 1, paddingHorizontal: spacing.lg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  statVal: { fontSize: 24, fontWeight: '800', fontFamily: MONO },
  statLabel: { ...typography.caption, fontSize: 9, marginTop: 4 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, padding: spacing.lg, marginTop: spacing.sm,
    borderWidth: 1, borderColor: colors.line, ...shadows.md,
  },
  scanBtn: {
    borderColor: colors.accent, borderWidth: 1.5,
    backgroundColor: 'rgba(255,107,53,0.04)',
  },
  primaryIconWrap: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryIcon: { fontSize: 22 },
  primaryText: { flex: 1, marginLeft: spacing.lg },
  primaryTitle: { ...typography.h3, fontSize: 14, letterSpacing: 1 },
  primarySub: { ...typography.bodySmall, fontSize: 11, marginTop: 2 },
  chevron: { fontSize: 28, color: colors.textFaint, fontWeight: '300' },

  gridRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  gridCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.line,
  },
  gridIcon: { fontSize: 24 },
  gridLabel: { ...typography.caption, fontSize: 9, marginTop: spacing.sm },

  infoCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.line,
  },
  infoLabel: { ...typography.caption, color: colors.accent, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderRadius: borderRadius.sm, borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  mono: { fontFamily: MONO, fontSize: 12, color: colors.textDim, lineHeight: 22 },
});
