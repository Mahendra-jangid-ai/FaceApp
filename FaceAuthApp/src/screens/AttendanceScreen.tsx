import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows, MONO } from '../theme';
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
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!checkOut) return 'Active Now';
    const mins = Math.round((checkOut - checkIn) / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  const filteredRecords = todayRecords.filter(r => {
    const matchesFilter =
      filterMode === 'all'
        ? true
        : filterMode === 'active'
        ? r.checkOutTime === null
        : r.checkOutTime !== null;
    const matchesSearch =
      searchQuery.trim() === '' ||
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    const isActive = item.checkOutTime === null;
    return (
      <View style={[styles.recordCard, isActive && styles.recordCardActive]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: isActive ? colors.successDim : colors.surfaceAlt, borderColor: isActive ? colors.success : colors.lineBright }]}>
              <Text style={[styles.avatarText, { color: isActive ? colors.success : colors.textDim }]}>
                {item.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.recordNames}>
              <Text style={styles.recordName}>{item.userName}</Text>
              <Text style={styles.recordId}>{item.employeeId}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.successDim : colors.surfaceAlt, borderColor: isActive ? colors.success : colors.lineBright }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.textDim }]} />
            <Text style={[styles.statusText, { color: isActive ? colors.success : colors.textDim }]}>
              {isActive ? 'ON SITE' : formatDuration(item.checkInTime, item.checkOutTime)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeTag}>ENTRY</Text>
            <Text style={styles.timeVal}>{formatTime(item.checkInTime)}</Text>
          </View>
          <View style={styles.timeBlock}>
            <Text style={styles.timeTag}>EXIT</Text>
            <Text style={[styles.timeVal, !item.checkOutTime && { color: colors.textFaint }]}>
              {item.checkOutTime ? formatTime(item.checkOutTime) : '— — : — —'}
            </Text>
          </View>
          {item.withinGeofence ? (
            <View style={styles.geoBadge}>
              <Text style={styles.geoText}>📍 GPS VERIFIED</Text>
            </View>
          ) : (
            <View style={[styles.geoBadge, { backgroundColor: colors.warnDim, borderColor: colors.warn }]}>
              <Text style={[styles.geoText, { color: colors.warn }]}>📍 SITE LOGGED</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Metrics Ribbon */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.accent }]}>{userCount}</Text>
          <Text style={styles.statLbl}>REGISTERED</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.success }]}>{checkedInCount}</Text>
          <Text style={styles.statLbl}>ON SITE NOW</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.cyan }]}>{completedCount}</Text>
          <Text style={styles.statLbl}>COMPLETED</Text>
        </View>
      </View>

      {/* Dual Punch Action Bar */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.checkInBtn]}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.85}>
          <View style={styles.actionIconWrap}>
            <Text style={styles.actionIcon}>✓</Text>
          </View>
          <View>
            <Text style={styles.actionTitle}>PUNCH IN</Text>
            <Text style={styles.actionSub}>Facial Check-in</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.checkOutBtn]}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: colors.dangerDim, borderColor: colors.danger }]}>
            <Text style={[styles.actionIcon, { color: colors.danger }]}>⇥</Text>
          </View>
          <View>
            <Text style={[styles.actionTitle, { color: colors.danger }]}>PUNCH OUT</Text>
            <Text style={styles.actionSub}>Facial Check-out</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs & Search */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.filterTabs}>
          {(['all', 'active', 'completed'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filterMode === tab && styles.tabBtnActive]}
              onPress={() => setFilterMode(tab)}>
              <Text style={[styles.tabText, filterMode === tab && styles.tabTextActive]}>
                {tab === 'all' ? `ALL (${todayRecords.length})` : tab === 'active' ? `ON SITE (${checkedInCount})` : `OUT (${completedCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search worker by name or ID..."
            placeholderTextColor={colors.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Attendance List */}
      {filteredRecords.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyIcon}>📋</Text>
          </View>
          <Text style={styles.emptyText}>No attendance records</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'No records match your search filter.' : 'Use Punch In button above to mark daily entry.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', fontFamily: MONO },
  statLbl: { ...typography.caption, fontSize: 9, marginTop: 2, color: colors.textDim },
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
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    borderWidth: 1.5,
    ...shadows.md,
  },
  checkInBtn: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  checkOutBtn: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  actionIcon: { fontSize: 18, color: colors.success, fontWeight: '800' },
  actionTitle: { ...typography.h3, fontSize: 13, color: colors.success, letterSpacing: 0.8 },
  actionSub: { fontSize: 10, color: colors.textDim, marginTop: 1 },

  searchFilterContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '800',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: { fontSize: 13, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: colors.text,
    fontFamily: MONO,
  },
  clearSearch: { fontSize: 14, color: colors.textDim, padding: spacing.xs },

  list: { padding: spacing.md, paddingTop: spacing.xs },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  recordCardActive: {
    borderColor: colors.success,
    borderWidth: 1.5,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  recordNames: { flex: 1 },
  recordName: { ...typography.body, fontWeight: '700', fontSize: 14.5 },
  recordId: { fontFamily: MONO, fontSize: 11, color: colors.textDim, marginTop: 1 },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBlock: { flex: 1 },
  timeTag: { fontSize: 9, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.8 },
  timeVal: { fontFamily: MONO, fontSize: 12.5, fontWeight: '700', color: colors.text, marginTop: 1 },
  
  geoBadge: {
    backgroundColor: colors.successDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.success,
  },
  geoText: { fontSize: 9.5, fontWeight: '800', color: colors.success, letterSpacing: 0.5 },

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
  emptyText: { ...typography.h3, marginTop: spacing.md },
  emptySubtext: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center', maxWidth: 260 },
});
