// API helper that uses the backend URL from environment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://185.167.97.193:8000';

export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`;
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  return fetch(url, {
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
