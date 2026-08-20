import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows, fonts, MONO } from '../theme';
import {
  getEnrolledUsers,
  getAuthLogs,
  getTodayAttendance,
} from '../services/database';
import { isOnline } from '../services/syncService';
import { getSession } from '../auth/sessionStore';
import {
  IconAttendance,
  IconSafety,
  IconLeave,
  IconHolidays,
  IconDashboard,
  IconProfile,
  IconMore,
  IconFaceScan,
  IconBell,
  IconLock,
  IconArrowIn,
  IconArrowOut,
  IconClock,
} from '../components/ModernIcons';
import type { RootStackParamList, AttendanceRecord, AuthLog, EnrolledUser } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type MainTab = 'dashboard' | 'attendance' | 'profile' | 'more';
type AttendanceSubTab = 'stats' | 'daily' | 'request';
type ProfileSubTab = 'info' | 'emergency' | 'kyc' | 'identity';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [attSubTab, setAttSubTab] = useState<AttendanceSubTab>('stats');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('info');

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  // Selected Day in Attendance Timeline
  const [selectedDay, setSelectedDay] = useState<number>(20);

  // Database Data
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [onSiteCount, setOnSiteCount] = useState(0);
  const [online, setOnline] = useState(false);

  // Live timer effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${mins}:${secs}`);

      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      setCurrentDateStr(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    const [users, logs, attendance, netStatus] = await Promise.all([
      getEnrolledUsers(),
      getAuthLogs(),
      getTodayAttendance(),
      isOnline(),
    ]);

    setEnrolledUsers(users);
    setAttendanceRecords(attendance);
    setAuthLogs(logs);
    setOnSiteCount(attendance.filter(a => a.checkOutTime === null).length);
    setOnline(netStatus);
  };

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, []),
  );

  const handleAdminPress = () => {
    const session = getSession();
    if (session && session.role === 'admin') {
      navigation.navigate('AdminDashboard');
    } else {
      navigation.navigate('AdminLogin');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  /* ─────────────────────────────────────────────────────────────────
   * TAB 1: USER DASHBOARD
   * ───────────────────────────────────────────────────────────────── */
  const renderDashboardTab = () => (
    <ScrollView style={s.tabScroll} showsVerticalScrollIndicator={false}>
      {/* 1. Quick Action Circular Icons Row */}
      <View style={s.quickActionsRow}>
        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.75}>
          <View style={[s.quickActionIconWrap, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <IconAttendance size={22} color="#2563EB" />
          </View>
          <Text style={s.quickActionLabel}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => navigation.navigate('PPECheck')}
          activeOpacity={0.75}>
          <View style={[s.quickActionIconWrap, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <IconSafety size={22} color="#16A34A" />
          </View>
          <Text style={s.quickActionLabel}>PPE Safety</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => setActiveTab('attendance')}
          activeOpacity={0.75}>
          <View style={[s.quickActionIconWrap, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <IconLeave size={22} color="#EA580C" />
          </View>
          <Text style={s.quickActionLabel}>Leave</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => navigation.navigate('Calendar')}
          activeOpacity={0.75}>
          <View style={[s.quickActionIconWrap, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
            <IconHolidays size={22} color="#9333EA" />
          </View>
          <Text style={s.quickActionLabel}>Holidays</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Primary Hero Live Attendance Card */}
      <View style={s.heroCard}>
        <View style={s.heroTopRow}>
          {/* Left: Progress Circle & Digital Clock */}
          <View style={s.heroTimeSection}>
            <View style={s.ringAndDate}>
              <View style={s.progressRing}>
                <Text style={s.progressRingText}>100%</Text>
              </View>
              <Text style={s.heroDateText}>{currentDateStr || 'THU, AUG 20, 2026'}</Text>
            </View>
            <Text style={s.heroClockText}>{currentTime || '07:46:46'}</Text>
          </View>

          {/* Right: Worker Avatar */}
          <View style={s.heroAvatarWrap}>
            <Image
              source={require('../assets/faceauth_logo.png')}
              style={s.heroAvatarImg}
              resizeMode="cover"
            />
            <View style={s.heroAvatarOnlineDot} />
          </View>
        </View>

        {/* Hero Card Bottom Shift Ribbon */}
        <View style={s.heroBottomRibbon}>
          <View style={s.ribbonCol}>
            <Text style={s.ribbonLabel}>Check In</Text>
            <View style={s.ribbonValueRow}>
              <IconArrowIn size={14} color="#4ADE80" />
              <Text style={s.ribbonValue}>10:14 AM</Text>
            </View>
          </View>

          <View style={s.ribbonDivider} />

          <View style={s.ribbonCol}>
            <Text style={s.ribbonLabel}>Check Out</Text>
            <View style={s.ribbonValueRow}>
              <IconArrowOut size={14} color="#F87171" />
              <Text style={s.ribbonValue}>06:31 PM</Text>
            </View>
          </View>

          <View style={s.ribbonDivider} />

          <View style={s.ribbonCol}>
            <Text style={s.ribbonLabel}>Short Hours</Text>
            <View style={s.ribbonValueRow}>
              <IconClock size={12} color="#94A3B8" />
              <Text style={s.ribbonValue}>00:00</Text>
            </View>
          </View>
        </View>

        {/* Scan Punch CTA Button inside Hero */}
        <TouchableOpacity
          style={s.heroPunchBtn}
          onPress={() => navigation.navigate('Authenticate')}
          activeOpacity={0.88}>
          <IconFaceScan size={18} color="#FFFFFF" />
          <Text style={s.heroPunchBtnText}>Scan Face to Punch In / Out</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Monthly Overview Section */}
      <View style={s.overviewHeader}>
        <View style={s.overviewTitleRow}>
          <IconAttendance size={18} color="#0F172A" />
          <Text style={s.overviewTitle}>Overview</Text>
        </View>
        <Text style={s.overviewMonth}>August 2026</Text>
      </View>

      {/* 2x2 Clean Stat Grid */}
      <View style={s.overviewGrid}>
        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>14</Text>
          <View style={[s.overviewPill, { backgroundColor: '#ECFDF5' }]}>
            <View style={[s.pillDot, { backgroundColor: '#10B981' }]} />
            <Text style={[s.pillLabel, { color: '#059669' }]}>Presence</Text>
          </View>
        </View>

        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>00</Text>
          <View style={[s.overviewPill, { backgroundColor: '#FEF2F2' }]}>
            <View style={[s.pillDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[s.pillLabel, { color: '#DC2626' }]}>Absence</Text>
          </View>
        </View>

        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>00</Text>
          <View style={[s.overviewPill, { backgroundColor: '#F5F3FF' }]}>
            <View style={[s.pillDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[s.pillLabel, { color: '#7C3AED' }]}>Leave</Text>
          </View>
        </View>

        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>10 / 10</Text>
          <View style={[s.overviewPill, { backgroundColor: '#FFFBEB' }]}>
            <View style={[s.pillDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[s.pillLabel, { color: '#D97706' }]}>Allowance</Text>
          </View>
        </View>
      </View>

      {/* 4. On-Site Team & Activity Section */}
      <View style={s.teamSectionHeader}>
        <Text style={s.teamSectionTitle}>Site Workers Active</Text>
        <Text style={s.teamSectionSub}>{onSiteCount} Checked In</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.teamScroll}>
        {[
          { name: 'Mahendra Kumar', role: 'Engineer', status: 'On Site' },
          { name: 'Himanshu Solanki', role: 'Safety Sup.', status: 'Verified' },
          { name: 'Pooja Verma', role: 'Field Tech', status: 'On Site' },
          { name: 'Rajesh Sharma', role: 'Operator', status: 'Checked Out' },
        ].map((member, i) => (
          <View key={i} style={s.memberCard}>
            <View style={s.memberAvatarWrap}>
              <Text style={s.memberAvatarText}>{member.name.charAt(0)}</Text>
              <View style={[s.memberDot, { backgroundColor: member.status === 'On Site' ? '#10B981' : '#0284C7' }]} />
            </View>
            <Text style={s.memberName} numberOfLines={1}>{member.name}</Text>
            <Text style={s.memberRole}>{member.role}</Text>
            <View style={[s.memberStatusBadge, { backgroundColor: member.status === 'On Site' ? '#ECFDF5' : '#F0F9FF' }]}>
              <Text style={[s.memberStatusText, { color: member.status === 'On Site' ? '#059669' : '#0284C7' }]}>
                {member.status}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ height: 110 }} />
    </ScrollView>
  );

  /* ─────────────────────────────────────────────────────────────────
   * TAB 2: ATTENDANCE, STATS & DAILY TIMELINE
   * ───────────────────────────────────────────────────────────────── */
  const renderAttendanceTab = () => (
    <View style={s.tabContainer}>
      {/* Sub Tab Switcher: Stats | Daily Stats | Request */}
      <View style={s.subTabBar}>
        <TouchableOpacity
          style={[s.subTabItem, attSubTab === 'stats' && s.subTabItemActive]}
          onPress={() => setAttSubTab('stats')}
          activeOpacity={0.75}>
          <Text style={[s.subTabText, attSubTab === 'stats' && s.subTabTextActive]}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.subTabItem, attSubTab === 'daily' && s.subTabItemActive]}
          onPress={() => setAttSubTab('daily')}
          activeOpacity={0.75}>
          <Text style={[s.subTabText, attSubTab === 'daily' && s.subTabTextActive]}>Daily Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.subTabItem, attSubTab === 'request' && s.subTabItemActive]}
          onPress={() => setAttSubTab('request')}
          activeOpacity={0.75}>
          <Text style={[s.subTabText, attSubTab === 'request' && s.subTabTextActive]}>Request</Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tab 1: Stats Donut & Metric Cards */}
      {attSubTab === 'stats' && (
        <ScrollView style={s.subTabScroll} showsVerticalScrollIndicator={false}>
          {/* Big Gauge Ring Card */}
          <View style={s.donutCard}>
            <View style={s.donutRingWrap}>
              <View style={s.donutRingOuter}>
                <View style={s.donutRingInner}>
                  <Text style={s.donutMainNum}>14</Text>
                  <View style={s.donutPresentPill}>
                    <View style={[s.pillDot, { backgroundColor: '#10B981' }]} />
                    <Text style={s.donutPresentText}>Present this month</Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={s.donutPrevText}>0 Days Present - Previous Month</Text>
          </View>

          {/* 8-Grid Metric Status Cards */}
          <View style={s.eightGrid}>
            {[
              { val: '00', label: 'Absent', color: '#EF4444', bg: '#FEF2F2' },
              { val: '00', label: 'Leave', color: '#8B5CF6', bg: '#F5F3FF' },
              { val: '10', label: 'Holidays', color: '#F59E0B', bg: '#FFFBEB' },
              { val: '00', label: 'Half Day', color: '#EC4899', bg: '#FDF2F8' },
              { val: '14', label: 'On Time', color: '#10B981', bg: '#ECFDF5' },
              { val: '00', label: 'Late', color: '#F97316', bg: '#FFF7ED' },
              { val: '00:00', label: 'Extra Hrs', color: '#06B6D4', bg: '#ECFEFF' },
              { val: '00:00', label: 'Short Hrs', color: '#6B7280', bg: '#F9FAFB' },
            ].map((item, idx) => (
              <View key={idx} style={[s.eightGridCard, { backgroundColor: item.bg }]}>
                <Text style={s.eightGridVal}>{item.val}</Text>
                <View style={s.eightGridPill}>
                  <View style={[s.pillDot, { backgroundColor: item.color }]} />
                  <Text style={[s.eightGridLabel, { color: item.color }]}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Sub Tab 2: Daily Stats & Horizontal Date Picker */}
      {attSubTab === 'daily' && (
        <ScrollView style={s.subTabScroll} showsVerticalScrollIndicator={false}>
          {/* Horizontal Calendar Date Ribbon */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateRibbon}>
            {[
              { day: 'S', date: 15 },
              { day: 'S', date: 16 },
              { day: 'M', date: 17 },
              { day: 'T', date: 18 },
              { day: 'W', date: 19 },
              { day: 'T', date: 20 },
              { day: 'F', date: 21 },
              { day: 'S', date: 22 },
            ].map((d, i) => {
              const isSelected = selectedDay === d.date;
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.datePill, isSelected && s.datePillActive]}
                  onPress={() => setSelectedDay(d.date)}
                  activeOpacity={0.8}>
                  <Text style={[s.datePillDay, isSelected && s.datePillDayActive]}>{d.day}</Text>
                  <Text style={[s.datePillDate, isSelected && s.datePillDateActive]}>{d.date}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Day Summary Card */}
          <View style={s.daySummaryCard}>
            <Text style={s.daySummaryDate}>THU, AUG {selectedDay}, 2026</Text>
            <View style={s.dayWorkingRow}>
              <View>
                <Text style={s.workingLabel}>Total Working</Text>
                <Text style={s.workingHours}>{currentTime || '07:46:46'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.workingLabel}>Short Hours</Text>
                <Text style={s.shortHoursText}>00:00:00</Text>
              </View>
            </View>

            <View style={s.shiftPillRow}>
              <View style={s.shiftPillAccent} />
              <Text style={s.shiftPillText}>Day Shift : 10:30 AM to 06:30 PM</Text>
            </View>

            {/* Stepper Timeline */}
            <View style={s.timelineContainer}>
              {/* Check In Step */}
              <View style={s.timelineStep}>
                <View style={s.timelineLeft}>
                  <View style={s.stepCircleActive}>
                    <Text style={s.stepCircleCheck}>✓</Text>
                  </View>
                  <View style={s.timelineLine} />
                </View>
                <View style={s.timelineCardIn}>
                  <View style={s.timelineCardLeft}>
                    <IconArrowIn size={16} color="#16A34A" />
                    <Text style={s.timelineActionTitle}>Check In</Text>
                    <Text style={s.timelineTime}>10:14 AM</Text>
                  </View>
                  <View style={s.onTimeBadge}>
                    <Text style={s.onTimeBadgeText}>On Time</Text>
                  </View>
                </View>
              </View>

              {/* Check Out Step */}
              <View style={s.timelineStep}>
                <View style={s.timelineLeft}>
                  <View style={s.stepCircleActive}>
                    <Text style={s.stepCircleCheck}>✓</Text>
                  </View>
                </View>
                <View style={s.timelineCardOut}>
                  <View style={s.timelineCardLeft}>
                    <IconArrowOut size={16} color="#DC2626" />
                    <Text style={s.timelineActionTitle}>Check Out</Text>
                    <Text style={s.timelineTime}>06:31 PM</Text>
                  </View>
                  <View style={s.goodJobBadge}>
                    <Text style={s.goodJobBadgeText}>Good Job</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Sub Tab 3: Punch Correction Requests */}
      {attSubTab === 'request' && (
        <ScrollView style={s.subTabScroll} showsVerticalScrollIndicator={false}>
          <View style={s.requestCard}>
            <View style={s.requestTopRow}>
              <Text style={s.requestTitle}>Correction</Text>
              <Text style={s.requestDate}>Aug 4, 2026</Text>
            </View>
            <Text style={s.requestDesc}>Forgot to punch in at 1:48 PM.</Text>
            <View style={s.requestMetaRow}>
              <Text style={s.requestApplied}>Applied date : Aug 5, 2026</Text>
              <Text style={s.requestTx}>Day Transactions</Text>
            </View>
            <View style={s.requestBottomRow}>
              <Text style={s.adminNoteText}>› Admin Note</Text>
              <View style={s.approvedBadge}>
                <Text style={s.approvedBadgeText}>✓ Approved</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.newRequestBtn} activeOpacity={0.85}>
            <Text style={s.newRequestBtnText}>+ Submit New Correction Request</Text>
          </TouchableOpacity>

          <View style={{ height: 110 }} />
        </ScrollView>
      )}
    </View>
  );

  /* ─────────────────────────────────────────────────────────────────
   * TAB 3: USER PROFILE SCREEN
   * ───────────────────────────────────────────────────────────────── */
  const renderProfileTab = () => (
    <ScrollView style={s.tabScroll} showsVerticalScrollIndicator={false}>
      {/* Profile Card Header */}
      <View style={s.profileHeaderCard}>
        <View style={s.profileAvatarWrap}>
          <Image
            source={require('../assets/faceauth_logo.png')}
            style={s.profileAvatarImg}
            resizeMode="cover"
          />
          <View style={s.profileVerifiedBadge}>
            <Text style={s.profileVerifiedCheck}>✓</Text>
          </View>
        </View>

        <Text style={s.profileName}>Mahendra Kumar</Text>
        <Text style={s.profileRole}>Field Engineer & Biometrics</Text>
        <View style={s.profileIdBadge}>
          <Text style={s.profileIdText}>EMP-1114</Text>
        </View>

        {/* 2-Column Summary Pill Cards */}
        <View style={s.profileInfoRow}>
          <View style={s.profileInfoBox}>
            <IconSafety size={20} color="#2563EB" />
            <View>
              <Text style={s.profileInfoLabel}>Department</Text>
              <Text style={s.profileInfoVal}>Operations</Text>
            </View>
          </View>

          <View style={s.profileInfoBox}>
            <IconAttendance size={20} color="#EA580C" />
            <View>
              <Text style={s.profileInfoLabel}>Employed Since</Text>
              <Text style={s.profileInfoVal}>Oct 1, 2025</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sub Tabs: Information | Emergency | KYC | Identity */}
      <View style={s.profileSubTabBar}>
        {(['info', 'emergency', 'kyc', 'identity'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.profileSubTabItem, profileSubTab === tab && s.profileSubTabItemActive]}
            onPress={() => setProfileSubTab(tab)}
            activeOpacity={0.8}>
            <Text style={[s.profileSubTabText, profileSubTab === tab && s.profileSubTabTextActive]}>
              {tab === 'info' ? 'Information' : tab === 'emergency' ? 'Emergency' : tab === 'kyc' ? 'KYC' : 'Identity'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Personal Information Form Fields */}
      <View style={s.profileFormSection}>
        <Text style={s.profileFormTitle}>Personal Information</Text>

        {[
          { label: 'Name', value: 'Mahendra Kumar' },
          { label: "Father's Name", value: 'Dhima Ram' },
          { label: 'Date of Birth', value: '11/05/2005', label2: 'Gender', value2: 'Male' },
          { label: 'Marital Status', value: 'Single', label2: 'Blood Group', value2: 'O+' },
          { label: 'Personal Number', value: '8905187368', label2: 'Alternate Number', value2: '—' },
          { label: 'Personal Email', value: 'mahendrakumar24325@gmail.com' },
        ].map((field, idx) => (
          <View key={idx} style={s.fieldWrapper}>
            {field.label2 ? (
              <View style={s.dualFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{field.label}</Text>
                  <View style={s.fieldCard}>
                    <Text style={s.fieldValue}>{field.value}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>{field.label2}</Text>
                  <View style={s.fieldCard}>
                    <Text style={s.fieldValue}>{field.value2}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <View style={s.fieldCard}>
                  <Text style={s.fieldValue}>{field.value}</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );

  /* ─────────────────────────────────────────────────────────────────
   * TAB 4: MORE & SETTINGS
   * ───────────────────────────────────────────────────────────────── */
  const renderMoreTab = () => (
    <ScrollView style={s.tabScroll} showsVerticalScrollIndicator={false}>
      {/* Admin Portal Header Banner */}
      <TouchableOpacity style={s.adminBanner} onPress={handleAdminPress} activeOpacity={0.88}>
        <View style={s.adminBannerIconWrap}>
          <IconLock size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.adminBannerTitle}>Admin & Supervisor Portal</Text>
          <Text style={s.adminBannerSub}>Enrol workers, site analytics, geofencing & server sync</Text>
        </View>
        <View style={s.adminBannerArrow}>
          <Text style={s.adminBannerArrowText}>→</Text>
        </View>
      </TouchableOpacity>

      <Text style={s.moreSectionTitle}>App & System Settings</Text>

      {/* Menu Options */}
      <View style={s.moreMenuCard}>
        {[
          { label: 'System Settings & Data Sync', screen: 'Settings' },
          { label: 'Worker Directory', screen: 'WorkerList' },
          { label: 'Analytics Dashboard', screen: 'Dashboard' },
          { label: 'Work Calendar', screen: 'Calendar' },
          { label: 'Biometric Audit Logs', screen: 'History' },
        ].map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[s.moreMenuItem, idx > 0 && s.moreMenuBorder]}
            onPress={() => navigation.navigate(item.screen as any)}
            activeOpacity={0.75}>
            <View style={s.moreMenuDot} />
            <Text style={s.moreMenuLabel}>{item.label}</Text>
            <Text style={s.moreMenuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Modern Clean App Header */}
      <View style={s.appHeader}>
        <View style={s.headerLeft}>
          <Image
            source={require('../assets/faceauth_logo.png')}
            style={s.headerLogoImg}
            resizeMode="contain"
          />
          <View>
            <Text style={s.headerGreeting}>{getGreeting()}</Text>
            <Text style={s.headerUserName}>Mahendra Kumar</Text>
          </View>
        </View>

        <View style={s.headerRight}>
          {/* Notification Bell Icon */}
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.75}>
            <IconBell size={18} color="#0F172A" />
            <View style={s.bellDot} />
          </TouchableOpacity>

          {/* Admin Shortcut */}
          <TouchableOpacity
            style={s.adminPillBtn}
            onPress={handleAdminPress}
            activeOpacity={0.8}>
            <IconLock size={12} color="#EA580C" />
            <Text style={s.adminPillText}>Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Body */}
      <View style={s.mainBody}>
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'attendance' && renderAttendanceTab()}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'more' && renderMoreTab()}
      </View>

      {/* Modern Persistent Bottom Navigation Tab Bar */}
      <View style={s.bottomTabBar}>
        <TouchableOpacity
          style={[s.tabItem, activeTab === 'dashboard' && s.tabItemActive]}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.8}>
          <IconDashboard size={20} color={activeTab === 'dashboard' ? '#2563EB' : '#94A3B8'} />
          <Text style={[s.tabLabel, activeTab === 'dashboard' && s.tabLabelActive]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'attendance' && s.tabItemActive]}
          onPress={() => setActiveTab('attendance')}
          activeOpacity={0.8}>
          <IconAttendance size={20} color={activeTab === 'attendance' ? '#2563EB' : '#94A3B8'} />
          <Text style={[s.tabLabel, activeTab === 'attendance' && s.tabLabelActive]}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'profile' && s.tabItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}>
          <IconProfile size={20} color={activeTab === 'profile' ? '#2563EB' : '#94A3B8'} />
          <Text style={[s.tabLabel, activeTab === 'profile' && s.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'more' && s.tabItemActive]}
          onPress={() => setActiveTab('more')}
          activeOpacity={0.8}>
          <IconMore size={20} color={activeTab === 'more' ? '#2563EB' : '#94A3B8'} />
          <Text style={[s.tabLabel, activeTab === 'more' && s.tabLabelActive]}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* App Top Header */
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerLogoImg: { width: 44, height: 44, borderRadius: 22 },
  headerGreeting: { fontFamily: fonts.medium, fontSize: 12, color: '#64748B' },
  headerUserName: { fontFamily: fonts.bold, fontSize: 18, color: '#0F172A', letterSpacing: -0.3, marginTop: -2 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EA580C',
  },
  adminPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  adminPillText: { fontFamily: fonts.semiBold, fontSize: 12, color: '#EA580C' },

  /* Body */
  mainBody: { flex: 1 },
  tabScroll: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  tabContainer: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  /* 1. Quick Actions Row */
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  quickActionItem: { alignItems: 'center', flex: 1 },
  quickActionIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...shadows.sm,
  },
  quickActionLabel: { fontFamily: fonts.medium, fontSize: 11.5, color: '#475569', marginTop: 6 },

  /* 2. Hero Live Attendance Card */
  heroCard: {
    backgroundColor: '#1E40AF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTimeSection: { flex: 1 },
  ringAndDate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#60A5FA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressRingText: { fontFamily: fonts.bold, color: '#FFFFFF', fontSize: 10 },
  heroDateText: { fontFamily: fonts.semiBold, color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, letterSpacing: 0.3 },
  heroClockText: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
    fontSize: 30,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  heroAvatarWrap: { position: 'relative' },
  heroAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroAvatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  heroBottomRibbon: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 58, 138, 0.65)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ribbonCol: { alignItems: 'center', flex: 1 },
  ribbonLabel: { fontFamily: fonts.regular, color: 'rgba(255, 255, 255, 0.75)', fontSize: 11 },
  ribbonValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ribbonValue: { fontFamily: fonts.semiBold, color: '#FFFFFF', fontSize: 12.5 },
  ribbonDivider: { width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)' },

  heroPunchBtn: {
    backgroundColor: '#EA580C',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    ...shadows.md,
  },
  heroPunchBtnText: { fontFamily: fonts.bold, color: '#FFFFFF', fontSize: 14, letterSpacing: 0.3 },

  /* 3. Overview 2x2 Grid */
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overviewTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#0F172A' },
  overviewMonth: { fontFamily: fonts.semiBold, fontSize: 13, color: '#2563EB' },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  overviewCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  overviewVal: { fontFamily: fonts.bold, fontSize: 24, color: '#0F172A' },
  overviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xs + 2,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: { fontFamily: fonts.semiBold, fontSize: 11 },

  /* 4. Team Activity Section */
  teamSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  teamSectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: '#0F172A' },
  teamSectionSub: { fontFamily: fonts.semiBold, fontSize: 12, color: '#64748B' },
  teamScroll: { marginBottom: spacing.sm },
  memberCard: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  memberAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  memberAvatarText: { fontFamily: fonts.bold, fontSize: 18, color: '#2563EB' },
  memberDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  memberName: { fontFamily: fonts.semiBold, fontSize: 12, color: '#0F172A', textAlign: 'center' },
  memberRole: { fontFamily: fonts.regular, fontSize: 10.5, color: '#64748B', marginTop: 1 },
  memberStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 6,
  },
  memberStatusText: { fontFamily: fonts.semiBold, fontSize: 9.5 },

  /* ── Tab 2: Attendance Styles ─────────────────────────────────── */
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: 4,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabItem: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm },
  subTabItemActive: { backgroundColor: '#2563EB' },
  subTabText: { fontFamily: fonts.semiBold, fontSize: 13, color: '#64748B' },
  subTabTextActive: { color: '#FFFFFF' },
  subTabScroll: { flex: 1, marginTop: spacing.sm },

  donutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  donutRingWrap: { marginVertical: spacing.sm },
  donutRingOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 16,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftColor: '#BFDBFE',
  },
  donutRingInner: { alignItems: 'center' },
  donutMainNum: { fontFamily: fonts.bold, fontSize: 36, color: '#0F172A' },
  donutPresentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 2,
  },
  donutPresentText: { fontFamily: fonts.semiBold, fontSize: 11, color: '#059669' },
  donutPrevText: { fontFamily: fonts.regular, fontSize: 12, color: '#94A3B8', marginTop: spacing.md },

  eightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  eightGridCard: {
    width: (width - 44) / 4,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eightGridVal: { fontFamily: fonts.bold, fontSize: 16, color: '#0F172A' },
  eightGridPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  eightGridLabel: { fontFamily: fonts.semiBold, fontSize: 10 },

  /* Daily Stats Timeline */
  dateRibbon: { marginBottom: spacing.md },
  datePill: {
    width: 44,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  datePillDay: { fontFamily: fonts.medium, fontSize: 11, color: '#64748B' },
  datePillDayActive: { color: '#FFFFFF' },
  datePillDate: { fontFamily: fonts.bold, fontSize: 15, color: '#0F172A', marginTop: 2 },
  datePillDateActive: { color: '#FFFFFF' },

  daySummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  daySummaryDate: { fontFamily: fonts.bold, fontSize: 13, color: '#2563EB' },
  dayWorkingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  workingLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: '#64748B' },
  workingHours: { fontFamily: fonts.bold, fontSize: 26, color: '#0F172A', marginTop: 2 },
  shortHoursText: { fontFamily: fonts.semiBold, fontSize: 13, color: '#94A3B8', marginTop: 2 },

  shiftPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  shiftPillAccent: { width: 4, height: 16, backgroundColor: '#2563EB', borderRadius: 2 },
  shiftPillText: { fontFamily: fonts.medium, fontSize: 12, color: '#475569' },

  timelineContainer: { marginTop: spacing.lg },
  timelineStep: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  timelineLeft: { alignItems: 'center', width: 24 },
  stepCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#CBD5E1', marginVertical: 4 },

  timelineCardIn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  timelineCardOut: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  timelineCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timelineActionTitle: { fontFamily: fonts.semiBold, fontSize: 13.5, color: '#0F172A' },
  timelineTime: { fontFamily: fonts.medium, fontSize: 13, color: '#475569' },
  onTimeBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  onTimeBadgeText: { fontFamily: fonts.bold, color: '#FFFFFF', fontSize: 11 },
  goodJobBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  goodJobBadgeText: { fontFamily: fonts.bold, color: '#FFFFFF', fontSize: 11 },

  /* Request Card */
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  requestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestTitle: { fontFamily: fonts.bold, fontSize: 15, color: '#2563EB' },
  requestDate: { fontFamily: fonts.regular, fontSize: 12, color: '#64748B' },
  requestDesc: { fontFamily: fonts.semiBold, fontSize: 13.5, color: '#0F172A', marginVertical: spacing.sm },
  requestMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xs },
  requestApplied: { fontFamily: fonts.regular, fontSize: 11.5, color: '#94A3B8' },
  requestTx: { fontFamily: fonts.semiBold, fontSize: 11.5, color: '#2563EB' },
  requestBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  adminNoteText: { fontFamily: fonts.medium, fontSize: 12.5, color: '#0F172A' },
  approvedBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#16A34A',
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  approvedBadgeText: { fontFamily: fonts.bold, color: '#16A34A', fontSize: 11.5 },
  newRequestBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  newRequestBtnText: { fontFamily: fonts.semiBold, color: '#FFFFFF', fontSize: 13.5 },

  /* ── Tab 3: Profile Styles ───────────────────────────────────── */
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  profileAvatarWrap: { position: 'relative', marginBottom: spacing.sm },
  profileAvatarImg: { width: 84, height: 84, borderRadius: 42 },
  profileVerifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileVerifiedCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  profileName: { fontFamily: fonts.bold, fontSize: 20, color: '#0F172A' },
  profileRole: { fontFamily: fonts.regular, fontSize: 13, color: '#64748B', marginTop: 2 },
  profileIdBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginTop: 6,
  },
  profileIdText: { fontFamily: fonts.semiBold, fontSize: 11.5, color: '#2563EB' },

  profileInfoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  profileInfoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  profileInfoLabel: { fontFamily: fonts.regular, fontSize: 10.5, color: '#64748B' },
  profileInfoVal: { fontFamily: fonts.semiBold, fontSize: 12.5, color: '#0F172A', marginTop: 1 },

  profileSubTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginTop: spacing.lg,
  },
  profileSubTabItem: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  profileSubTabItemActive: { borderBottomWidth: 2.5, borderBottomColor: '#2563EB' },
  profileSubTabText: { fontFamily: fonts.medium, fontSize: 12, color: '#64748B' },
  profileSubTabTextActive: { fontFamily: fonts.bold, color: '#2563EB' },

  profileFormSection: { marginTop: spacing.lg },
  profileFormTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: spacing.md,
  },
  fieldWrapper: { marginBottom: spacing.sm },
  dualFieldRow: { flexDirection: 'row', gap: spacing.sm },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  fieldCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  fieldValue: { fontFamily: fonts.semiBold, fontSize: 13.5, color: '#0F172A' },

  /* ── Tab 4: More Styles ──────────────────────────────────────── */
  adminBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...shadows.sm,
  },
  adminBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerTitle: { fontFamily: fonts.bold, fontSize: 15, color: '#C2410C' },
  adminBannerSub: { fontFamily: fonts.regular, fontSize: 11.5, color: '#9A3412', marginTop: 2 },
  adminBannerArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerArrowText: { color: '#EA580C', fontSize: 14, fontWeight: '900' },

  moreSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#64748B',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  moreMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.sm,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  moreMenuDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginRight: spacing.md,
  },
  moreMenuBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  moreMenuLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: '#0F172A', flex: 1 },
  moreMenuArrow: { fontSize: 20, color: '#CBD5E1' },

  /* ── Bottom Navigation Tab Bar ───────────────────────────────── */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: 8,
    ...shadows.lg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabItemActive: {},
  tabLabel: { fontFamily: fonts.medium, fontSize: 11, color: '#94A3B8', marginTop: 3 },
  tabLabelActive: { fontFamily: fonts.bold, color: '#2563EB' },
});
