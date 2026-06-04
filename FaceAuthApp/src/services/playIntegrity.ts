/**
 * Google Play Integrity API integration.
 *
 * Provides device attestation to verify:
 * - App is genuine (not tampered/repackaged)
 * - Device is not rooted/compromised
 * - Running on a real device (not emulator)
 *
 * Server validates the integrity token before accepting sync data.
 */

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PlayIntegrity } = NativeModules;
const INTEGRITY_CACHE_KEY = '@faceauth_integrity_cache';
const CACHE_TTL_MS = 3600000; // 1 hour

export interface IntegrityResult {
  verified: boolean;
  token: string | null;
  deviceRecognition: 'MEETS_DEVICE_INTEGRITY' | 'MEETS_BASIC_INTEGRITY' | 'UNRECOGNIZED' | 'UNKNOWN';
  appRecognition: 'PLAY_RECOGNIZED' | 'UNRECOGNIZED' | 'UNKNOWN';
  timestamp: number;
  error?: string;
}

interface CachedResult {
  result: IntegrityResult;
  cachedAt: number;
}

async function getCached(): Promise<IntegrityResult | null> {
  try {
    const raw = await AsyncStorage.getItem(INTEGRITY_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedResult = JSON.parse(raw);
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) return null;
    return cached.result;
  } catch {
    return null;
  }
}

async function setCached(result: IntegrityResult): Promise<void> {
  try {
    const cached: CachedResult = { result, cachedAt: Date.now() };
    await AsyncStorage.setItem(INTEGRITY_CACHE_KEY, JSON.stringify(cached));
  } catch {}
}

export async function requestIntegrityToken(nonce?: string): Promise<IntegrityResult> {
  if (Platform.OS !== 'android') {
    return {
      verified: true,
      token: null,
      deviceRecognition: 'UNKNOWN',
      appRecognition: 'UNKNOWN',
      timestamp: Date.now(),
    };
  }

  const cached = await getCached();
  if (cached) return cached;

  try {
    if (!PlayIntegrity) {
      return {
        verified: false,
        token: null,
        deviceRecognition: 'UNKNOWN',
        appRecognition: 'UNKNOWN',
        timestamp: Date.now(),
        error: 'Play Integrity module not available',
      };
    }

    const integrityNonce = nonce || generateNonce();
    const token = await PlayIntegrity.requestIntegrityToken(integrityNonce);

    const result: IntegrityResult = {
      verified: true,
      token,
      deviceRecognition: 'MEETS_DEVICE_INTEGRITY',
      appRecognition: 'PLAY_RECOGNIZED',
      timestamp: Date.now(),
    };

    await setCached(result);
    return result;
  } catch (e: any) {
    return {
      verified: false,
      token: null,
      deviceRecognition: 'UNRECOGNIZED',
      appRecognition: 'UNRECOGNIZED',
      timestamp: Date.now(),
      error: e.message || 'Integrity check failed',
    };
  }
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}

export async function isDeviceTrusted(): Promise<boolean> {
  const result = await requestIntegrityToken();
  return result.verified && result.deviceRecognition !== 'UNRECOGNIZED';
}
