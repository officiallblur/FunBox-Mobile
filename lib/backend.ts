const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL?.trim() ?? '';

export function getBackendBaseUrl() {
  return BACKEND_BASE_URL.replace(/\/+$/, '');
}

export function isBackendConfigured() {
  return Boolean(getBackendBaseUrl());
}

export function buildBackendUrl(path: string, query?: Record<string, string | number | undefined | null>) {
  const base = getBackendBaseUrl();
  if (!base) {
    throw new Error('EXPO_PUBLIC_BACKEND_BASE_URL is not configured.');
  }

  const safePath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${safePath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function fetchBackendJson<T>(
  path: string,
  options?: RequestInit,
  query?: Record<string, string | number | undefined | null>
): Promise<T> {
  const response = await fetch(buildBackendUrl(path, query), options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = json?.error || json?.message || `Backend request failed (${response.status})`;
    throw new Error(message);
  }
  return json as T;
}
