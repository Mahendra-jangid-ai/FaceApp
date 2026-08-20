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
import { spacing, fonts } from '../theme';
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
          <View style={s.quickActionIconWrap}>
            <IconAttendance size={22} color="#2C3540" />
          </View>
          <Text style={s.quickActionLabel}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => navigation.navigate('PPECheck')}
          activeOpacity={0.75}>
          <View style={s.quickActionIconWrap}>
            <IconSafety size={22} color="#2C3540" />
          </View>
          <Text style={s.quickActionLabel}>PPE Safety</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => setActiveTab('attendance')}
          activeOpacity={0.75}>
          <View style={s.quickActionIconWrap}>
            <IconLeave size={22} color="#1B4F72" />
          </View>
          <Text style={s.quickActionLabel}>Leave</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.quickActionItem}
          onPress={() => navigation.navigate('Calendar')}
          activeOpacity={0.75}>
          <View style={s.quickActionIconWrap}>
            <IconHolidays size={22} color="#2C3540" />
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
              <IconArrowIn size={14} color="#4F6B52" />
              <Text style={s.ribbonValue}>10:14 AM</Text>
            </View>
          </View>

          <View style={s.ribbonDivider} />

          <View style={s.ribbonCol}>
            <Text style={s.ribbonLabel}>Check Out</Text>
            <View style={s.ribbonValueRow}>
              <IconArrowOut size={14} color="#A35448" />
              <Text style={s.ribbonValue}>06:31 PM</Text>
            </View>
          </View>

          <View style={s.ribbonDivider} />

          <View style={s.ribbonCol}>
            <Text style={s.ribbonLabel}>Short Hours</Text>
            <View style={s.ribbonValueRow}>
              <IconClock size={12} color="#8A8378" />
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
          <IconAttendance size={18} color="#2C3540" />
          <Text style={s.overviewTitle}>Overview</Text>
        </View>
        <Text style={s.overviewMonth}>August 2026</Text>
      </View>

      {/* 2x2 Clean Stat Grid */}
      <View style={s.overviewGrid}>
        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>14</Text>
          <Text style={s.overviewLabel}>Presence</Text>
        </View>

        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>00</Text>
          <Text style={s.overviewLabel}>Absence</Text>
        </View>

        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>00</Text>
          <Text style={s.overviewLabel}>Leave</Text>
        </View>

        <View style={s.overviewCard}>
          <Text style={s.overviewVal}>10 / 10</Text>
          <Text style={s.overviewLabel}>Allowance</Text>
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
              <View style={s.memberDot} />
            </View>
            <Text style={s.memberName} numberOfLines={1}>{member.name}</Text>
            <Text style={s.memberRole}>{member.role}</Text>
            <View style={s.memberStatusBadge}>
              <Text style={s.memberStatusText}>
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
                    <View style={s.pillDot} />
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
              { val: '00', label: 'Absent' },
              { val: '00', label: 'Leave' },
              { val: '10', label: 'Holidays' },
              { val: '00', label: 'Half Day' },
              { val: '14', label: 'On Time' },
              { val: '00', label: 'Late' },
              { val: '00:00', label: 'Extra Hrs' },
              { val: '00:00', label: 'Short Hrs' },
            ].map((item, idx) => (
              <View key={idx} style={s.eightGridCard}>
                <Text style={s.eightGridVal}>{item.val}</Text>
                <Text style={s.eightGridLabel}>{item.label}</Text>
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
                    <IconArrowIn size={16} color="#4F6B52" />
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
                    <IconArrowOut size={16} color="#A35448" />
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
            <IconSafety size={20} color="#2C3540" />
            <View>
              <Text style={s.profileInfoLabel}>Department</Text>
              <Text style={s.profileInfoVal}>Operations</Text>
            </View>
          </View>

          <View style={s.profileInfoBox}>
            <IconAttendance size={20} color="#2C3540" />
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
            <Text
              style={[s.profileSubTabText, profileSubTab === tab && s.profileSubTabTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
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
            <IconBell size={18} color="#2C3540" />
            <View style={s.bellDot} />
          </TouchableOpacity>

          {/* Admin Shortcut */}
          <TouchableOpacity
            style={s.adminPillBtn}
            onPress={handleAdminPress}
            activeOpacity={0.8}>
            <IconLock size={12} color="#1B4F72" />
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
          <IconDashboard size={18} color={activeTab === 'dashboard' ? '#1B4F72' : '#8B939C'} />
          <Text
            style={[s.tabLabel, activeTab === 'dashboard' && s.tabLabelActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'attendance' && s.tabItemActive]}
          onPress={() => setActiveTab('attendance')}
          activeOpacity={0.8}>
          <IconAttendance size={18} color={activeTab === 'attendance' ? '#1B4F72' : '#8B939C'} />
          <Text
            style={[s.tabLabel, activeTab === 'attendance' && s.tabLabelActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'profile' && s.tabItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}>
          <IconProfile size={18} color={activeTab === 'profile' ? '#1B4F72' : '#8B939C'} />
          <Text
            style={[s.tabLabel, activeTab === 'profile' && s.tabLabelActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'more' && s.tabItemActive]}
          onPress={() => setActiveTab('more')}
          activeOpacity={0.8}>
          <IconMore size={18} color={activeTab === 'more' ? '#1B4F72' : '#8B939C'} />
          <Text
            style={[s.tabLabel, activeTab === 'more' && s.tabLabelActive]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            More
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const INK = '#2C3540';
const MUTED = '#5B6570';
const FAINT = '#8B939C';
const PAPER = '#F4F6F8';
const CARD = '#FFFFFF';
const LINE = '#E6E8EC';
const CLAY = '#1B4F72';
const MOSS = '#2F6B4F';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* App Top Header */
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xxxl + spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerLogoImg: { width: 40, height: 40, borderRadius: 8 },
  headerGreeting: { fontFamily: fonts.regular, fontSize: 12, color: MUTED },
  headerUserName: { fontFamily: fonts.semiBold, fontSize: 17, color: INK, marginTop: -1 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY,
  },
  adminPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminPillText: { fontFamily: fonts.medium, fontSize: 12, color: INK },

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
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: CARD,
    borderColor: LINE,
  },
  quickActionLabel: { fontFamily: fonts.medium, fontSize: 11, color: MUTED, marginTop: 6 },

  /* 2. Hero Live Attendance Card */
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: LINE,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTimeSection: { flex: 1 },
  ringAndDate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressRing: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAPER,
  },
  progressRingText: { fontFamily: fonts.semiBold, color: INK, fontSize: 9 },
  heroDateText: { fontFamily: fonts.medium, color: MUTED, fontSize: 12 },
  heroClockText: {
    fontFamily: fonts.semiBold,
    color: INK,
    fontSize: 28,
    marginTop: 4,
    letterSpacing: 0.4,
  },

  heroAvatarWrap: { position: 'relative' },
  heroAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  heroAvatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: MOSS,
    borderWidth: 1.5,
    borderColor: CARD,
  },

  heroBottomRibbon: {
    flexDirection: 'row',
    backgroundColor: PAPER,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ribbonCol: { alignItems: 'center', flex: 1 },
  ribbonLabel: { fontFamily: fonts.regular, color: MUTED, fontSize: 11 },
  ribbonValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ribbonValue: { fontFamily: fonts.semiBold, color: INK, fontSize: 12.5 },
  ribbonDivider: { width: 1, height: 24, backgroundColor: LINE },

  heroPunchBtn: {
    backgroundColor: CLAY,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  heroPunchBtnText: { fontFamily: fonts.semiBold, color: CARD, fontSize: 14 },

  /* 3. Overview 2x2 Grid */
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  overviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overviewTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: INK },
  overviewMonth: { fontFamily: fonts.medium, fontSize: 13, color: MUTED },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  overviewCard: {
    width: (width - 44) / 2,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: LINE,
  },
  overviewVal: { fontFamily: fonts.semiBold, fontSize: 24, color: INK },
  overviewLabel: { fontFamily: fonts.regular, fontSize: 12, color: MUTED, marginTop: 4 },
  overviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: spacing.xs + 2,
  },
  pillDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: MOSS },
  pillLabel: { fontFamily: fonts.medium, fontSize: 11, color: MUTED },

  /* 4. Team Activity Section */
  teamSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  teamSectionTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: INK },
  teamSectionSub: { fontFamily: fonts.medium, fontSize: 12, color: MUTED },
  teamScroll: { marginBottom: spacing.sm },
  memberCard: {
    width: 130,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: LINE,
  },
  memberAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  memberAvatarText: { fontFamily: fonts.semiBold, fontSize: 17, color: INK },
  memberDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: CARD,
    backgroundColor: MOSS,
  },
  memberName: { fontFamily: fonts.medium, fontSize: 12, color: INK, textAlign: 'center' },
  memberRole: { fontFamily: fonts.regular, fontSize: 10.5, color: MUTED, marginTop: 1 },
  memberStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
    backgroundColor: PAPER,
  },
  memberStatusText: { fontFamily: fonts.medium, fontSize: 9.5, color: MUTED },

  /* ── Tab 2: Attendance Styles ─────────────────────────────────── */
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 3,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: LINE,
  },
  subTabItem: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 8 },
  subTabItemActive: { backgroundColor: PAPER },
  subTabText: { fontFamily: fonts.medium, fontSize: 13, color: MUTED },
  subTabTextActive: { color: INK, fontFamily: fonts.semiBold },
  subTabScroll: { flex: 1, marginTop: spacing.sm },

  donutCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  donutRingWrap: { marginVertical: spacing.sm },
  donutRingOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 10,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopColor: CLAY,
  },
  donutRingInner: { alignItems: 'center' },
  donutMainNum: { fontFamily: fonts.semiBold, fontSize: 34, color: INK },
  donutPresentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PAPER,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  donutPresentText: { fontFamily: fonts.medium, fontSize: 11, color: MUTED },
  donutPrevText: { fontFamily: fonts.regular, fontSize: 12, color: FAINT, marginTop: spacing.md },

  eightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  eightGridCard: {
    width: (width - 52) / 4,
    backgroundColor: CARD,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  eightGridVal: { fontFamily: fonts.semiBold, fontSize: 16, color: INK },
  eightGridPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  eightGridLabel: { fontFamily: fonts.regular, fontSize: 10, color: MUTED, marginTop: 4 },

  /* Daily Stats Timeline */
  dateRibbon: { marginBottom: spacing.md },
  datePill: {
    width: 44,
    height: 64,
    borderRadius: 10,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
    borderWidth: 1,
    borderColor: LINE,
  },
  datePillActive: { backgroundColor: PAPER, borderColor: CLAY },
  datePillDay: { fontFamily: fonts.medium, fontSize: 11, color: MUTED },
  datePillDayActive: { color: CLAY },
  datePillDate: { fontFamily: fonts.semiBold, fontSize: 15, color: INK, marginTop: 2 },
  datePillDateActive: { color: CLAY },

  daySummaryCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: LINE,
  },
  daySummaryDate: { fontFamily: fonts.semiBold, fontSize: 13, color: CLAY },
  dayWorkingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  workingLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: MUTED },
  workingHours: { fontFamily: fonts.semiBold, fontSize: 26, color: INK, marginTop: 2 },
  shortHoursText: { fontFamily: fonts.medium, fontSize: 13, color: FAINT, marginTop: 2 },

  shiftPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: PAPER,
    padding: spacing.md,
    borderRadius: 10,
  },
  shiftPillAccent: { width: 3, height: 16, backgroundColor: CLAY, borderRadius: 2 },
  shiftPillText: { fontFamily: fonts.medium, fontSize: 12, color: MUTED },

  timelineContainer: { marginTop: spacing.lg },
  timelineStep: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  timelineLeft: { alignItems: 'center', width: 24 },
  stepCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCheck: { color: CARD, fontSize: 12, fontWeight: '700' },
  timelineLine: { width: 1, flex: 1, backgroundColor: LINE, marginVertical: 4 },

  timelineCardIn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PAPER,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  timelineCardOut: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PAPER,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  timelineCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timelineActionTitle: { fontFamily: fonts.semiBold, fontSize: 13.5, color: INK },
  timelineTime: { fontFamily: fonts.medium, fontSize: 13, color: MUTED },
  onTimeBadge: {
    backgroundColor: PAPER,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  onTimeBadgeText: { fontFamily: fonts.medium, color: MOSS, fontSize: 11 },
  goodJobBadge: {
    backgroundColor: PAPER,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  goodJobBadgeText: { fontFamily: fonts.medium, color: MOSS, fontSize: 11 },

  /* Request Card */
  requestCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: LINE,
  },
  requestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: INK },
  requestDate: { fontFamily: fonts.regular, fontSize: 12, color: MUTED },
  requestDesc: { fontFamily: fonts.medium, fontSize: 13.5, color: INK, marginVertical: spacing.sm },
  requestMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xs },
  requestApplied: { fontFamily: fonts.regular, fontSize: 11.5, color: FAINT },
  requestTx: { fontFamily: fonts.medium, fontSize: 11.5, color: CLAY },
  requestBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  adminNoteText: { fontFamily: fonts.medium, fontSize: 12.5, color: INK },
  approvedBadge: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: 6,
  },
  approvedBadgeText: { fontFamily: fonts.medium, color: MOSS, fontSize: 11.5 },
  newRequestBtn: {
    backgroundColor: CLAY,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  newRequestBtnText: { fontFamily: fonts.semiBold, color: '#FFFFFF', fontSize: 13.5 },

  /* ── Tab 3: Profile Styles ───────────────────────────────────── */
  profileHeaderCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  profileAvatarWrap: { position: 'relative', marginBottom: spacing.sm },
  profileAvatarImg: { width: 84, height: 84, borderRadius: 12 },
  profileVerifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: MOSS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileVerifiedCheck: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  profileName: { fontFamily: fonts.semiBold, fontSize: 20, color: INK },
  profileRole: { fontFamily: fonts.regular, fontSize: 13, color: MUTED, marginTop: 2 },
  profileIdBadge: {
    backgroundColor: PAPER,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  profileIdText: { fontFamily: fonts.medium, fontSize: 11.5, color: CLAY },

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
    backgroundColor: PAPER,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  profileInfoLabel: { fontFamily: fonts.regular, fontSize: 10.5, color: MUTED },
  profileInfoVal: { fontFamily: fonts.semiBold, fontSize: 12.5, color: INK, marginTop: 1 },

  profileSubTabBar: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginTop: spacing.lg,
  },
  profileSubTabItem: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  profileSubTabItemActive: { borderBottomWidth: 2, borderBottomColor: CLAY },
  profileSubTabText: { fontFamily: fonts.medium, fontSize: 12, color: MUTED },
  profileSubTabTextActive: { fontFamily: fonts.semiBold, color: CLAY },

  profileFormSection: { marginTop: spacing.lg },
  profileFormTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: INK,
    marginBottom: spacing.md,
  },
  fieldWrapper: { marginBottom: spacing.sm },
  dualFieldRow: { flexDirection: 'row', gap: spacing.sm },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 11, color: FAINT, marginBottom: 4 },
  fieldCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  fieldValue: { fontFamily: fonts.medium, fontSize: 13.5, color: INK },

  /* ── Tab 4: More Styles ──────────────────────────────────────── */
  adminBanner: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: LINE,
  },
  adminBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: CLAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: INK },
  adminBannerSub: { fontFamily: fonts.regular, fontSize: 11.5, color: MUTED, marginTop: 2 },
  adminBannerArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerArrowText: { color: CLAY, fontSize: 14, fontWeight: '700' },

  moreSectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: MUTED,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  moreMenuCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    overflow: 'hidden',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  moreMenuDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY,
    marginRight: spacing.md,
  },
  moreMenuBorder: { borderTopWidth: 1, borderTopColor: LINE },
  moreMenuLabel: { fontFamily: fonts.medium, fontSize: 14, color: INK, flex: 1 },
  moreMenuArrow: { fontSize: 20, color: FAINT },

  /* ── Bottom Navigation Tab Bar ───────────────────────────────── */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    overflow: 'visible',
  },
  tabItemActive: {},
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: FAINT,
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  tabLabelActive: { fontFamily: fonts.semiBold, color: CLAY },
});
