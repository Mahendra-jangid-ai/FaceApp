import type { Organization } from '../types';

/**
 * BASE_URL rules:
 *  - Android Emulator  → 10.0.2.2  (maps to PC localhost)
 *  - Real Android device → your PC's LAN IP, e.g. 192.168.1.x
 *  - iOS Simulator     → 127.0.0.1
 *
 * Change only this one constant when switching environments.
 */
const BASE_URL = 'http://10.75.234.111:8080/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch (networkErr: any) {
    // No connection at all (server not running, wrong IP, etc.)
    throw new Error(
      'Cannot reach the server. Make sure the backend is running and the IP is correct.',
    );
  }

  // Read body as text first — so we never crash on a non-JSON response
  const text = await res.text();

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Server returned non-JSON (HTML error page, plain-text, etc.)
    throw new Error(
      `Server returned an unexpected response (HTTP ${res.status}). ` +
        `Expected JSON but got: ${text.slice(0, 120)}`,
    );
  }

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }

  return data as T;
}

// ─── Organization APIs ────────────────────────────────────────────────────────

export interface CreateOrgPayload {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export async function createOrganization(
  payload: CreateOrgPayload,
): Promise<{ message: string; organization: Organization }> {
  return request('/organizations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getOrganizations(): Promise<{
  organizations: Organization[];
  total: number;
}> {
  return request('/organizations');
}
