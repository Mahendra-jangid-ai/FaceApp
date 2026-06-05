import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { getEnrolledUsers, getAuthLogs, getAttendanceRecords } from '../services/database';
import { getWorkSites } from '../services/geofencing';
import { getAdaptiveStats } from '../services/adaptiveThreshold';
import type { AuthLog } from '../types';

interface DayStats {
  label: string;
  total: number;
  success: number;
}

export default function DashboardScreen() {
  const [userCount, setUserCount] = useState(0);
  const [siteCount, setSiteCount] = useState(0);
  const [todayAuth, setTodayAuth] = useState(0);
  const [todaySuccess, setTodaySuccess] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [geoCompliance, setGeoCompliance] = useState(0);
  const [spoofBlocked, setSpoofBlocked] = useState(0);
  const [weekData, setWeekData] = useState<DayStats[]>([]);
  const [topUsers, setTopUsers] = useState<{ name: string; count: number }[]>([]);
  const [livenessPassRate, setLivenessPassRate] = useState(0);
  const [bioHashRate, setBioHashRate] = useState(0);
  const [ppeRate, setPpeRate] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [adaptiveInfo, setAdaptiveInfo] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const loadStats = async () => {
    const [users, logs, attendance, sites] = await Promise.all([
      getEnrolledUsers(),
      getAuthLogs(),
      getAttendanceRecords(),
      getWorkSites(),
    ]);

    setUserCount(users.length);
    setSiteCount(sites.length);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter(l => l.timestamp >= todayStart.getTime());
    setTodayAuth(todayLogs.length);
    setTodaySuccess(todayLogs.filter(l => l.authenticated).length);

    const todayAtt = attendance.filter(a => a.checkInTime >= todayStart.getTime());
    setTodayAttendance(todayAtt.length);

    const successLogs = logs.filter(l => l.authenticated && l.matchScore > 0);
    setAvgScore(
      successLogs.length > 0
        ? successLogs.reduce((s, l) => s + l.matchScore, 0) / successLogs.length
        : 0,
    );

    const geoLogs = logs.filter(l => l.withinGeofence !== undefined);
    setGeoCompliance(
      geoLogs.length > 0
        ? geoLogs.filter(l => l.withinGeofence).length / geoLogs.length
        : 0,
    );

    const spoofed = logs.filter(l => (l.spoofScore ?? 1) < 0.4);
    setSpoofBlocked(spoofed.length);

    const livenessLogs = logs.filter(l => l.livenessPassed !== undefined);
    setLivenessPassRate(
      livenessLogs.length > 0
        ? livenessLogs.filter(l => l.livenessPassed).length / livenessLogs.length
        : 0,
    );

    const bhLogs = logs.filter(l => l.bioHashVerified !== undefined);
    setBioHashRate(bhLogs.length > 0 ? bhLogs.filter(l => l.bioHashVerified).length / bhLogs.length : 0);

    const ppeLogs = logs.filter(l => l.ppeCompliant !== undefined);
    setPpeRate(ppeLogs.length > 0 ? ppeLogs.filter(l => l.ppeCompliant).length / ppeLogs.length : 0);

    const latencyLogs = logs.filter(l => l.pipelineLatencyMs && l.pipelineLatencyMs > 0);
    setAvgLatency(latencyLogs.length > 0 ? Math.round(latencyLogs.reduce((a, l) => a + (l.pipelineLatencyMs || 0), 0) / latencyLogs.length) : 0);

    const adaptive = await getAdaptiveStats();
    setAdaptiveInfo(`${adaptive.threshold.toFixed(3)} (${adaptive.genuineSamples}g/${adaptive.impostorSamples}i)`);

    const days: DayStats[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      const dayLogs = logs.filter(
        l => l.timestamp >= d.getTime() && l.timestamp < nextD.getTime(),
      );
      days.push({
        label: dayNames[d.getDay()],
        total: dayLogs.length,
        success: dayLogs.filter(l => l.authenticated).length,
      });
    }
    setWeekData(days);

    const userMap = new Map<string, number>();
    for (const log of logs) {
      if (log.authenticated && log.userName) {
        userMap.set(log.userName, (userMap.get(log.userName) || 0) + 1);
      }
    }
    const sorted = [...userMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    setTopUsers(sorted);
  };

  const maxWeek = Math.max(...weekData.map(d => d.total), 1);

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Top KPIs */}
      <View style={st.kpiRow}>
        <View style={[st.kpiCard, { borderColor: colors.accent }]}>
          <Text style={[st.kpiNum, { color: colors.accent }]}>{todayAuth}</Text>
          <Text style={st.kpiLabel}>Auth Today</Text>
        </View>
        <View style={[st.kpiCard, { borderColor: colors.success }]}>
          <Text style={[st.kpiNum, { color: colors.success }]}>
            {todayAuth > 0 ? Math.round((todaySuccess / todayAuth) * 100) : 0}%
          </Text>
          <Text style={st.kpiLabel}>Success Rate</Text>
        </View>
        <View style={[st.kpiCard, { borderColor: colors.cyan }]}>
          <Text style={[st.kpiNum, { color: colors.cyan }]}>{todayAttendance}</Text>
          <Text style={st.kpiLabel}>Attendance</Text>
        </View>
      </View>

      {/* Security Metrics */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>SECURITY METRICS</Text>
        <View style={st.metricsCard}>
          {[
            { label: 'Liveness Pass Rate', value: livenessPassRate, color: colors.success },
            { label: 'Geofence Compliance', value: geoCompliance, color: colors.cyan },
            { label: 'Avg Match Confidence', value: avgScore, color: colors.accent },
            { label: 'BioHash Verify Rate', value: bioHashRate, color: colors.info },
            { label: 'PPE Compliance', value: ppeRate, color: colors.warn },
          ].map((m, i) => (
            <View key={i} style={st.metricRow}>
              <Text style={st.metricLabel}>{m.label}</Text>
              <View style={st.metricBarBg}>
                <View style={[st.metricBarFill, { width: `${m.value * 100}%`, backgroundColor: m.color }]} />
              </View>
              <Text style={[st.metricValue, { color: m.color }]}>{(m.value * 100).toFixed(0)}%</Text>
            </View>
          ))}
          <View style={st.metricRow}>
            <Text style={st.metricLabel}>Spoof Blocked</Text>
            <View style={{ flex: 1 }} />
            <Text style={[st.metricValue, { color: spoofBlocked > 0 ? colors.danger : colors.success }]}>{spoofBlocked}</Text>
          </View>
          <View style={st.metricRow}>
            <Text style={st.metricLabel}>Avg Pipeline Latency</Text>
            <View style={{ flex: 1 }} />
            <Text style={st.metricValue}>{avgLatency}ms</Text>
          </View>
          <View style={st.metricRow}>
            <Text style={st.metricLabel}>Adaptive Threshold</Text>
            <View style={{ flex: 1 }} />
            <Text style={[st.metricValue, { fontSize: 11 }]}>{adaptiveInfo}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Trend */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>7-DAY TREND</Text>
        <View style={st.chartCard}>
          <View style={st.barsRow}>
            {weekData.map((day, i) => (
              <View key={i} style={st.barCol}>
                <View style={st.barContainer}>
                  <View style={[st.bar, st.barTotal, { height: `${(day.total / maxWeek) * 100}%` }]} />
                  <View style={[st.bar, st.barSuccess, { height: `${(day.success / maxWeek) * 100}%` }]} />
                </View>
                <Text style={st.barLabel}>{day.label}</Text>
                <Text style={st.barCount}>{day.total}</Text>
              </View>
            ))}
          </View>
          <View style={st.legendRow}>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: colors.lineBright }]} />
              <Text style={st.legendText}>Total</Text>
            </View>
            <View style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: colors.success }]} />
              <Text style={st.legendText}>Success</Text>
            </View>
          </View>
        </View>
      </View>

      {/* System Info */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>SYSTEM OVERVIEW</Text>
        <View style={st.infoCard}>
          {[
            { label: 'Enrolled Users', value: `${userCount}`, color: colors.text },
            { label: 'Work Sites', value: `${siteCount}`, color: colors.text },
            { label: 'Model', value: 'MobileFaceNet INT8', color: colors.accent },
            { label: 'LFW Accuracy', value: '99.28%', color: colors.success },
            { label: 'Model Size', value: '1.15 MB', color: colors.text },
            { label: 'Anti-Spoof', value: 'Laplacian + Liveness', color: colors.text },
            { label: 'Encryption', value: 'AES-256 + Keystore', color: colors.cyan },
            { label: 'Biometric', value: 'BioHash ISO 24745', color: colors.text },
            { label: 'Privacy', value: 'Differential Privacy', color: colors.text },
            { label: 'PPE Detection', value: 'Helmet + Vest', color: colors.warn },
          ].map((row, i) => (
            <View key={i} style={[st.infoRow, i > 0 && st.infoRowBorder]}>
              <Text style={st.infoLabel}>{row.label}</Text>
              <Text style={[st.infoValue, { color: row.color }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Users */}
      {topUsers.length > 0 && (
        <View style={[st.section, { marginBottom: spacing.xxl }]}>
          <Text style={st.sectionTitle}>TOP AUTHENTICATED USERS</Text>
          <View style={st.infoCard}>
            {topUsers.map((u, i) => (
              <View key={i} style={[st.topUserRow, i > 0 && st.infoRowBorder]}>
                <View style={st.rankBadge}>
                  <Text style={st.rankText}>{i + 1}</Text>
                </View>
                <Text style={st.topUserName}>{u.name}</Text>
                <Text style={st.topUserCount}>{u.count} auths</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  kpiCard: {
    flex: 1, padding: spacing.md, borderRadius: borderRadius.md,
    alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, ...shadows.md,
  },
  kpiNum: { fontSize: 28, fontWeight: '800', fontFamily: MONO },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: colors.textDim, marginTop: 2 },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  sectionTitle: {
    ...typography.caption, color: colors.accent,
    marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
  },
  metricsCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  metricRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, gap: spacing.sm,
  },
  metricLabel: { width: 140, fontSize: 13, fontWeight: '500', color: colors.textDim },
  metricBarBg: {
    flex: 1, height: 6, backgroundColor: colors.line,
    borderRadius: 3, overflow: 'hidden',
  },
  metricBarFill: { height: 6, borderRadius: 3 },
  metricValue: {
    width: 45, textAlign: 'right', fontFamily: MONO,
    fontSize: 12, fontWeight: '600', color: colors.textDim,
  },
  chartCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.line,
  },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', height: 120 },
  barCol: { alignItems: 'center', flex: 1 },
  barContainer: { flex: 1, width: 24, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { position: 'absolute', bottom: 0, width: 20, borderRadius: 4 },
  barTotal: { backgroundColor: colors.lineBright, width: 24 },
  barSuccess: { backgroundColor: colors.success, width: 16 },
  barLabel: { ...typography.caption, marginTop: 4, fontWeight: '600' },
  barCount: { ...typography.caption, fontSize: 10 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.caption, fontWeight: '500' },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.line,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  infoLabel: { fontSize: 14, fontWeight: '500', color: colors.textDim },
  infoValue: { fontSize: 14, fontWeight: '600', fontFamily: MONO },
  topUserRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.md,
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  topUserName: { fontSize: 15, fontWeight: '500', color: colors.text, flex: 1 },
  topUserCount: { fontSize: 13, fontWeight: '600', color: colors.accent, fontFamily: MONO },
});
