// API client with JWT interceptor and auto-refresh
// Access token stored in memory (not localStorage), refresh via httpOnly cookie

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data.data?.accessToken ?? data.accessToken ?? null;
    if (newToken) {
      accessToken = newToken;
    }
    return newToken;
  } catch {
    return null;
  }
}

export async function ensureValidToken(): Promise<string | null> {
  if (accessToken) return accessToken;

  // Deduplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, params } = options;
  const url = buildUrl(`/api/v1${path}`, params);

  const token = await ensureValidToken();

  const reqHeaders: Record<string, string> = {
    ...headers,
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (body && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({}));
        throw new ApiError(retryRes.status, error?.error?.code ?? 'REQUEST_FAILED', error?.error?.message ?? retryRes.statusText);
      }
      return retryRes.json();
    }
    // Refresh failed — redirect to login
    accessToken = null;
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new ApiError(res.status, error?.error?.code ?? 'REQUEST_FAILED', error?.error?.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

// Convenience methods
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

  upload: <T = unknown>(path: string, formData: FormData) =>
    apiFetch<T>(path, { method: 'POST', body: formData }),
};
