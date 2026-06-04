import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import type { WorkSite } from '../types';

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

function haversineDistance(
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

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return null;
    }
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), 8000);
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(timeout);
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {
          clearTimeout(timeout);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 },
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
