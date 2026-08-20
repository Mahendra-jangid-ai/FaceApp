import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import type { WorkSite, AssignedLocation } from '../types';

// React Native provides navigator.geolocation at runtime
declare const navigator: {
  geolocation: {
    getCurrentPosition: (
      success: (pos: { coords: { latitude: number; longitude: number } }) => void,
      error: (err: any) => void,
      options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
    ) => void;
  };
};

const SITES_KEY = '@faceauth_worksites';

export async function getWorkSites(): Promise<WorkSite[]> {
  const data = await AsyncStorage.getItem(SITES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveWorkSite(site: WorkSite): Promise<void> {
  const sites = await getWorkSites();
  sites.push(site);
  await AsyncStorage.setItem(SITES_KEY, JSON.stringify(sites));
}

export async function deleteWorkSite(id: string): Promise<void> {
  const sites = await getWorkSites();
  await AsyncStorage.setItem(SITES_KEY, JSON.stringify(sites.filter(s => s.id !== id)));
}

/** Haversine distance in meters between two GPS coordinates */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns a compass direction from origin → target
 * e.g. "North-East", "South", "West"
 */
export function getCompassDirection(
  fromLat: number, fromLon: number,
  toLat: number, toLon: number,
): string {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;

  let angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  if (angle < 22.5 || angle >= 337.5)  return 'North';
  if (angle < 67.5)                     return 'North-East';
  if (angle < 112.5)                    return 'East';
  if (angle < 157.5)                    return 'South-East';
  if (angle < 202.5)                    return 'South';
  if (angle < 247.5)                    return 'South-West';
  if (angle < 292.5)                    return 'West';
  return 'North-West';
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission Required',
        message: 'FaceAuth needs your location to verify you are at your assigned work site.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // iOS handles permissions via Info.plist
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), 10000);
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(timeout);
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {
          clearTimeout(timeout);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 10000 },
      );
    });
  } catch {
    return null;
  }
}

export interface GeofenceCheck {
  withinGeofence: boolean;
  nearestSite: WorkSite | null;
  distanceMeters: number | null;
  location: { latitude: number; longitude: number } | null;
}

/** Check against global work sites (used for general site geofencing) */
export async function checkGeofence(): Promise<GeofenceCheck> {
  const location = await getCurrentLocation();
  if (!location) {
    return { withinGeofence: false, nearestSite: null, distanceMeters: null, location: null };
  }

  const sites = await getWorkSites();
  if (sites.length === 0) {
    return { withinGeofence: true, nearestSite: null, distanceMeters: null, location };
  }

  let nearest: WorkSite | null = null;
  let minDist = Infinity;

  for (const site of sites) {
    const dist = haversineDistance(location.latitude, location.longitude, site.latitude, site.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = site;
    }
  }

  const withinGeofence = nearest ? minDist <= nearest.radiusMeters : false;

  return {
    withinGeofence,
    nearestSite: nearest,
    distanceMeters: Math.round(minDist),
    location,
  };
}

export interface WorkerGeofenceResult {
  /** Whether the GPS fix was successful */
  gpsAcquired: boolean;
  /** True if worker is within their assignedLocation radius */
  withinZone: boolean;
  /** Distance in meters from assigned location */
  distanceMeters: number;
  /** Compass direction the worker should move toward to enter zone */
  directionToZone: string;
  /** Worker's current GPS coordinates */
  workerLocation: { latitude: number; longitude: number } | null;
  /** The assigned location used for the check */
  assignedLocation: AssignedLocation;
}

/**
 * Per-worker location check: verifies the worker is within their
 * personally assigned work location radius (set during enrollment).
 *
 * @param assignedLocation - The worker's assigned location from EnrolledUser.assignedLocation
 */
export async function checkWorkerAssignedLocation(
  assignedLocation: AssignedLocation,
): Promise<WorkerGeofenceResult> {
  const location = await getCurrentLocation();

  if (!location) {
    return {
      gpsAcquired: false,
      withinZone: false,
      distanceMeters: Infinity,
      directionToZone: '—',
      workerLocation: null,
      assignedLocation,
    };
  }

  const distance = haversineDistance(
    location.latitude, location.longitude,
    assignedLocation.latitude, assignedLocation.longitude,
  );

  const direction = getCompassDirection(
    location.latitude, location.longitude,
    assignedLocation.latitude, assignedLocation.longitude,
  );

  return {
    gpsAcquired: true,
    withinZone: distance <= assignedLocation.radiusMeters,
    distanceMeters: Math.round(distance),
    directionToZone: direction,
    workerLocation: location,
    assignedLocation,
  };
}
