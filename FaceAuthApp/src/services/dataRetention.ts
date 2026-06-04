import AsyncStorage from '@react-native-async-storage/async-storage';

const RETENTION_CONFIG_KEY = '@faceauth_retention_config';
const LAST_CLEANUP_KEY = '@faceauth_last_cleanup';

export interface RetentionConfig {
  syncedRecordRetentionDays: number;
  maxUnsyncedRecords: number;
  autoCleanupEnabled: boolean;
}

const DEFAULT_CONFIG: RetentionConfig = {
  syncedRecordRetentionDays: 7,
  maxUnsyncedRecords: 5000,
  autoCleanupEnabled: true,
};

export async function getRetentionConfig(): Promise<RetentionConfig> {
  const raw = await AsyncStorage.getItem(RETENTION_CONFIG_KEY);
  return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
}

export async function updateRetentionConfig(config: Partial<RetentionConfig>): Promise<void> {
  const current = await getRetentionConfig();
  await AsyncStorage.setItem(RETENTION_CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

export async function performCleanup(): Promise<{
  logsRemoved: number;
  attendanceRemoved: number;
}> {
  const config = await getRetentionConfig();
  if (!config.autoCleanupEnabled) return { logsRemoved: 0, attendanceRemoved: 0 };

  const cutoffTime = Date.now() - config.syncedRecordRetentionDays * 24 * 60 * 60 * 1000;
  let logsRemoved = 0;
  let attendanceRemoved = 0;

  // Clean auth logs
  const logsRaw = await AsyncStorage.getItem('@faceauth_logs');
  if (logsRaw) {
    const logs = JSON.parse(logsRaw);
    const filtered = logs.filter((l: any) => {
      if (l.synced && l.timestamp < cutoffTime) {
        logsRemoved++;
        return false;
      }
      return true;
    });
    await AsyncStorage.setItem('@faceauth_logs', JSON.stringify(filtered));
  }

  // Clean attendance records
  const attendanceRaw = await AsyncStorage.getItem('@faceauth_attendance');
  if (attendanceRaw) {
    const records = JSON.parse(attendanceRaw);
    const filtered = records.filter((r: any) => {
      if (r.synced && r.checkInTime < cutoffTime) {
        attendanceRemoved++;
        return false;
      }
      return true;
    });
    await AsyncStorage.setItem('@faceauth_attendance', JSON.stringify(filtered));
  }

  await AsyncStorage.setItem(LAST_CLEANUP_KEY, Date.now().toString());
  return { logsRemoved, attendanceRemoved };
}

export async function shouldRunCleanup(): Promise<boolean> {
  const last = await AsyncStorage.getItem(LAST_CLEANUP_KEY);
  if (!last) return true;
  // Run cleanup at most once per day
  return Date.now() - Number(last) > 24 * 60 * 60 * 1000;
}

export async function getStorageStats(): Promise<{
  totalUsers: number;
  totalLogs: number;
  totalAttendance: number;
  syncedLogs: number;
  syncedAttendance: number;
  estimatedSizeKB: number;
}> {
  const usersRaw = await AsyncStorage.getItem('@faceauth_users');
  const logsRaw = await AsyncStorage.getItem('@faceauth_logs');
  const attendanceRaw = await AsyncStorage.getItem('@faceauth_attendance');

  const users = usersRaw ? JSON.parse(usersRaw) : [];
  const logs = logsRaw ? JSON.parse(logsRaw) : [];
  const attendance = attendanceRaw ? JSON.parse(attendanceRaw) : [];

  const totalSize = (usersRaw?.length || 0) + (logsRaw?.length || 0) + (attendanceRaw?.length || 0);

  return {
    totalUsers: users.length,
    totalLogs: logs.length,
    totalAttendance: attendance.length,
    syncedLogs: logs.filter((l: any) => l.synced).length,
    syncedAttendance: attendance.filter((a: any) => a.synced).length,
    estimatedSizeKB: Math.round(totalSize / 1024),
  };
}
