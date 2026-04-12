const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const url = path.startsWith('http') ? path : `${API_BASE}/api/v1${path}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/auth';
    }
  }

  return res;
}

export function getAuthToken() {
  return getToken();
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
}

export async function getCurrentUser() {
  const res = await apiFetch('/auth/me');
  if (!res.ok) return null;
  return res.json();
}

export async function getAgents() {
  const res = await apiFetch('/agents/');
  if (!res.ok) return [];
  return res.json();
}

export async function getMarketPulse() {
  const res = await fetch(`${API_BASE}/api/v1/market/pulse`);
  if (!res.ok) return {};
  return res.json();
}

export async function getPortfolio() {
  const res = await apiFetch('/portfolio/');
  if (!res.ok) return [];
  return res.json();
}

export async function getTrades() {
  const res = await apiFetch('/trades/');
  if (!res.ok) return [];
  return res.json();
}

export async function getSignals() {
  const res = await apiFetch('/signals/');
  if (!res.ok) return [];
  return res.json();
}

export { getToken as getAuthToken2 };
