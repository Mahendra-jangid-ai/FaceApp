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
import { getEnrolledUsers, getAuthLogs, clearAllData, deleteUser } from '../services/database';
import { getSyncConfig, updateSyncConfig, syncToServer, syncAndPurge } from '../services/syncService';
import { getWorkSites, saveWorkSite, deleteWorkSite, getCurrentLocation } from '../services/geofencing';
import { getPPEConfig, updatePPEConfig, type PPEConfig } from '../services/ppeDetection';
import { isVoiceEnabled, setVoiceEnabled } from '../services/voicePrompts';
import { getRetentionConfig, updateRetentionConfig, performCleanup, getStorageStats } from '../services/dataRetention';
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
      `Match: ${adaptive.threshold.toFixed(3)} | ${adaptive.genuineSamples}g / ${adaptive.impostorSamples}i samples`,
    );
  };

  const handleAddSite = async () => {
    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert('Location Error', 'Could not get GPS. Enable location services.');
      return;
    }
    const site: WorkSite = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: `Site at ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 500,
      createdAt: Date.now(),
    };
    await saveWorkSite(site);
    Alert.alert('Site Added', 'Work site created at your current location (500m radius).');
    loadData();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('Syncing...');
    const result = await syncToServer();
    if (result.success) {
      setSyncStatus(`Synced ${result.usersSynced} users, ${result.logsSynced} logs, ${result.attendanceSynced} attendance`);
    } else {
      setSyncStatus(`Failed: ${result.error}`);
    }
    setSyncing(false);
    loadData();
  };

  const handleCleanup = async () => {
    const result = await performCleanup();
    Alert.alert('Cleanup Done', `Removed ${result.logsRemoved} logs, ${result.attendanceRemoved} attendance records`);
    loadData();
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Data', 'Delete all local data permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await clearAllData(); loadData(); } },
    ]);
  };

  if (!config || !ppeConfig) return null;

  return (
    <ScrollView style={st.container} showsVerticalScrollIndicator={false}>
      {/* Security & Privacy */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>SECURITY & PRIVACY</Text>
        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowLabel}>
              <Text style={st.label}>BioHash (ISO/IEC 24745)</Text>
              <Text style={st.sublabel}>Cancellable biometric templates</Text>
            </View>
            <View style={st.enabledBadge}>
              <Text style={st.enabledText}>Active</Text>
            </View>
          </View>
          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Differential Privacy</Text>
              <Text style={st.sublabel}>Noise-calibrated embedding protection</Text>
            </View>
            <View style={st.enabledBadge}>
              <Text style={st.enabledText}>Active</Text>
            </View>
          </View>
          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Encryption</Text>
              <Text style={st.sublabel}>AES-256 with hardware keystore</Text>
            </View>
            <View style={st.enabledBadge}>
              <Text style={st.enabledText}>Active</Text>
            </View>
          </View>
          <View style={[st.row, st.bordered]}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Adaptive Threshold</Text>
              <Text style={st.sublabel}>{thresholdInfo}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* PPE Detection */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>PPE SAFETY COMPLIANCE</Text>
        <View style={st.card}>
          <View style={st.row}>
            <Text style={st.label}>PPE Detection</Text>
            <Switch
              value={ppeConfig.enabled}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, enabled: v }); updatePPEConfig({ enabled: v }); }}
              trackColor={{ false: colors.line, true: colors.accentDim }}
              thumbColor={ppeConfig.enabled ? colors.accent : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Require Helmet</Text>
            <Switch
              value={ppeConfig.requireHelmet}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, requireHelmet: v }); updatePPEConfig({ requireHelmet: v }); }}
              trackColor={{ false: colors.line, true: colors.warnDim }}
              thumbColor={ppeConfig.requireHelmet ? colors.warn : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Require Hi-Vis Vest</Text>
            <Switch
              value={ppeConfig.requireVest}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, requireVest: v }); updatePPEConfig({ requireVest: v }); }}
              trackColor={{ false: colors.line, true: colors.warnDim }}
              thumbColor={ppeConfig.requireVest ? colors.warn : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Block on Failure</Text>
            <Switch
              value={ppeConfig.blockOnFailure}
              onValueChange={v => { setPpeConfig({ ...ppeConfig, blockOnFailure: v }); updatePPEConfig({ blockOnFailure: v }); }}
              trackColor={{ false: colors.line, true: colors.dangerDim }}
              thumbColor={ppeConfig.blockOnFailure ? colors.danger : colors.textFaint}
            />
          </View>
        </View>
      </View>

      {/* Accessibility */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>ACCESSIBILITY</Text>
        <View style={st.card}>
          <View style={st.row}>
            <View style={st.rowLabel}>
              <Text style={st.label}>Voice Prompts</Text>
              <Text style={st.sublabel}>TTS guidance in Hindi/English</Text>
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
              <Text style={st.label}>WCAG AAA Mode</Text>
              <Text style={st.sublabel}>High contrast, large fonts for outdoor</Text>
            </View>
            <Switch
              value={aaaMode}
              onValueChange={v => { setAaaMode(v); setAccessibilityMode(v); }}
              trackColor={{ false: colors.line, true: colors.warnDim }}
              thumbColor={aaaMode ? colors.warn : colors.textFaint}
            />
          </View>
          <TouchableOpacity style={[st.row, st.bordered]} onPress={() => { const next = toggleLanguage(); setLang(next); }}>
            <Text style={st.label}>Language</Text>
            <View style={st.langBadge}>
              <Text style={st.langText}>{lang === 'en' ? 'English' : 'हिन्दी'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>CLOUD SYNC</Text>
        <View style={st.card}>
          <View style={st.row}>
            <Text style={st.label}>Auto Sync</Text>
            <Switch
              value={config.autoSync}
              onValueChange={v => { setConfig({ ...config, autoSync: v }); updateSyncConfig({ autoSync: v }); }}
              trackColor={{ false: colors.line, true: colors.accentDim }}
              thumbColor={config.autoSync ? colors.accent : colors.textFaint}
            />
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Server URL</Text>
          </View>
          <TextInput
            style={st.urlInput}
            value={config.serverUrl}
            onChangeText={v => { setConfig({ ...config, serverUrl: v }); updateSyncConfig({ serverUrl: v }); }}
            placeholder="https://your-server.com/api/sync"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
          />
          {config.lastSyncTime && (
            <Text style={st.lastSync}>Last sync: {new Date(config.lastSyncTime).toLocaleString('en-IN')}</Text>
          )}
          {syncStatus !== '' && (
            <View style={st.syncStatusBox}>
              <Text style={st.syncStatusText}>{syncStatus}</Text>
            </View>
          )}
          <TouchableOpacity style={[st.actionRow, st.bordered]} onPress={handleSync} disabled={syncing}>
            {syncing ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={st.actionIcon}>{'>'}</Text>}
            <Text style={st.actionText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Geofence */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>GEOFENCE SITES ({workSites.length})</Text>
        <View style={st.card}>
          {workSites.map((site, i) => (
            <TouchableOpacity
              key={site.id}
              style={[st.siteRow, i > 0 && st.bordered]}
              onLongPress={() => {
                Alert.alert('Remove?', `Remove ${site.name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: async () => { await deleteWorkSite(site.id); loadData(); } },
                ]);
              }}>
              <Text style={st.siteName}>{site.name}</Text>
              <Text style={st.siteCoords}>{site.latitude.toFixed(4)}, {site.longitude.toFixed(4)} | {site.radiusMeters}m</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[st.actionRow, workSites.length > 0 && st.bordered]} onPress={handleAddSite}>
            <Text style={st.actionIcon}>+</Text>
            <Text style={st.actionText}>Add Current Location</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Management */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>DATA MANAGEMENT</Text>
        <View style={st.card}>
          <View style={st.row}>
            <Text style={st.label}>Storage Used</Text>
            <Text style={st.dataValue}>{storageKB} KB</Text>
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Auth Logs</Text>
            <Text style={st.dataValue}>{logCount}</Text>
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Enrolled Users</Text>
            <Text style={st.dataValue}>{enrolledUsers.length}</Text>
          </View>
          <View style={[st.row, st.bordered]}>
            <Text style={st.label}>Retention (days)</Text>
            <Text style={st.dataValue}>{retentionDays}d</Text>
          </View>
          <TouchableOpacity style={[st.actionRow, st.bordered]} onPress={handleCleanup}>
            <Text style={st.actionIcon}>{'~'}</Text>
            <Text style={st.actionText}>Run Cleanup (purge synced {'>'} {retentionDays}d)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionRow, st.bordered]} onPress={handleClearAll}>
            <Text style={[st.actionIcon, { color: colors.danger }]}>{'!'}</Text>
            <Text style={[st.actionText, { color: colors.danger }]}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={st.section}>
        <View style={st.aboutCard}>
          <Text style={st.aboutTitle}>FaceAuth Pro v3.0</Text>
          <Text style={st.aboutText}>Offline Face Recognition | BioHash | Differential Privacy</Text>
          <Text style={st.aboutText}>Liveness | Anti-Spoof | PPE Detection | Geofencing</Text>
          <Text style={st.aboutText}>WCAG AAA | Voice Prompts | Hindi/English</Text>
          <Text style={st.aboutText}>OTA Updates | Play Integrity | Adaptive Thresholds</Text>
          <Text style={st.aboutText}>MobileFaceNet INT8 (1.15 MB) | 99.28% LFW</Text>
          <Text style={st.aboutText}>AES-256 + Hardware Keystore | Datalake 3.0</Text>
          <Text style={[st.aboutText, { marginTop: spacing.sm, fontWeight: '700', color: colors.accent }]}>NHAI Hackathon 7.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { padding: spacing.md, paddingBottom: 0 },
  sectionTitle: {
    ...typography.caption, color: colors.accent,
    marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.line,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  bordered: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { flex: 1, marginRight: spacing.md },
  label: { fontSize: 15, fontWeight: '500', color: colors.text },
  sublabel: { fontSize: 11, fontWeight: '500', color: colors.textFaint, marginTop: 1, letterSpacing: 0.5 },
  urlInput: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, fontSize: 14, color: colors.text, fontFamily: MONO },
  lastSync: { fontSize: 11, color: colors.textFaint, paddingHorizontal: spacing.md, paddingBottom: spacing.md, fontFamily: MONO },
  syncStatusBox: { backgroundColor: colors.accentDim, padding: spacing.md },
  syncStatusText: { fontSize: 13, fontWeight: '500', color: colors.accent },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  actionIcon: { fontSize: 20, fontWeight: '700', color: colors.accent },
  actionText: { fontSize: 15, fontWeight: '500', color: colors.text },
  enabledBadge: { backgroundColor: colors.successDim, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  enabledText: { fontSize: 11, fontWeight: '600', color: colors.success },
  langBadge: { backgroundColor: colors.accentDim, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  langText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  siteRow: { padding: spacing.md },
  siteName: { fontSize: 15, fontWeight: '500', color: colors.text },
  siteCoords: { fontSize: 11, color: colors.textFaint, marginTop: 1, fontFamily: MONO },
  dataValue: { fontSize: 15, color: colors.accent, fontWeight: '600', fontFamily: MONO },
  aboutCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xxl,
    borderWidth: 1, borderColor: colors.accent,
  },
  aboutTitle: { fontSize: 17, fontWeight: '700', color: colors.accent },
  aboutText: { fontSize: 11, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center', letterSpacing: 0.5 },
});
