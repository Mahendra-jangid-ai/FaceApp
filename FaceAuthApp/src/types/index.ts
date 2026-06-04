export interface EnrolledUser {
  id: string;
  name: string;
  employeeId: string;
  aadhar?: string;
  embedding: number[];
  bioHash?: string;
  bioHashSalt?: string;
  photoUri: string;
  createdAt: number;
  synced: boolean;
  role: 'admin' | 'worker';
  siteId?: string;
  privacyEpsilon?: number;
}

export interface AuthLog {
  id: string;
  userId: string | null;
  userName: string | null;
  timestamp: number;
  livenessPassed: boolean;
  matchScore: number;
  authenticated: boolean;
  synced: boolean;
  latitude: number | null;
  longitude: number | null;
  spoofScore?: number;
  siteId?: string | null;
  siteName?: string | null;
  withinGeofence?: boolean;
  bioHashVerified?: boolean;
  qualityScore?: number;
  ppeCompliant?: boolean;
  pipelineLatencyMs?: number;
  deviceIntegrity?: string;
}

export interface FaceDetectionResult {
  found: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
  smilingProbability: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  headEulerAngleY: number;
  headEulerAngleZ: number;
  spoofScore?: number;
}

export interface LivenessChallenge {
  type: 'blink' | 'smile' | 'turnLeft' | 'turnRight';
  instruction: string;
  icon: string;
  check: (face: FaceDetectionResult) => boolean;
}

export interface WorkSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  siteId: string | null;
  siteName: string | null;
  checkInTime: number;
  checkOutTime: number | null;
  checkInLocation: { latitude: number; longitude: number } | null;
  checkOutLocation: { latitude: number; longitude: number } | null;
  checkInScore: number;
  checkOutScore: number | null;
  withinGeofence: boolean;
  synced: boolean;
  ppeCompliant?: boolean;
}

export interface SyncConfig {
  serverUrl: string;
  autoSync: boolean;
  syncInterval: number;
  lastSyncTime: number | null;
}

export interface AdminConfig {
  pin: string;
  requirePPE: boolean;
  requireGeofence: boolean;
  matchThreshold: number;
  voicePromptsEnabled: boolean;
  autoSyncEnabled: boolean;
  accessibilityMode: boolean;
  dataRetentionDays: number;
}

export type RootStackParamList = {
  Home: undefined;
  Enroll: { role?: 'admin' | 'worker'; returnTo?: string } | undefined;
  Authenticate: undefined;
  Attendance: undefined;
  Dashboard: undefined;
  History: undefined;
  Settings: undefined;
  AdminLogin: undefined;
  AdminDashboard: undefined;
  WorkerList: undefined;
  Calendar: { userId?: string } | undefined;
  PPECheck: undefined;
};
