import type { Organization } from '../types';

/**
 * BASE_URL rules:
 *  - Android Emulator  → 10.0.2.2  (maps to PC localhost)
 *  - Real Android device → your PC's LAN IP, e.g. 192.168.1.x
 *  - iOS Simulator     → 127.0.0.1
 */
const BASE_URL = 'http://10.75.234.111:8080/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running and the IP is correct.');
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned an unexpected response (HTTP ${res.status}). Got: ${text.slice(0, 120)}`,
    );
  }

  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

// ─── Organization APIs ────────────────────────────────────────────────────────

export interface CreateOrgPayload {
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
  country?: string;
  contact_person: string;
  contact_role: string;
}

export async function createOrganization(
  payload: CreateOrgPayload,
): Promise<{ message: string; organization: { id: string; name: string; email: string } }> {
  return request('/organizations', { method: 'POST', body: JSON.stringify(payload) });
}

export async function setOrgPassword(
  orgName: string,
  password: string,
): Promise<{ message: string; token: string; org: { id: string; name: string } }> {
  return request('/organizations/set-password', {
    method: 'POST',
    body: JSON.stringify({ org_name: orgName, password }),
  });
}

export async function orgLogin(
  orgName: string,
  password: string,
): Promise<{ message: string; token: string; org: Record<string, string> }> {
  return request('/organizations/login', {
    method: 'POST',
    body: JSON.stringify({ org_name: orgName, password }),
  });
}

export async function getOrganizations(): Promise<{
  organizations: Organization[];
  total: number;
}> {
  return request('/organizations');
}
