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
            {item.userName || 'Unregistered Person'}
          </Text>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: item.authenticated ? colors.successDim : colors.dangerDim,
              borderColor: item.authenticated ? '#BBF7D0' : '#FECACA',
            },
          ]}>
          <Text
            style={[
              styles.badgeText,
              { color: item.authenticated ? colors.success : colors.danger },
            ]}>
            {item.authenticated ? 'Verified' : 'Failed'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={[styles.chipText, { color: item.livenessPassed ? colors.success : colors.danger }]}>
            Liveness: {item.livenessPassed ? 'Pass' : 'Fail'}
          </Text>
        </View>

        {item.matchScore > 0 && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              Match: {(item.matchScore * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {item.spoofScore !== undefined && (
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: item.spoofScore > 0.4 ? colors.textDim : colors.danger }]}>
              Spoof: {(item.spoofScore * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {item.bioHashVerified !== undefined && (
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: item.bioHashVerified ? colors.cyan : colors.textFaint }]}>
              BioHash: {item.bioHashVerified ? 'OK' : 'N/A'}
            </Text>
          </View>
        )}

        {item.withinGeofence !== undefined && (
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: item.withinGeofence ? colors.success : colors.warn }]}>
              {item.withinGeofence ? 'GPS Verified' : 'Outside Boundary'}
            </Text>
          </View>
        )}

        {item.ppeCompliant !== undefined && (
          <View style={styles.chip}>
            <Text style={[styles.chipText, { color: item.ppeCompliant ? colors.success : colors.warn }]}>
              PPE: {item.ppeCompliant ? 'Compliant' : 'Fail'}
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
              {f === 'all' ? `All (${logs.length})` : f === 'success' ? `Verified (${logs.filter(l => l.authenticated).length})` : `Failed (${logs.filter(l => !l.authenticated).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyText}>No authentication logs yet</Text>
          <Text style={styles.emptySub}>Verification logs will appear here after scans.</Text>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    ...shadows.sm,
  },
  filterText: { fontSize: 11, fontWeight: '600', color: colors.textDim },
  filterTextActive: { color: colors.onAccent, fontWeight: '700' },

  list: { padding: spacing.md },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
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
  logName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  logTime: { fontSize: 11.5, color: colors.textDim, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10.5, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  chipText: { fontSize: 10.5, fontWeight: '600', color: colors.textDim },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 12, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
});
