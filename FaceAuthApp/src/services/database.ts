import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EnrolledUser, AuthLog, AttendanceRecord } from '../types';

const USERS_KEY = '@faceauth_users';
const LOGS_KEY = '@faceauth_logs';
const ATTENDANCE_KEY = '@faceauth_attendance';

export async function getEnrolledUsers(): Promise<EnrolledUser[]> {
  const data = await AsyncStorage.getItem(USERS_KEY);
  if (!data) return [];
  const users = JSON.parse(data);
  // Backward compat: add role field if missing
  return users.map((u: any) => ({ role: 'worker', ...u }));
}

export async function saveUser(user: EnrolledUser): Promise<void> {
  const users = await getEnrolledUsers();
  users.push(user);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function deleteUser(id: string): Promise<void> {
  const users = await getEnrolledUsers();
  const filtered = users.filter(u => u.id !== id);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(filtered));
}

export async function getAuthLogs(): Promise<AuthLog[]> {
  const data = await AsyncStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveAuthLog(log: AuthLog): Promise<void> {
  const logs = await getAuthLogs();
  logs.unshift(log);
  if (logs.length > 500) logs.length = 500;
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function markSynced(type: 'users' | 'logs', ids: string[]): Promise<void> {
  if (type === 'users') {
    const users = await getEnrolledUsers();
    users.forEach(u => { if (ids.includes(u.id)) u.synced = true; });
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else {
    const logs = await getAuthLogs();
    logs.forEach(l => { if (ids.includes(l.id)) l.synced = true; });
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }
}

export async function purgesynced(): Promise<{ usersRemoved: number; logsRemoved: number }> {
  const users = await getEnrolledUsers();
  const logs = await getAuthLogs();
  const unsyncedUsers = users.filter(u => !u.synced);
  const unsyncedLogs = logs.filter(l => !l.synced);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(unsyncedUsers));
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(unsyncedLogs));
  return {
    usersRemoved: users.length - unsyncedUsers.length,
    logsRemoved: logs.length - unsyncedLogs.length,
  };
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const data = await AsyncStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  const records = await getAttendanceRecords();
  records.unshift(record);
  if (records.length > 1000) records.length = 1000;
  await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
}

export async function updateAttendance(id: string, update: Partial<AttendanceRecord>): Promise<void> {
  const records = await getAttendanceRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...update };
    await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
  }
}

export async function getOpenCheckIn(userId: string): Promise<AttendanceRecord | null> {
  const records = await getAttendanceRecords();
  return records.find(r => r.userId === userId && r.checkOutTime === null) || null;
}

export async function getTodayAttendance(): Promise<AttendanceRecord[]> {
  const records = await getAttendanceRecords();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return records.filter(r => r.checkInTime >= today.getTime());
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.removeItem(USERS_KEY);
  await AsyncStorage.removeItem(LOGS_KEY);
  await AsyncStorage.removeItem(ATTENDANCE_KEY);
}
