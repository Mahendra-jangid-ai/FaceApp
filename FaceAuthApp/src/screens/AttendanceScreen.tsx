import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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
    if (!checkOut) return 'Active';
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
            <View style={[styles.avatar, { backgroundColor: isActive ? colors.successDim : colors.surfaceAlt }]}>
              <Text style={[styles.avatarText, { color: isActive ? colors.success : colors.textDim }]}>
                {item.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.recordNames}>
              <Text style={styles.recordName}>{item.userName}</Text>
              <Text style={styles.recordId}>{item.employeeId}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.successDim : colors.surfaceAlt, borderColor: isActive ? '#BBF7D0' : colors.line }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.success : colors.textDim }]} />
            <Text style={[styles.statusText, { color: isActive ? colors.success : colors.textDim }]}>
              {isActive ? 'On Site' : formatDuration(item.checkInTime, item.checkOutTime)}
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
          {item.withinGeofence && (
            <View style={styles.geoBadge}>
              <Text style={styles.geoText}>📍 GPS Verified</Text>
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
          <Text style={styles.statLbl}>Registered</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.success }]}>{checkedInCount}</Text>
          <Text style={styles.statLbl}>On Site</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.cyan }]}>{completedCount}</Text>
          <Text style={styles.statLbl}>Completed</Text>
        </View>
      </View>

      {/* Dual Punch Action Bar */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.checkInBtn]}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: colors.success }]}>
            <Text style={styles.actionIcon}>✓</Text>
          </View>
          <View>
            <Text style={[styles.actionTitle, { color: colors.success }]}>Check In</Text>
            <Text style={styles.actionSub}>Mark Entry</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.checkOutBtn]}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.85}>
          <View style={[styles.actionIconWrap, { backgroundColor: colors.danger }]}>
            <Text style={styles.actionIcon}>⇥</Text>
          </View>
          <View>
            <Text style={[styles.actionTitle, { color: colors.danger }]}>Check Out</Text>
            <Text style={styles.actionSub}>Mark Exit</Text>
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
                {tab === 'all' ? `All (${todayRecords.length})` : tab === 'active' ? `On Site (${checkedInCount})` : `Out (${completedCount})`}
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
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No attendance records today</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'No records match your search query.' : 'Use the Check In button above to mark attendance.'}
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
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', fontFamily: MONO },
  statLbl: { fontSize: 11, fontWeight: '600', color: colors.textDim, marginTop: 2 },
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
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    borderWidth: 1,
    ...shadows.sm,
  },
  checkInBtn: {
    borderColor: '#86EFAC',
    backgroundColor: colors.successDim,
  },
  checkOutBtn: {
    borderColor: '#FECACA',
    backgroundColor: colors.dangerDim,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionSub: { fontSize: 11, color: colors.textDim, marginTop: 1 },

  searchFilterContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDim,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: { fontSize: 13, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13.5,
    color: colors.text,
  },
  clearSearch: { fontSize: 14, color: colors.textDim, padding: spacing.xs },

  list: { padding: spacing.md, paddingTop: spacing.xs },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.sm,
  },
  recordCardActive: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  recordNames: { flex: 1 },
  recordName: { fontSize: 14, fontWeight: '700', color: colors.text },
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
  statusText: { fontSize: 10.5, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBlock: { flex: 1 },
  timeTag: { fontSize: 9.5, fontWeight: '700', color: colors.textFaint, letterSpacing: 0.5 },
  timeVal: { fontFamily: MONO, fontSize: 12.5, fontWeight: '600', color: colors.text, marginTop: 1 },
  
  geoBadge: {
    backgroundColor: colors.successDim,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  geoText: { fontSize: 10, fontWeight: '600', color: colors.success },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: { fontSize: 36, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: '700', color: colors.text },
  emptySubtext: { fontSize: 12, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center', maxWidth: 260 },
});
