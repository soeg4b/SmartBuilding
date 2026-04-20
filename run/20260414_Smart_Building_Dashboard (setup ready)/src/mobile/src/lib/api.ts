import * as SecureStore from 'expo-secure-store';
import { getApiUrl } from '../config/api';

const TOKEN_KEY = 'sb_access_token';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = getApiUrl(path);
  if (!params) return url;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', headers = {}, body, params } = options;
  const url = buildUrl(path, params);

  const token = await getStoredToken();
  const reqHeaders: Record<string, string> = { ...headers };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && token) {
    // Try refresh
    const refreshRes = await fetch(getApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      const newToken: string | undefined =
        refreshData.data?.accessToken ?? refreshData.accessToken;
      if (newToken) {
        await setStoredToken(newToken);
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          const errBody = await retryRes.json().catch(() => null);
          throw new ApiError(retryRes.status, errBody?.error?.message ?? 'Request failed');
        }
        return retryRes.json();
      }
    }
    await removeStoredToken();
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody?.error?.message ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  get: <T = unknown>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiFetch<T>(path, { params }),
  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body }),
  put: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};
