import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
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

    // BioHash verification rate
    const bhLogs = logs.filter(l => l.bioHashVerified !== undefined);
    setBioHashRate(bhLogs.length > 0 ? bhLogs.filter(l => l.bioHashVerified).length / bhLogs.length : 0);

    // PPE compliance rate
    const ppeLogs = logs.filter(l => l.ppeCompliant !== undefined);
    setPpeRate(ppeLogs.length > 0 ? ppeLogs.filter(l => l.ppeCompliant).length / ppeLogs.length : 0);

    // Average pipeline latency
    const latencyLogs = logs.filter(l => l.pipelineLatencyMs && l.pipelineLatencyMs > 0);
    setAvgLatency(latencyLogs.length > 0 ? Math.round(latencyLogs.reduce((a, l) => a + (l.pipelineLatencyMs || 0), 0) / latencyLogs.length) : 0);

    // Adaptive threshold info
    const adaptive = await getAdaptiveStats();
    setAdaptiveInfo(`${adaptive.threshold.toFixed(3)} (${adaptive.genuineSamples}g/${adaptive.impostorSamples}i)`);

    // Weekly data
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

    // Top users
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top KPIs */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.kpiNum}>{todayAuth}</Text>
          <Text style={styles.kpiLabel}>Auth Today</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.success }]}>
          <Text style={styles.kpiNum}>
            {todayAuth > 0 ? Math.round((todaySuccess / todayAuth) * 100) : 0}%
          </Text>
          <Text style={styles.kpiLabel}>Success Rate</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: colors.secondary }]}>
          <Text style={styles.kpiNum}>{todayAttendance}</Text>
          <Text style={styles.kpiLabel}>Attendance</Text>
        </View>
      </View>

      {/* Security Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Metrics</Text>
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Liveness Pass Rate</Text>
            <View style={styles.metricBarBg}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${livenessPassRate * 100}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {(livenessPassRate * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Geofence Compliance</Text>
            <View style={styles.metricBarBg}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${geoCompliance * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {(geoCompliance * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Match Confidence</Text>
            <View style={styles.metricBarBg}>
              <View
                style={[
                  styles.metricBarFill,
                  {
                    width: `${avgScore * 100}%`,
                    backgroundColor: colors.secondary,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {(avgScore * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>BioHash Verify Rate</Text>
            <View style={styles.metricBarBg}>
              <View style={[styles.metricBarFill, { width: `${bioHashRate * 100}%`, backgroundColor: '#00BFA5' }]} />
            </View>
            <Text style={styles.metricValue}>{(bioHashRate * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>PPE Compliance</Text>
            <View style={styles.metricBarBg}>
              <View style={[styles.metricBarFill, { width: `${ppeRate * 100}%`, backgroundColor: colors.warning }]} />
            </View>
            <Text style={styles.metricValue}>{(ppeRate * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Spoof Attempts Blocked</Text>
            <View style={{ flex: 1 }} />
            <Text
              style={[
                styles.metricValue,
                { color: spoofBlocked > 0 ? colors.error : colors.success },
              ]}>
              {spoofBlocked}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Pipeline Latency</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.metricValue}>{avgLatency}ms</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Adaptive Threshold</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.metricValue, { fontSize: 11, width: 'auto' as any }]}>{adaptiveInfo}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7-Day Trend</Text>
        <View style={styles.chartCard}>
          <View style={styles.barsRow}>
            {weekData.map((day, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      styles.barTotal,
                      { height: `${(day.total / maxWeek) * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      styles.barSuccess,
                      { height: `${(day.success / maxWeek) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{day.label}</Text>
                <Text style={styles.barCount}>{day.total}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#D1D5DB' }]} />
              <Text style={styles.legendText}>Total</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendText}>Success</Text>
            </View>
          </View>
        </View>
      </View>

      {/* System Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Enrolled Users</Text>
            <Text style={styles.infoValue}>{userCount}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Work Sites</Text>
            <Text style={styles.infoValue}>{siteCount}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Model</Text>
            <Text style={styles.infoValue}>MobileFaceNet INT8</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>LFW Accuracy</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>99.28%</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Model Size</Text>
            <Text style={styles.infoValue}>1.15 MB</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Anti-Spoof</Text>
            <Text style={styles.infoValue}>Laplacian + Liveness</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Encryption</Text>
            <Text style={styles.infoValue}>AES-256 + Keystore</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Biometric Protection</Text>
            <Text style={styles.infoValue}>BioHash ISO 24745</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Privacy</Text>
            <Text style={styles.infoValue}>Differential Privacy</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>PPE Detection</Text>
            <Text style={styles.infoValue}>Helmet + Vest</Text>
          </View>
        </View>
      </View>

      {/* Top Authenticated Users */}
      {topUsers.length > 0 && (
        <View style={[styles.section, { marginBottom: spacing.xxl }]}>
          <Text style={styles.sectionTitle}>Top Authenticated Users</Text>
          <View style={styles.infoCard}>
            {topUsers.map((u, i) => (
              <View
                key={i}
                style={[styles.topUserRow, i > 0 && styles.infoRowBorder]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.topUserName}>{u.name}</Text>
                <Text style={styles.topUserCount}>{u.count} auths</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.md,
  },
  kpiNum: { fontSize: 28, fontWeight: '700', color: colors.white },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  metricsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  metricLabel: { width: 140, ...typography.bodySmall, fontSize: 13 },
  metricBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricBarFill: { height: 8, borderRadius: 4 },
  metricValue: {
    width: 45,
    textAlign: 'right',
    ...typography.bodySmall,
    fontWeight: '600',
    fontSize: 13,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  barsRow: { flexDirection: 'row', justifyContent: 'space-around', height: 120 },
  barCol: { alignItems: 'center', flex: 1 },
  barContainer: {
    flex: 1,
    width: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: { position: 'absolute', bottom: 0, width: 20, borderRadius: 4 },
  barTotal: { backgroundColor: '#E5E7EB', width: 24 },
  barSuccess: { backgroundColor: colors.success, width: 16 },
  barLabel: { ...typography.caption, marginTop: 4, fontWeight: '600' },
  barCount: { ...typography.caption, fontSize: 10 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.caption, fontWeight: '500' },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  infoLabel: { ...typography.body, fontSize: 14 },
  infoValue: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.primary },
  topUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  topUserName: { ...typography.body, fontWeight: '500', flex: 1 },
  topUserCount: { ...typography.bodySmall, fontWeight: '600', color: colors.primary },
});
