import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_CONFIG_KEY = '@faceauth_sync_config';
const FALLBACK_BASE_URL = 'http://10.0.2.2:5000'; // Android emulator → localhost

/**
 * Derives backend base URL from the stored sync config.
 * e.g. "https://your-server.com/api/sync" → "https://your-server.com"
 * Falls back to localhost for local dev.
 */
async function getBaseUrl(): Promise<string> {
  try {
    const data = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
    if (data) {
      const config = JSON.parse(data);
      const url = new URL(config.serverUrl);
      return `${url.protocol}//${url.host}`;
    }
  } catch (_) {}
  return FALLBACK_BASE_URL;
}

export interface UploadDPResult {
  success: boolean;
  profilePhotoUrl?: string;
  message?: string;
}

/**
 * Uploads a profile photo (DP) for a user to Cloudinary via backend.
 * @param userId  - EnrolledUser.id (used as appId on backend)
 * @param imageUri - local file URI from image picker
 * @param mimeType - e.g. 'image/jpeg'
 * @param fileName - e.g. 'photo.jpg'
 */
export async function uploadUserDP(
  userId: string,
  imageUri: string,
  mimeType: string = 'image/jpeg',
  fileName: string = 'photo.jpg',
): Promise<UploadDPResult> {
  try {
    const baseUrl = await getBaseUrl();
    const url = `${baseUrl}/api/upload/dp/${userId}`;

    const formData = new FormData();
    formData.append('photo', {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type manually — fetch sets it with boundary for multipart
    });

    const json = await response.json();
    return json;
  } catch (error: any) {
    return { success: false, message: error.message || 'Upload failed' };
  }
}

/**
 * Fetches the DP URL for a user from the backend.
 */
export async function fetchUserDP(userId: string): Promise<string | null> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/api/upload/dp/${userId}`);
    const json = await response.json();
    return json.success ? json.profilePhotoUrl : null;
  } catch (_) {
    return null;
  }
}
