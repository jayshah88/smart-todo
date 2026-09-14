// In development the Vite dev-server proxies /api to the backend.
// In production set VITE_API_URL to the API base URL (e.g. https://api.example.com/api).
// When unset (or empty), the app calls /api on its own origin.
const rawBase = import.meta.env.VITE_API_URL?.trim();
const API_BASE = rawBase ? rawBase.replace(/\/+$/, '') : '/api';

let authToken: string | null = localStorage.getItem('token');

export function setToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiBaseUrl(): string {
  return API_BASE;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    let errors: Record<string, string[]> | undefined;

    try {
      const body = await response.json();
      message = body.message ?? message;
      errors = body.errors;
    } catch {
      // keep default message for non-JSON errors (network/HTML)
    }

    if (response.status === 401) {
      setToken(null);
    }

    throw new ApiError(response.status, message, errors);
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string, data?: unknown) => request<T>(path, { method: 'DELETE', body: JSON.stringify(data ?? {}) }),
};
