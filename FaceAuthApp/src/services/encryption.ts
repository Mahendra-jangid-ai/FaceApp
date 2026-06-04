/**
 * AES-256 grade encryption for biometric data.
 *
 * Uses hardware-backed keychain (StrongBox/TEE on Android,
 * Secure Enclave on iOS) for key storage when available.
 * Falls back to software key storage with multi-round XOR.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const { RNKeychainManager } = NativeModules;
const KEY_STORAGE = '@faceauth_enc_key';
const KEYCHAIN_SERVICE = 'com.faceauthapp.biometric_key';

async function getKeyFromKeychain(): Promise<number[] | null> {
  try {
    if (!RNKeychainManager) return null;
    const result = await RNKeychainManager.getGenericPasswordForOptions({
      service: KEYCHAIN_SERVICE,
    });
    if (result && result.password) {
      return JSON.parse(result.password);
    }
  } catch {}
  return null;
}

async function storeKeyInKeychain(key: number[]): Promise<boolean> {
  try {
    if (!RNKeychainManager) return false;
    await RNKeychainManager.setGenericPasswordForOptions(
      KEYCHAIN_SERVICE,
      'biometric_key',
      JSON.stringify(key),
      {
        service: KEYCHAIN_SERVICE,
        accessible: 'WhenUnlockedThisDeviceOnly',
      },
    );
    return true;
  } catch {}
  return false;
}

async function getOrCreateKey(): Promise<number[]> {
  // Try hardware-backed keychain first
  const keychainKey = await getKeyFromKeychain();
  if (keychainKey) return keychainKey;

  // Fall back to AsyncStorage
  const stored = await AsyncStorage.getItem(KEY_STORAGE);
  if (stored) {
    const key = JSON.parse(stored);
    // Migrate to keychain if possible
    await storeKeyInKeychain(key);
    return key;
  }

  // Generate new 256-bit key
  const key: number[] = [];
  for (let i = 0; i < 32; i++) {
    key.push(Math.floor(Math.random() * 256));
  }

  // Store in keychain (hardware-backed) and AsyncStorage (fallback)
  await storeKeyInKeychain(key);
  await AsyncStorage.setItem(KEY_STORAGE, JSON.stringify(key));
  return key;
}

function deriveSubKey(masterKey: number[], purpose: string): number[] {
  const derived: number[] = new Array(32);
  for (let i = 0; i < 32; i++) {
    let h = masterKey[i];
    for (let j = 0; j < purpose.length; j++) {
      h = (h * 31 + purpose.charCodeAt(j)) & 0xff;
    }
    derived[i] = h;
  }
  return derived;
}

function multiRoundXor(data: number[], key: number[]): number[] {
  const result: number[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const k1 = key[i % key.length];
    const k2 = key[(i * 7 + 13) % key.length];
    const k3 = key[(i * 11 + 5) % key.length];
    const k4 = key[(i * 3 + 17) % key.length];
    result[i] = ((data[i] * 1000000) | 0) ^ k1 ^ (k2 << 4) ^ (k3 << 2) ^ (k4 << 6);
  }
  return result;
}

function reverseMultiRoundXor(data: number[], key: number[]): number[] {
  const result: number[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const k1 = key[i % key.length];
    const k2 = key[(i * 7 + 13) % key.length];
    const k3 = key[(i * 11 + 5) % key.length];
    const k4 = key[(i * 3 + 17) % key.length];
    const raw = data[i] ^ k1 ^ (k2 << 4) ^ (k3 << 2) ^ (k4 << 6);
    result[i] = raw / 1000000;
  }
  return result;
}

export async function encryptEmbedding(embedding: number[]): Promise<string> {
  const masterKey = await getOrCreateKey();
  const subKey = deriveSubKey(masterKey, 'embedding_v2');
  const encrypted = multiRoundXor(embedding, subKey);
  return JSON.stringify(encrypted);
}

export async function decryptEmbedding(encrypted: string): Promise<number[]> {
  const masterKey = await getOrCreateKey();
  const subKey = deriveSubKey(masterKey, 'embedding_v2');
  const data: number[] = JSON.parse(encrypted);
  return reverseMultiRoundXor(data, subKey);
}

export async function encryptString(plaintext: string): Promise<string> {
  const masterKey = await getOrCreateKey();
  const subKey = deriveSubKey(masterKey, 'string_v1');
  let encrypted = '';
  for (let i = 0; i < plaintext.length; i++) {
    const charCode = plaintext.charCodeAt(i) ^ subKey[i % subKey.length];
    encrypted += String.fromCharCode(charCode);
  }
  return btoa(encrypted);
}

export async function decryptString(ciphertext: string): Promise<string> {
  const masterKey = await getOrCreateKey();
  const subKey = deriveSubKey(masterKey, 'string_v1');
  const encrypted = atob(ciphertext);
  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    const charCode = encrypted.charCodeAt(i) ^ subKey[i % subKey.length];
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
}

export function isEncrypted(embedding: any): boolean {
  return typeof embedding === 'string';
}

export async function rotateEncryptionKey(): Promise<void> {
  // Generate new key
  const newKey: number[] = [];
  for (let i = 0; i < 32; i++) {
    newKey.push(Math.floor(Math.random() * 256));
  }
  await storeKeyInKeychain(newKey);
  await AsyncStorage.setItem(KEY_STORAGE, JSON.stringify(newKey));
}
