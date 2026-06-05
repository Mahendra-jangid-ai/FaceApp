import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import {
  getEnrolledUsers,
  getTodayAttendance,
} from '../services/database';
import type { RootStackParamList, AttendanceRecord } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

export default function AttendanceScreen({ navigation }: Props) {
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const [records, users] = await Promise.all([
      getTodayAttendance(),
      getEnrolledUsers(),
    ]);
    setTodayRecords(records);
    setUserCount(users.length);
  };

  const checkedInCount = todayRecords.filter(r => r.checkOutTime === null).length;
  const completedCount = todayRecords.filter(r => r.checkOutTime !== null).length;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (checkIn: number, checkOut: number | null) => {
    if (!checkOut) return 'Active';
    const mins = Math.round((checkOut - checkIn) / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  const handleQuickAuth = async () => {
    setLoading(true);
    setLastAction('');

    try {
      navigation.navigate('Authenticate');
      setLastAction('Authenticate to mark attendance');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Attendance failed');
    }
    setLoading(false);
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    const isActive = item.checkOutTime === null;
    return (
      <View style={[styles.recordCard, isActive && styles.recordCardActive]}>
        <View style={styles.recordLeft}>
          <View style={[styles.avatar, isActive && styles.avatarActive]}>
            <Text style={styles.avatarText}>
              {item.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.recordCenter}>
          <Text style={styles.recordName}>{item.userName}</Text>
          <Text style={styles.recordId}>{item.employeeId}</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>In: {formatTime(item.checkInTime)}</Text>
            {item.checkOutTime && (
              <Text style={styles.timeLabel}>
                Out: {formatTime(item.checkOutTime)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.recordRight}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isActive
                  ? colors.successLight
                  : colors.primaryLight,
              },
            ]}>
            <Text
              style={[
                styles.statusText,
                { color: isActive ? colors.success : colors.primary },
              ]}>
              {isActive ? 'On Site' : formatDuration(item.checkInTime, item.checkOutTime)}
            </Text>
          </View>
          {item.withinGeofence && (
            <Text style={styles.geoTag}>GPS Verified</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{userCount}</Text>
          <Text style={styles.statLbl}>Enrolled</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.success }]}>{checkedInCount}</Text>
          <Text style={styles.statLbl}>On Site</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.secondary }]}>{completedCount}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
          onPress={() => navigation.navigate('Authenticate')}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.actionIcon}>{'>'}</Text>
              <Text style={styles.actionText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.error }]}
          onPress={() => navigation.navigate('Authenticate')}
          disabled={loading}>
          <Text style={styles.actionIcon}>{'<'}</Text>
          <Text style={styles.actionText}>Check Out</Text>
        </TouchableOpacity>
      </View>

      {lastAction !== '' && (
        <View style={styles.lastActionBar}>
          <Text style={styles.lastActionText}>{lastAction}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Today's Attendance ({todayRecords.length})
      </Text>

      {todayRecords.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{'📋'}</Text>
          <Text style={styles.emptyText}>No attendance records today</Text>
          <Text style={styles.emptySubtext}>
            Use Check In to start marking attendance
          </Text>
        </View>
      ) : (
        <FlatList
          data={todayRecords}
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '700' },
  statLbl: { ...typography.caption, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.line, marginVertical: spacing.xs },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  actionIcon: { fontSize: 20, color: colors.white, fontWeight: '700' },
  actionText: { ...typography.button, color: colors.white, fontSize: 16 },
  lastActionBar: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  lastActionText: { ...typography.bodySmall, color: colors.success },
  sectionTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: { padding: spacing.md, paddingTop: 0 },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.line,
  },
  recordCardActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  recordLeft: { marginRight: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: { backgroundColor: colors.successLight },
  avatarText: { fontSize: 18, fontWeight: '600', color: colors.primary },
  recordCenter: { flex: 1 },
  recordName: { ...typography.body, fontWeight: '600' },
  recordId: { ...typography.caption, marginTop: 1 },
  timeRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  timeLabel: { ...typography.caption, fontWeight: '500' },
  recordRight: { alignItems: 'flex-end', justifyContent: 'center' },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  geoTag: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.body, fontWeight: '600', marginTop: spacing.md },
  emptySubtext: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center' },
});
