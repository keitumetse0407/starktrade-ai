// API helper - uses Vercel rewrite proxy to avoid mixed content issues
// All /api/* requests are proxied by Vercel to the backend at 185.167.97.193:8000

export async function apiFetch(path: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  return fetch(path, {
    ...options,
    headers,
  });
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
}
