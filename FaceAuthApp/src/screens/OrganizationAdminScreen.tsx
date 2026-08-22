import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Organization } from '../types';
import { getOrganizations } from '../services/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OrganizationAdmin'>;
const { width } = Dimensions.get('window');

type Tab = 'overview' | 'workers' | 'reports' | 'settings';

export default function OrganizationAdminScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrganizations();
      setOrgs(res.organizations);
    } catch {
      // offline — ignore silently
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadOrgs(); }, [loadOrgs]));

  /* ── OVERVIEW ──────────────────────────────────────────────── */
  const renderOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      {/* Organization Cards */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>Organizations</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddOrganization')} activeOpacity={0.7}>
          <Text style={s.sectionLink}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xxl }} />
      ) : orgs.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>🏢</Text>
          <Text style={s.emptyTitle}>No Organization Added</Text>
          <Text style={s.emptyDesc}>Tap "+ Add New" above to register your first organization</Text>
        </View>
      ) : (
        orgs.map(org => (
          <View key={org.id} style={s.orgCard}>
            <View style={s.orgAvatar}>
              <Text style={s.orgAvatarText}>{org.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.orgInfo}>
              <Text style={s.orgName}>{org.name}</Text>
              <Text style={s.orgMeta}>{org.email}</Text>
              <Text style={s.orgMeta}>{org.phone}</Text>
              <Text style={s.orgAddress} numberOfLines={1}>{org.address}</Text>
            </View>
            <View style={[s.statusBadge, org.is_active ? s.badgeGreen : s.badgeRed]}>
              <Text style={[s.statusText, org.is_active ? s.textGreen : s.textRed]}>
                {org.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Stats Grid */}
      <Text style={s.sectionTitle2}>Overview</Text>
      <View style={s.statsGrid}>
        {[
          { icon: '🏢', val: orgs.length.toString(), label: 'Organizations' },
          { icon: '👷', val: '—', label: 'Total Workers' },
          { icon: '✅', val: '—', label: 'Present Today' },
          { icon: '❌', val: '—', label: 'Absent Today' },
        ].map((item, i) => (
          <View key={i} style={s.statCard}>
            <Text style={s.statIcon}>{item.icon}</Text>
            <Text style={s.statVal}>{item.val}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={s.sectionTitle2}>Quick Actions</Text>
      <View style={s.menuCard}>
        {[
          { icon: '➕', label: 'Add Organization', onPress: () => navigation.navigate('AddOrganization') },
          { icon: '👤', label: 'Enroll Worker',    onPress: () => navigation.navigate('Enroll') },
          { icon: '📋', label: 'Worker Directory', onPress: () => navigation.navigate('WorkerList') },
          { icon: '📊', label: 'Analytics Dashboard', onPress: () => navigation.navigate('Dashboard') },
          { icon: '📅', label: 'Attendance Calendar', onPress: () => navigation.navigate('Calendar') },
          { icon: '📜', label: 'Audit Logs',       onPress: () => navigation.navigate('History') },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[s.menuItem, i > 0 && s.menuBorder]}
            onPress={item.onPress}
            activeOpacity={0.75}>
            <Text style={s.menuIcon}>{item.icon}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  /* ── WORKERS ────────────────────────────────────────────────── */
  const renderWorkers = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
      <View style={s.emptyCard}>
        <Text style={s.emptyEmoji}>👷</Text>
        <Text style={s.emptyTitle}>Worker Management</Text>
        <Text style={s.emptyDesc}>Enroll new workers or manage the existing directory</Text>
      </View>
      <View style={s.menuCard}>
        {[
          { icon: '👤', label: 'Enroll New Worker',  onPress: () => navigation.navigate('Enroll') },
          { icon: '📋', label: 'Worker Directory',   onPress: () => navigation.navigate('WorkerList') },
          { icon: '📍', label: 'Assign Work Location', onPress: () => {} },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[s.menuItem, i > 0 && s.menuBorder]}
            onPress={item.onPress}
            activeOpacity={0.75}>
            <Text style={s.menuIcon}>{item.icon}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  /* ── REPORTS ────────────────────────────────────────────────── */
  const renderReports = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
      <View style={s.emptyCard}>
        <Text style={s.emptyEmoji}>📊</Text>
        <Text style={s.emptyTitle}>Reports & Analytics</Text>
        <Text style={s.emptyDesc}>View attendance trends, export data and monitor activity</Text>
      </View>
      <View style={s.menuCard}>
        {[
          { icon: '📊', label: 'Analytics Dashboard', onPress: () => navigation.navigate('Dashboard') },
          { icon: '📅', label: 'Attendance Calendar', onPress: () => navigation.navigate('Calendar') },
          { icon: '📜', label: 'Audit Logs',          onPress: () => navigation.navigate('History') },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[s.menuItem, i > 0 && s.menuBorder]}
            onPress={item.onPress}
            activeOpacity={0.75}>
            <Text style={s.menuIcon}>{item.icon}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  /* ── SETTINGS ───────────────────────────────────────────────── */
  const renderSettings = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
      <View style={s.menuCard}>
        {[
          { icon: '🔒', label: 'Admin Login',       onPress: () => navigation.navigate('AdminLogin') },
          { icon: '⚙️', label: 'System Settings',   onPress: () => navigation.navigate('Settings') },
          { icon: '🔐', label: 'Admin Dashboard',   onPress: () => navigation.navigate('AdminDashboard') },
          { icon: '🏠', label: 'Back to Role Selection', onPress: () => navigation.navigate('Onboarding') },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[s.menuItem, i > 0 && s.menuBorder]}
            onPress={item.onPress}
            activeOpacity={0.75}>
            <Text style={s.menuIcon}>{item.icon}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: 'overview', icon: '🏠', label: 'Overview' },
    { key: 'workers',  icon: '👷', label: 'Workers'  },
    { key: 'reports',  icon: '📊', label: 'Reports'  },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* ── Header ────────────────────────────────────────────── */}
      <SafeAreaView style={s.headerWrap}>
        <View style={s.header}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.navigate('Onboarding')}
            activeOpacity={0.7}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Admin Portal</Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {orgs.length > 0 ? orgs[0].name : 'No organization yet'}
            </Text>
          </View>

          <TouchableOpacity
            style={s.addOrgBtn}
            onPress={() => navigation.navigate('AddOrganization')}
            activeOpacity={0.8}>
            <Text style={s.addOrgText}>+ Org</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Content ───────────────────────────────────────────── */}
      <View style={s.body}>
        {tab === 'overview' && renderOverview()}
        {tab === 'workers'  && renderWorkers()}
        {tab === 'reports'  && renderReports()}
        {tab === 'settings' && renderSettings()}
      </View>

      {/* ── Bottom Tab Bar ────────────────────────────────────── */}
      <View style={s.bottomBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={s.bottomTab}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}>
            <Text style={s.bottomTabIcon}>{t.icon}</Text>
            <Text style={[s.bottomTabLabel, tab === t.key && s.bottomTabLabelActive]}>
              {t.label}
            </Text>
            {tab === t.key && <View style={s.activeLine} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  /* Header */
  headerWrap: { borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: colors.primary, lineHeight: 26 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  headerSub: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
  addOrgBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: 7, borderRadius: 9, ...shadows.sm,
  },
  addOrgText: { fontFamily: fonts.semiBold, fontSize: 12.5, color: '#FFFFFF' },

  /* Body */
  body: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  /* Section */
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  sectionLink: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primary },
  sectionTitle2: {
    fontFamily: fonts.semiBold, fontSize: 14, color: colors.text,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },

  /* Empty */
  emptyCard: {
    alignItems: 'center', paddingVertical: spacing.xxl,
    backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.line, marginBottom: spacing.md,
  },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  emptyDesc: {
    fontFamily: fonts.regular, fontSize: 12.5, color: colors.textDim,
    textAlign: 'center', marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },

  /* Org Card */
  orgCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.line,
    padding: spacing.md, marginBottom: spacing.md,
    ...shadows.sm,
  },
  orgAvatar: {
    width: 46, height: 46, borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDim,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  orgAvatarText: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary },
  orgInfo: { flex: 1 },
  orgName: { fontFamily: fonts.semiBold, fontSize: 14.5, color: colors.text },
  orgMeta: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
  orgAddress: { fontFamily: fonts.regular, fontSize: 11, color: colors.textFaint, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: spacing.sm },
  badgeGreen: { backgroundColor: colors.successDim },
  badgeRed: { backgroundColor: colors.dangerDim },
  statusText: { fontFamily: fonts.medium, fontSize: 11 },
  textGreen: { color: colors.success },
  textRed: { color: colors.danger },

  /* Stats Grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.line,
    padding: spacing.lg, alignItems: 'center', ...shadows.sm,
  },
  statIcon: { fontSize: 24, marginBottom: spacing.xs },
  statVal: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textDim, marginTop: 2 },

  /* Menu */
  menuCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...shadows.sm,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  menuBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  menuIcon: { fontSize: 18, marginRight: spacing.md },
  menuLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textFaint },

  /* Bottom Bar */
  bottomBar: {
    flexDirection: 'row', backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.line,
    paddingBottom: spacing.lg, paddingTop: spacing.sm,
  },
  bottomTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xs, position: 'relative',
  },
  bottomTabIcon: { fontSize: 20 },
  bottomTabLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.textFaint, marginTop: 3 },
  bottomTabLabelActive: { color: colors.primary, fontFamily: fonts.semiBold },
  activeLine: {
    position: 'absolute', bottom: -spacing.sm,
    width: 24, height: 2.5,
    backgroundColor: colors.primary, borderRadius: 2,
  },
});
