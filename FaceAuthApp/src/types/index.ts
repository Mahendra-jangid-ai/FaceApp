export interface AssignedLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number;   // Admin sets this: 50, 100, 200, or 500m
  label: string;          // e.g. "NHAI Highway Site 4A" or custom name
}

export interface EnrolledUser {
  id: string;
  name: string;
  employeeId: string;
  aadhar?: string;
  embedding: number[];
  bioHash?: string;
  bioHashSalt?: string;
  photoUri: string;
  profilePhotoUrl?: string | null; // Cloudinary DP URL
  createdAt: number;
  synced: boolean;
  role: 'admin' | 'worker';
  siteId?: string;
  privacyEpsilon?: number;
  assignedLocation?: AssignedLocation; // Per-worker work location boundary
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

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  website?: string;
  industry: string;
  organization_type: string;
  worker_range: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  contact_person: string;
  contact_role: string;
  logo?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RootStackParamList = {
  OrgAuth: undefined;
  Onboarding: undefined;
  OrganizationAdmin: undefined;
  AddOrganization: undefined;
  SetPassword: { orgName: string };
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
  LocationPicker: {
    workerName: string;
    onConfirm: (location: AssignedLocation) => void;
  };
};

