import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEnrolledUsers, saveUser, deleteUser, getAuthLogs, saveAuthLog, purgesynced } from '../src/services/database';
import type { EnrolledUser, AuthLog } from '../src/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

const mockUser: EnrolledUser = {
  id: 'test-1',
  name: 'Test User',
  employeeId: 'EMP-001',
  embedding: Array(128).fill(0.1),
  photoUri: 'file:///test.jpg',
  createdAt: Date.now(),
  synced: false,
};

const mockLog: AuthLog = {
  id: 'log-1',
  userId: 'test-1',
  userName: 'Test User',
  timestamp: Date.now(),
  livenessPassed: true,
  matchScore: 0.85,
  authenticated: true,
  synced: false,
  latitude: null,
  longitude: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getEnrolledUsers', () => {
  it('returns empty array when no data', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const users = await getEnrolledUsers();
    expect(users).toEqual([]);
  });

  it('returns stored users', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockUser]));
    const users = await getEnrolledUsers();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Test User');
  });
});

describe('saveUser', () => {
  it('appends user to existing list', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    await saveUser(mockUser);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@faceauth_users',
      expect.stringContaining('Test User'),
    );
  });
});

describe('deleteUser', () => {
  it('removes user by id', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockUser]));
    await deleteUser('test-1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@faceauth_users', '[]');
  });
});

describe('saveAuthLog', () => {
  it('prepends log entry', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
    await saveAuthLog(mockLog);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@faceauth_logs',
      expect.stringContaining('log-1'),
    );
  });
});

describe('purgesynced', () => {
  it('removes synced records and keeps unsynced', async () => {
    const syncedUser = { ...mockUser, id: 'synced-1', synced: true };
    const unsyncedUser = { ...mockUser, id: 'unsynced-1', synced: false };
    const syncedLog = { ...mockLog, id: 'slog-1', synced: true };
    const unsyncedLog = { ...mockLog, id: 'ulog-1', synced: false };

    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify([syncedUser, unsyncedUser]))
      .mockResolvedValueOnce(JSON.stringify([syncedLog, unsyncedLog]));

    const result = await purgesynced();
    expect(result.usersRemoved).toBe(1);
    expect(result.logsRemoved).toBe(1);
  });
});
