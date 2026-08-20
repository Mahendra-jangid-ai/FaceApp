import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography, shadows, MONO, isAccessibilityMode, setAccessibilityMode } from '../theme';
import { getEnrolledUsers, getAuthLogs, clearAllData } from '../services/database';
import { getSyncConfig, updateSyncConfig, syncToServer } from '../services/syncService';
import { getWorkSites, saveWorkSite, deleteWorkSite, getCurrentLocation } from '../services/geofencing';
import { getPPEConfig, updatePPEConfig, type PPEConfig } from '../services/ppeDetection';
import { isVoiceEnabled, setVoiceEnabled } from '../services/voicePrompts';
import { getRetentionConfig, performCleanup, getStorageStats } from '../services/dataRetention';
import { getAdaptiveStats } from '../services/adaptiveThreshold';
import { toggleLanguage, getLanguage } from '../services/i18n';
import type { SyncConfig, EnrolledUser, WorkSite } from '../types';

export default function SettingsScreen() {
  const [config, setConfig] = useState<SyncConfig | null>(null);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [logCount, setLogCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [ppeConfig, setPpeConfig] = useState<PPEConfig | null>(null);
  const [voiceOn, setVoiceOn] = useState(isVoiceEnabled());
  const [aaaMode, setAaaMode] = useState(isAccessibilityMode());
  const [lang, setLang] = useState(getLanguage());
  const [storageKB, setStorageKB] = useState(0);
  const [retentionDays, setRetentionDays] = useState(7);
  const [thresholdInfo, setThresholdInfo] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const [cfg, users, logs, sites, ppe, retention, storage, adaptive] = await Promise.all([
      getSyncConfig(),
      getEnrolledUsers(),
      getAuthLogs(),
      getWorkSites(),
      getPPEConfig(),
      getRetentionConfig(),
      getStorageStats(),
      getAdaptiveStats(),
    ]);
    setConfig(cfg);
    setEnrolledUsers(users);
    setLogCount(logs.length);
    setWorkSites(sites);
    setPpeConfig(ppe);
    setRetentionDays(retention.syncedRecordRetentionDays);
    setStorageKB(storage.estimatedSizeKB);
    setThresholdInfo(
      `Threshold: ${adaptive.threshold.toFixed(3)} (${adaptive.genuineSamples}g / ${adaptive.impostorSamples}i)`,
    );
  };

  const handleAddSite = async () => {
    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert('Location Error', 'Could not get GPS fix. Please enable device location.');
      return;
    }
    const site: WorkSite = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: `Site @ ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 500,
      createdAt: Date.now(),
    };
    await saveWorkSite(site);
    Alert.alert('Site Saved', 'Geofence work site registered at current coordinates (500m radius).');
    loadData();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('Synchronizing with server...');
    const result = await syncToServer();
    if (result.success) {
      setSyncStatus(`Synced ${result.usersSynced} workers, ${result.logsSynced} logs, ${result.attendanceSynced} attendance records`);
    } else {
      setSyncStatus(`Sync failed: ${result.error}`);
    }
    setSyncing(false);
    loadData();
  };

  const handleCleanup = async () => {
    const result = await performCleanup();
    Alert.alert('Cleanup Complete', `Removed ${result.logsRemoved} synced logs and ${result.attendanceRemoved} attendance records.`);
    loadData();
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Data', 'Permanently delete all enrolled workers and local database records?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: async () => { await clearAllData(); loadData(); } },
    ]);
  };

  if (!config || !ppeConfig) return null;

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Security & Privacy Section */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Security & Privacy</Text>

        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowLabel}>
              <Text style={st.label}>BioHash (ISO/IEC 24745)</Text>
              <Text style={st.sublabel}>Irreversible biometric templates</Text>
            </View>
            <View style={st.enabledBadge}>
              <Text style={st.enabledText}>Active</Text>
            </View>
          </View>

          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Differential Privacy</Text>
              <Text style={st.sublabel}>Noise-calibrated mathematical privacy</Text>
            </View>
            <View style={st.enabledBadge}>
              <Text style={st.enabledText}>Active</Text>
            </View>
          </View>

          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Hardware Keystore (AES-256)</Text>
              <Text style={st.sublabel}>Encrypted local SQLite database</Text>
            </View>
            <View style={st.enabledBadge}>
              <Text style={st.enabledText}>Active</Text>
            </View>
          </View>

          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Adaptive Match Threshold</Text>
              <Text style={st.sublabel}>{thresholdInfo}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* PPE Safety Detection */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>PPE Safety Compliance</Text>

        <View style={st.card}>
          <View style={st.row}>
            <Text style={st.label}>PPE Detection Engine</Text>
            <Switch
              value={ppeConfig.enabled}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, enabled: v }); updatePPEConfig({ enabled: v }); }}
              trackColor={{ false: colors.line, true: colors.accentDim }}
              thumbColor={ppeConfig.enabled ? colors.accent : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Require Safety Helmet</Text>
            <Switch
              value={ppeConfig.requireHelmet}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, requireHelmet: v }); updatePPEConfig({ requireHelmet: v }); }}
              trackColor={{ false: colors.line, true: colors.warnDim }}
              thumbColor={ppeConfig.requireHelmet ? colors.warn : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Require High-Vis Vest</Text>
            <Switch
              value={ppeConfig.requireVest}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, requireVest: v }); updatePPEConfig({ requireVest: v }); }}
              trackColor={{ false: colors.line, true: colors.warnDim }}
              thumbColor={ppeConfig.requireVest ? colors.warn : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Block Entry on Non-Compliance</Text>
            <Switch
              value={ppeConfig.blockOnFailure}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, blockOnFailure: v }); updatePPEConfig({ blockOnFailure: v }); }}
              trackColor={{ false: colors.line, true: colors.dangerDim }}
              thumbColor={ppeConfig.blockOnFailure ? colors.danger : colors.textFaint}
            />
          </View>
        </View>
      </View>

      {/* Accessibility & Language */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Accessibility & Language</Text>

        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Voice Guidance (TTS)</Text>
              <Text style={st.sublabel}>Audio prompts in Hindi / English</Text>
            </View>
            <Switch
              value={voiceOn}
              onValueChange={v => { setVoiceOn(v); setVoiceEnabled(v); }}
              trackColor={{ false: colors.line, true: colors.accentDim }}
              thumbColor={voiceOn ? colors.accent : colors.textFaint}
            />
          </View>

          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>WCAG AAA High Contrast</Text>
              <Text style={st.sublabel}>Optimized for bright outdoor sunlight</Text>
            </View>
            <Switch
              value={aaaMode}
              onValueChange={v => { setAaaMode(v); setAccessibilityMode(v); }}
              trackColor={{ false: colors.line, true: colors.warnDim }}
              thumbColor={aaaMode ? colors.warn : colors.textFaint}
            />
          </View>

          <TouchableOpacity style={[st.row, st.bordered]} onPress={() => { const next = toggleLanguage(); setLang(next); }} activeOpacity={0.75}>
            <Text style={st.label}>App Language</Text>
            <View style={st.langBadge}>
              <Text style={st.langText}>{lang === 'en' ? 'English' : 'हिन्दी'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cloud Sync */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Cloud Synchronization</Text>

        <View style={st.card}>
          <View style={st.row}>
            <Text style={st.label}>Auto Sync in Background</Text>
            <Switch
              value={config.autoSync}
              onValueChange={v => { setConfig({ ...config, autoSync: v }); updateSyncConfig({ autoSync: v }); }}
              trackColor={{ false: colors.line, true: colors.cyanDim }}
              thumbColor={config.autoSync ? colors.cyan : colors.textFaint}
            />
          </View>

          <View style={[st.row, st.bordered, { paddingBottom: 4 }]}>
            <Text style={st.label}>Server Sync URL</Text>
          </View>
          
          <TextInput
            style={st.urlInput}
            value={config.serverUrl}
            onChangeText={v => { setConfig({ ...config, serverUrl: v }); updateSyncConfig({ serverUrl: v }); }}
            placeholder="https://api.faceauth.app/v3/sync"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
          />

          {config.lastSyncTime && (
            <Text style={st.lastSync}>Last Synced: {new Date(config.lastSyncTime).toLocaleString('en-IN')}</Text>
          )}

          {syncStatus !== '' && (
            <View style={st.syncStatusBox}>
              <Text style={st.syncStatusText}>{syncStatus}</Text>
            </View>
          )}

          <TouchableOpacity style={[st.actionRow, st.bordered]} onPress={handleSync} disabled={syncing} activeOpacity={0.8}>
            {syncing ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={st.actionIcon}>🔄</Text>}
            <Text style={st.actionText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Geofence Work Sites */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Geofence Work Sites ({workSites.length})</Text>

        <View style={st.card}>
          {workSites.map((site, i) => (
            <TouchableOpacity
              key={site.id}
              style={[st.siteRow, i > 0 && st.bordered]}
              onLongPress={() => {
                Alert.alert('Remove Site', `Delete ${site.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => { await deleteWorkSite(site.id); loadData(); } },
                ]);
              }}
              activeOpacity={0.75}>
              <View style={st.siteHeader}>
                <Text style={st.siteName}>📍 {site.name}</Text>
                <View style={st.siteRadiusBadge}>
                  <Text style={st.siteRadiusText}>{site.radiusMeters}m</Text>
                </View>
              </View>
              <Text style={st.siteCoords}>{site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[st.actionRow, workSites.length > 0 && st.bordered]} onPress={handleAddSite} activeOpacity={0.8}>
            <Text style={st.actionIcon}>📍</Text>
            <Text style={st.actionText}>Add Current Location as Work Site</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Management & Retention */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Data Management</Text>

        <View style={st.card}>
          <View style={st.row}>
            <Text style={st.label}>Storage Size</Text>
            <Text style={st.dataValue}>{storageKB} KB</Text>
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Audit Logs</Text>
            <Text style={st.dataValue}>{logCount}</Text>
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Registered Workers</Text>
            <Text style={st.dataValue}>{enrolledUsers.length}</Text>
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Retention Period</Text>
            <Text style={st.dataValue}>{retentionDays} Days</Text>
          </View>
          <TouchableOpacity style={[st.actionRow, st.bordered]} onPress={handleCleanup} activeOpacity={0.8}>
            <Text style={st.actionIcon}>🧹</Text>
            <Text style={st.actionText}>Purge Old Records ({'>'} {retentionDays} days)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionRow, st.bordered]} onPress={handleClearAll} activeOpacity={0.8}>
            <Text style={[st.actionIcon, { color: colors.danger }]}>🗑️</Text>
            <Text style={[st.actionText, { color: colors.danger }]}>Clear All Local Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={st.section}>
        <View style={st.aboutCard}>
          <Text style={st.aboutTitle}>FaceAuth v3.0</Text>
          <Text style={st.aboutText}>Offline Face Recognition • ISO/IEC 24745 BioHash • AES-256 GCM</Text>
          <Text style={st.aboutText}>MobileFaceNet INT8 (1.15 MB) • 99.28% LFW Benchmark</Text>
        </View>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.line,
    ...shadows.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  bordered: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { flex: 1, marginRight: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  sublabel: { fontSize: 11.5, color: colors.textDim, marginTop: 2 },
  urlInput: {
    backgroundColor: colors.surfaceAlt, marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderRadius: borderRadius.md, padding: spacing.md, fontSize: 13, color: colors.text,
    borderWidth: 1, borderColor: colors.line,
  },
  lastSync: { fontSize: 11, color: colors.textFaint, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  syncStatusBox: { backgroundColor: colors.accentDim, padding: spacing.md, borderTopWidth: 1, borderTopColor: '#FED7AA' },
  syncStatusText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  actionIcon: { fontSize: 18, color: colors.accent },
  actionText: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  enabledBadge: { backgroundColor: colors.successDim, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.xs, borderWidth: 1, borderColor: '#BBF7D0' },
  enabledText: { fontSize: 10, fontWeight: '700', color: colors.success },
  langBadge: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  langText: { fontSize: 12.5, fontWeight: '700', color: colors.text },
  
  siteRow: { padding: spacing.md },
  siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  siteName: { fontSize: 14, fontWeight: '600', color: colors.text },
  siteRadiusBadge: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.xs },
  siteRadiusText: { fontSize: 10, color: colors.textDim, fontWeight: '700' },
  siteCoords: { fontSize: 11, color: colors.textFaint, marginTop: 2, fontFamily: MONO },
  
  dataValue: { fontSize: 13.5, color: colors.accent, fontWeight: '700', fontFamily: MONO },
  aboutCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.xl,
    borderWidth: 1, borderColor: colors.line, ...shadows.sm,
  },
  aboutTitle: { fontSize: 15, fontWeight: '800', color: colors.accent },
  aboutText: { fontSize: 11, color: colors.textDim, marginTop: 2, textAlign: 'center' },
});
