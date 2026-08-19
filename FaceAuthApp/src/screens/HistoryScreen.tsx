import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
import { getAuthLogs } from '../services/database';
import type { AuthLog } from '../types';

export default function HistoryScreen() {
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  useFocusEffect(
    useCallback(() => {
      getAuthLogs().then(setLogs);
    }, []),
  );

  const filtered = logs.filter(l => {
    if (filter === 'success') return l.authenticated;
    if (filter === 'failed') return !l.authenticated;
    return true;
  });

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: AuthLog }) => (
    <View style={[styles.logCard, item.authenticated ? styles.logCardSuccess : styles.logCardFail]}>
      <View style={styles.logHeader}>
        <View style={styles.nameRow}>
          <Text style={styles.logName}>
            {item.userName || 'Unidentified Attempt'}
          </Text>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: item.authenticated ? colors.successDim : colors.dangerDim,
              borderColor: item.authenticated ? colors.success : colors.danger,
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: item.authenticated ? colors.success : colors.danger },
            ]}>
            {item.authenticated ? 'VERIFIED' : 'REJECTED'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.chipRow}>
        <View style={[styles.chip, { borderColor: item.livenessPassed ? colors.success : colors.danger }]}>
          <Text style={[styles.chipText, { color: item.livenessPassed ? colors.success : colors.danger }]}>
            Liveness: {item.livenessPassed ? 'Pass' : 'Fail'}
          </Text>
        </View>

        {item.matchScore > 0 && (
          <View style={[styles.chip, { borderColor: colors.accent }]}>
            <Text style={[styles.chipText, { color: colors.accent }]}>
              Match: {(item.matchScore * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {item.spoofScore !== undefined && (
          <View style={[styles.chip, { borderColor: item.spoofScore > 0.4 ? colors.cyan : colors.danger }]}>
            <Text style={[styles.chipText, { color: item.spoofScore > 0.4 ? colors.cyan : colors.danger }]}>
              Spoof: {(item.spoofScore * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {item.bioHashVerified !== undefined && (
          <View style={[styles.chip, { borderColor: item.bioHashVerified ? colors.cyan : colors.textFaint }]}>
            <Text style={[styles.chipText, { color: item.bioHashVerified ? colors.cyan : colors.textFaint }]}>
              BioHash: {item.bioHashVerified ? 'OK' : 'N/A'}
            </Text>
          </View>
        )}

        {item.withinGeofence !== undefined && (
          <View style={[styles.chip, { borderColor: item.withinGeofence ? colors.success : colors.warn }]}>
            <Text style={[styles.chipText, { color: item.withinGeofence ? colors.success : colors.warn }]}>
              {item.withinGeofence ? 'GPS Site Verified' : 'Outside Boundary'}
            </Text>
          </View>
        )}

        {item.ppeCompliant !== undefined && (
          <View style={[styles.chip, { borderColor: item.ppeCompliant ? colors.success : colors.warn }]}>
            <Text style={[styles.chipText, { color: item.ppeCompliant ? colors.success : colors.warn }]}>
              PPE: {item.ppeCompliant ? 'Compliant' : 'Non-Compliant'}
            </Text>
          </View>
        )}

        {item.pipelineLatencyMs !== undefined && item.pipelineLatencyMs > 0 && (
          <View style={styles.chip}>
            <Text style={[styles.chipText, { fontFamily: MONO }]}>
              ⚡ {item.pipelineLatencyMs}ms
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {(['all', 'success', 'failed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.75}>
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}>
              {f === 'all' ? `ALL (${logs.length})` : f === 'success' ? `VERIFIED (${logs.filter(l => l.authenticated).length})` : `FAILED (${logs.filter(l => !l.authenticated).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyIcon}>📜</Text>
          </View>
          <Text style={styles.emptyText}>No authentication audit records</Text>
          <Text style={styles.emptySub}>Facial scan attempt logs and security tokens will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...shadows.glowAccent,
  },
  filterText: { fontSize: 10.5, fontWeight: '700', color: colors.textDim, letterSpacing: 0.5 },
  filterTextActive: { color: colors.onAccent, fontWeight: '800' },

  list: { padding: spacing.md },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  logCardSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  logCardFail: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: { flex: 1, marginRight: spacing.sm },
  logName: { ...typography.body, fontWeight: '700', fontSize: 14 },
  logTime: { fontFamily: MONO, fontSize: 10.5, color: colors.textDim, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2.5,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { fontSize: 9.5, fontWeight: '700', color: colors.textDim },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { ...typography.h3, marginTop: spacing.md, textAlign: 'center' },
  emptySub: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center', maxWidth: 280, color: colors.textDim },
});
