import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@faceauth_session';

export type UserRole = 'admin' | 'worker' | 'none';

export interface Session {
  userId: string;
  userName: string;
  role: UserRole;
  employeeId: string;
  aadhar?: string;
  loginTime: number;
  siteId?: string;
}

let currentSession: Session | null = null;

export async function loadSession(): Promise<Session | null> {
  if (currentSession) return currentSession;
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (raw) {
    currentSession = JSON.parse(raw);
    return currentSession;
  }
  return null;
}

export async function createSession(session: Session): Promise<void> {
  currentSession = session;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  currentSession = null;
  await AsyncStorage.removeItem(SESSION_KEY);
}

export function getSession(): Session | null {
  return currentSession;
}

export function isAdmin(): boolean {
  return currentSession?.role === 'admin';
}

export function isWorker(): boolean {
  return currentSession?.role === 'worker';
}

export function isLoggedIn(): boolean {
  return currentSession !== null;
}

export function roleFromUserId(userId: string): UserRole {
  if (userId.startsWith('admin-')) return 'admin';
  if (userId.startsWith('worker-')) return 'worker';
  return 'none';
}
