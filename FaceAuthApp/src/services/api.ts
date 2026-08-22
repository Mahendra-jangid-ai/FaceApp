import type { Organization } from '../types';

// Change this to your machine's local IP when testing on a real device
// For emulator: 10.0.2.2, for real device: your PC's local IP e.g. 192.168.1.x
const BASE_URL = 'http://10.0.2.2:8080/api/v1';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await res.json();

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
