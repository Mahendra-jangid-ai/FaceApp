import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { getAttendanceRecords } from '../services/database';
import type { RootStackParamList, AttendanceRecord } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

interface DayData {
  date: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  attendanceCount: number;
  totalHours: number;
}

export default function CalendarScreen({ navigation, route }: Props) {
  const filterUserId = route.params?.userId;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [dayRecords, setDayRecords] = useState<AttendanceRecord[]>([]);
  const [monthStats, setMonthStats] = useState({ days: 0, hours: 0, workers: 0 });

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [currentDate]),
  );

  const loadRecords = async () => {
    let records = await getAttendanceRecords();
    if (filterUserId) {
      records = records.filter(r => r.userId === filterUserId);
    }
    setAllRecords(records);

    // Month stats
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getTime();
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).getTime();
    const monthRecords = records.filter(r => r.checkInTime >= monthStart && r.checkInTime <= monthEnd);

    const uniqueDays = new Set(monthRecords.map(r => new Date(r.checkInTime).getDate()));
    const uniqueWorkers = new Set(monthRecords.map(r => r.userId));
    let totalHours = 0;
    for (const r of monthRecords) {
      if (r.checkOutTime) {
        totalHours += (r.checkOutTime - r.checkInTime) / 3600000;
      }
    }

    setMonthStats({
      days: uniqueDays.size,
      hours: Math.round(totalHours),
      workers: uniqueWorkers.size,
    });
  };

  const getCalendarDays = (): DayData[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const days: DayData[] = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: prevMonthDays - i, isCurrentMonth: false, isToday: false, attendanceCount: 0, totalHours: 0 });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = new Date(year, month, d).getTime();
      const dayEnd = new Date(year, month, d, 23, 59, 59).getTime();
      const dayAtt = allRecords.filter(r => r.checkInTime >= dayStart && r.checkInTime <= dayEnd);
      let hrs = 0;
      for (const r of dayAtt) {
        if (r.checkOutTime) hrs += (r.checkOutTime - r.checkInTime) / 3600000;
      }

      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
        attendanceCount: dayAtt.length,
        totalHours: Math.round(hrs * 10) / 10,
      });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, isCurrentMonth: false, isToday: false, attendanceCount: 0, totalHours: 0 });
    }

    return days;
  };

  const selectDay = (day: DayData) => {
    if (!day.isCurrentMonth) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dayStart = new Date(year, month, day.date).getTime();
    const dayEnd = new Date(year, month, day.date, 23, 59, 59).getTime();
    const records = allRecords.filter(r => r.checkInTime >= dayStart && r.checkInTime <= dayEnd);
    setSelectedDate(day.date);
    setDayRecords(records);
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const days = getCalendarDays();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Month stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statNum}>{monthStats.days}</Text><Text style={styles.statLbl}>Active Days</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{monthStats.hours}</Text><Text style={styles.statLbl}>Total Hours</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{monthStats.workers}</Text><Text style={styles.statLbl}>Workers</Text></View>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {days.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.dayCell,
              !day.isCurrentMonth && styles.dayCellInactive,
              day.isToday && styles.dayCellToday,
              selectedDate === day.date && day.isCurrentMonth && styles.dayCellSelected,
            ]}
            onPress={() => selectDay(day)}
            disabled={!day.isCurrentMonth}>
            <Text style={[
              styles.dayNum,
              !day.isCurrentMonth && styles.dayNumInactive,
              day.isToday && styles.dayNumToday,
              selectedDate === day.date && day.isCurrentMonth && styles.dayNumSelected,
            ]}>
              {day.date}
            </Text>
            {day.attendanceCount > 0 && day.isCurrentMonth && (
              <View style={[
                styles.dayDot,
                day.attendanceCount > 3 ? styles.dayDotHigh : styles.dayDotNormal,
              ]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected day records */}
      {selectedDate !== null && (
        <View style={styles.recordsSection}>
          <Text style={styles.recordsTitle}>
            {selectedDate} {MONTHS[currentDate.getMonth()]} — {dayRecords.length} record{dayRecords.length !== 1 ? 's' : ''}
          </Text>
          {dayRecords.length === 0 ? (
            <Text style={styles.noRecords}>No attendance recorded</Text>
          ) : (
            dayRecords.map(r => (
              <View key={r.id} style={styles.recordCard}>
                <View style={styles.recordAvatar}>
                  <Text style={styles.recordAvatarText}>{r.userName.charAt(0)}</Text>
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{r.userName}</Text>
                  <Text style={styles.recordTime}>
                    In: {formatTime(r.checkInTime)}
                    {r.checkOutTime ? ` — Out: ${formatTime(r.checkOutTime)}` : ' (active)'}
                  </Text>
                </View>
                {r.withinGeofence && <Text style={styles.geoTag}>GPS</Text>}
              </View>
            ))
          )}
        </View>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const CELL_SIZE = '14.28%' as any;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  navBtn: { padding: spacing.sm },
  navText: { fontSize: 22, fontWeight: '600', color: colors.primary },
  monthTitle: { ...typography.h3 },
  statsRow: {
    flexDirection: 'row', padding: spacing.md, gap: spacing.sm,
  },
  stat: {
    flex: 1, backgroundColor: colors.surface, padding: spacing.sm,
    borderRadius: borderRadius.md, alignItems: 'center', ...shadows.sm,
  },
  statNum: { fontSize: 22, fontWeight: '700', color: colors.primary },
  statLbl: { ...typography.caption, marginTop: 1 },
  weekRow: {
    flexDirection: 'row', paddingHorizontal: spacing.sm, paddingBottom: spacing.xs,
  },
  weekDay: {
    width: CELL_SIZE, textAlign: 'center', ...typography.caption,
    fontWeight: '600', textTransform: 'uppercase',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm },
  dayCell: {
    width: CELL_SIZE, aspectRatio: 1, alignItems: 'center',
    justifyContent: 'center', borderRadius: borderRadius.sm, margin: 1,
  },
  dayCellInactive: { opacity: 0.3 },
  dayCellToday: { backgroundColor: colors.primaryLight },
  dayCellSelected: { backgroundColor: colors.primary },
  dayNum: { fontSize: 14, fontWeight: '500', color: colors.text },
  dayNumInactive: { color: colors.textLight },
  dayNumToday: { color: colors.primary, fontWeight: '700' },
  dayNumSelected: { color: colors.white, fontWeight: '700' },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  dayDotNormal: { backgroundColor: colors.success },
  dayDotHigh: { backgroundColor: colors.primary },
  recordsSection: { padding: spacing.md },
  recordsTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  noRecords: { ...typography.bodySmall, textAlign: 'center', padding: spacing.lg },
  recordCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, ...shadows.sm,
  },
  recordAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center',
    justifyContent: 'center', marginRight: spacing.md,
  },
  recordAvatarText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  recordInfo: { flex: 1 },
  recordName: { ...typography.body, fontWeight: '600', fontSize: 14 },
  recordTime: { ...typography.caption, marginTop: 1 },
  geoTag: { fontSize: 10, fontWeight: '700', color: colors.success },
});
