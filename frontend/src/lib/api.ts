const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

// Exponential backoff retry
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
      if (res.ok || res.status !== 503) return res;
    } catch (e) {
      // Network error - continue to retry
    }
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i))); // 1s, 2s, 4s
    }
  }
  // Last attempt
  return fetch(url, options);
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const url = path.startsWith('http') ? path : `${API_BASE}/api/v1${path}`;

  const res = await fetchWithRetry(url, { ...options, headers });

  if (res.status === 503) {
    // Service unavailable - try direct fallback
    const fallbackUrl = `${API_BASE.replace('starktrade-ai.duckdns.org', 'starktrade-ai.duckdns.org:8000')}${path}`;
    const fallbackRes = await fetchWithRetry(fallbackUrl, { ...options, headers });
    if (fallbackRes.ok) return fallbackRes;
    
    throw new Error('Trading system temporarily unavailable. Please try again in a few moments.');
  }

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
  // Direct fetch without auth for market data
  try {
    const res = await fetch(`${API_BASE}/api/v1/market/pulse`);
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('Market pulse unavailable:', e);
  }
  return {};
}

export async function getTrades() {
  const res = await apiFetch('/trades/');
  if (!res.ok) return [];
  return res.json();
}

export async function getPortfolios() {
  const res = await apiFetch('/portfolio/');
  if (!res.ok) return [];
  return res.json();
}

export async function getSignals() {
  const res = await apiFetch('/signals/');
  if (!res.ok) return [];
  return res.json();
}

export async function getPredictions() {
  const res = await apiFetch('/predictions/markets');
  if (!res.ok) return [];
  return res.json();
}

export async function getAgentDecisions(agentId: string) {
  const res = await apiFetch(`/agents/${agentId}/decisions`);
  if (!res.ok) return [];
  return res.json();
}
