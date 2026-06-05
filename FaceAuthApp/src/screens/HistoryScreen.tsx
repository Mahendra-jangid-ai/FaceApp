import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
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
    <View style={styles.logCard}>
      <View
        style={[
          styles.statusBar,
          { backgroundColor: item.authenticated ? colors.success : colors.error },
        ]}
      />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logName}>
            {item.userName || 'Unknown'}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.authenticated
                  ? colors.successLight
                  : colors.errorLight,
              },
            ]}>
            <Text
              style={[
                styles.badgeText,
                { color: item.authenticated ? colors.success : colors.error },
              ]}>
              {item.authenticated ? 'Verified' : 'Failed'}
            </Text>
          </View>
        </View>
        <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        <View style={styles.logDetails}>
          <Text style={styles.logDetail}>
            Liveness: {item.livenessPassed ? 'Passed' : 'Failed'}
          </Text>
          {item.matchScore > 0 && (
            <Text style={styles.logDetail}>
              Match: {(item.matchScore * 100).toFixed(1)}%
            </Text>
          )}
          {item.spoofScore !== undefined && (
            <Text style={styles.logDetail}>
              Spoof: {(item.spoofScore * 100).toFixed(0)}%
            </Text>
          )}
        </View>
        <View style={styles.logDetails}>
          {item.siteName && (
            <Text style={styles.logDetail}>
              Site: {item.siteName}
            </Text>
          )}
          {item.withinGeofence !== undefined && (
            <Text style={[styles.logDetail, { color: item.withinGeofence ? '#00C853' : '#FF9100' }]}>
              {item.withinGeofence ? 'In Geofence' : 'Outside'}
            </Text>
          )}
          <Text style={styles.logDetail}>
            {item.synced ? 'Synced' : 'Pending'}
          </Text>
        </View>
        <View style={styles.logDetails}>
          {item.bioHashVerified !== undefined && (
            <Text style={[styles.logDetail, { color: item.bioHashVerified ? colors.secondary : colors.textLight }]}>
              BioHash: {item.bioHashVerified ? 'OK' : 'N/A'}
            </Text>
          )}
          {item.ppeCompliant !== undefined && (
            <Text style={[styles.logDetail, { color: item.ppeCompliant ? colors.success : colors.warning }]}>
              PPE: {item.ppeCompliant ? 'OK' : 'Fail'}
            </Text>
          )}
          {item.qualityScore !== undefined && item.qualityScore > 0 && (
            <Text style={styles.logDetail}>
              Q: {(item.qualityScore * 100).toFixed(0)}%
            </Text>
          )}
          {item.pipelineLatencyMs !== undefined && item.pipelineLatencyMs > 0 && (
            <Text style={[styles.logDetail, { fontFamily: 'monospace' }]}>
              {item.pipelineLatencyMs}ms
            </Text>
          )}
        </View>
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
            onPress={() => setFilter(f)}>
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}>
              {f === 'all' ? 'All' : f === 'success' ? 'Verified' : 'Failed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'📭'}</Text>
          <Text style={styles.emptyText}>No authentication logs yet</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { ...typography.bodySmall, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.md },
  logCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
  },
  statusBar: { width: 4 },
  logContent: { flex: 1, padding: spacing.md },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logName: { ...typography.body, fontWeight: '600' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  logTime: { ...typography.caption, marginTop: spacing.xs },
  logDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  logDetail: { ...typography.caption },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.bodySmall, marginTop: spacing.md },
});
