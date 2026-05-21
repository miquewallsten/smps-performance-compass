const API_BASE = import.meta.env.VITE_API_URL || '';

let token: string | null = localStorage.getItem('smps_token');

export function setToken(t: string | null) {
  token = t;
  if (t) {
    localStorage.setItem('smps_token', t);
  } else {
    localStorage.removeItem('smps_token');
  }
}

export function getToken(): string | null {
  return token;
}

/**
 * Convert snake_case keys to camelCase and convert 0/1 integers to booleans
 * for known boolean fields. Recursively processes nested objects and arrays.
 */
function toCamelCase(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(toCamelCase);
  if (typeof value !== 'object') return value;

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // Known boolean fields that should be converted from 0/1 to true/false
  const booleanFields = new Set([
    'isAdmin', 'isSuperUser', 'isManagingPartner', 'isActive', 'mustChangePassword',
    'evaluations', 'communications', 'vacations',
    'notApplicable', 'noElements', 'feedbackCompleted', 'archived', 'hidden',
  ]);

  for (const [key, val] of Object.entries(obj)) {
    // Convert snake_case key to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Convert known boolean fields from 0/1 to true/false
    if (booleanFields.has(camelKey) && typeof val === 'number') {
      result[camelKey] = val !== 0;
    } else {
      result[camelKey] = toCamelCase(val);
    }
  }

  return result;
}

// Track if we're already redirecting to prevent loops
let isRedirectingToLogin = false;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error('Network error - is the server running?', err);
    throw new Error('Cannot connect to server. Please try again later.');
  }

  if (response.status === 401) {
    setToken(null);
    // Prevent redirect loops - only redirect once
    if (!isRedirectingToLogin) {
      isRedirectingToLogin = true;
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  isRedirectingToLogin = false;
  const raw = await response.json();
  return toCamelCase(raw) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
