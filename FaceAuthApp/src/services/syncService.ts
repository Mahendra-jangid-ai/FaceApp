import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnrolledUsers, getAuthLogs, getAttendanceRecords, markSynced, purgesynced } from './database';
import { withRetry } from './retryPolicy';
import { requestIntegrityToken } from './playIntegrity';
import type { SyncConfig } from '../types';

const SYNC_CONFIG_KEY = '@faceauth_sync_config';

const DEFAULT_CONFIG: SyncConfig = {
  serverUrl: 'https://your-aws-endpoint.com/api/sync',
  autoSync: true,
  syncInterval: 300000,
  lastSyncTime: null,
};

export async function getSyncConfig(): Promise<SyncConfig> {
  const data = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
  return data ? { ...DEFAULT_CONFIG, ...JSON.parse(data) } : DEFAULT_CONFIG;
}

export async function updateSyncConfig(config: Partial<SyncConfig>): Promise<void> {
  const current = await getSyncConfig();
  await AsyncStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

export async function syncToServer(): Promise<{
  success: boolean;
  usersSynced: number;
  logsSynced: number;
  attendanceSynced: number;
  error?: string;
}> {
  const online = await isOnline();
  if (!online) {
    return { success: false, usersSynced: 0, logsSynced: 0, attendanceSynced: 0, error: 'No network connection' };
  }

  const config = await getSyncConfig();
  const users = await getEnrolledUsers();
  const logs = await getAuthLogs();
  const attendance = await getAttendanceRecords();

  const unsyncedUsers = users.filter(u => !u.synced);
  const unsyncedLogs = logs.filter(l => !l.synced);
  const unsyncedAttendance = attendance.filter(a => !a.synced);

  if (unsyncedUsers.length === 0 && unsyncedLogs.length === 0 && unsyncedAttendance.length === 0) {
    return { success: true, usersSynced: 0, logsSynced: 0, attendanceSynced: 0 };
  }

  try {
    // Get device integrity token to include with sync
    const integrity = await requestIntegrityToken();

    const result = await withRetry(async () => {
      const response = await fetch(config.serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollments: unsyncedUsers.map(u => ({
            id: u.id,
            name: u.name,
            employeeId: u.employeeId,
            aadhar: u.aadhar,
            createdAt: u.createdAt,
            role: u.role,
          })),
          authLogs: unsyncedLogs.map(l => ({
            id: l.id,
            userId: l.userId,
            userName: l.userName,
            timestamp: l.timestamp,
            livenessPassed: l.livenessPassed,
            matchScore: l.matchScore,
            authenticated: l.authenticated,
            latitude: l.latitude,
            longitude: l.longitude,
            spoofScore: l.spoofScore,
            siteId: l.siteId,
            siteName: l.siteName,
            withinGeofence: l.withinGeofence,
            bioHashVerified: l.bioHashVerified,
            qualityScore: l.qualityScore,
            ppeCompliant: l.ppeCompliant,
            pipelineLatencyMs: l.pipelineLatencyMs,
          })),
          attendance: unsyncedAttendance.map(a => ({
            id: a.id,
            userId: a.userId,
            userName: a.userName,
            employeeId: a.employeeId,
            siteId: a.siteId,
            siteName: a.siteName,
            checkInTime: a.checkInTime,
            checkOutTime: a.checkOutTime,
            checkInLocation: a.checkInLocation,
            checkOutLocation: a.checkOutLocation,
            checkInScore: a.checkInScore,
            checkOutScore: a.checkOutScore,
            withinGeofence: a.withinGeofence,
            ppeCompliant: a.ppeCompliant,
          })),
          deviceTimestamp: Date.now(),
          integrityToken: integrity.token,
          deviceRecognition: integrity.deviceRecognition,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return response;
    }, { maxAttempts: 3, baseDelayMs: 2000 });

    await markSynced('users', unsyncedUsers.map(u => u.id));
    await markSynced('logs', unsyncedLogs.map(l => l.id));
    if (unsyncedAttendance.length > 0) {
      const allAttendance = await getAttendanceRecords();
      const syncedIds = new Set(unsyncedAttendance.map(a => a.id));
      const updated = allAttendance.map(a =>
        syncedIds.has(a.id) ? { ...a, synced: true } : a,
      );
      await AsyncStorage.setItem('@faceauth_attendance', JSON.stringify(updated));
    }
    await updateSyncConfig({ lastSyncTime: Date.now() });
    return {
      success: true,
      usersSynced: unsyncedUsers.length,
      logsSynced: unsyncedLogs.length,
      attendanceSynced: unsyncedAttendance.length,
    };
  } catch (e: any) {
    return {
      success: false,
      usersSynced: 0,
      logsSynced: 0,
      attendanceSynced: 0,
      error: e.message || 'Sync failed',
    };
  }
}

export async function syncAndPurge(): Promise<{
  syncResult: Awaited<ReturnType<typeof syncToServer>>;
  purgeResult?: { usersRemoved: number; logsRemoved: number };
}> {
  const syncResult = await syncToServer();
  if (syncResult.success && (syncResult.usersSynced > 0 || syncResult.logsSynced > 0)) {
    const purgeResult = await purgesynced();
    return { syncResult, purgeResult };
  }
  return { syncResult };
}
