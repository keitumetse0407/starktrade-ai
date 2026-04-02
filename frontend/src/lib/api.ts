const API_BASE = '/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; full_name?: string }) =>
      fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => fetchAPI('/auth/me'),
  },
  portfolio: {
    list: () => fetchAPI('/portfolio/'),
    get: (id: string) => fetchAPI(`/portfolio/${id}`),
  },
  trades: {
    list: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
      return fetchAPI(`/trades/${qs}`);
    },
    create: (data: any) => fetchAPI('/trades/', { method: 'POST', body: JSON.stringify(data) }),
  },
  agents: {
    list: () => fetchAPI('/agents/'),
    decisions: (id: string) => fetchAPI(`/agents/${id}/decisions`),
  },
  predictions: {
    markets: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
      return fetchAPI(`/predictions/markets${qs}`);
    },
    trade: (data: any) => fetchAPI('/predictions/trade', { method: 'POST', body: JSON.stringify(data) }),
  },
  market: {
    pulse: () => fetchAPI('/market/pulse'),
    ohlcv: (symbol: string, timeframe: string) =>
      fetchAPI(`/market/ohlcv?symbol=${symbol}&timeframe=${timeframe}`),
    search: (q: string) => fetchAPI(`/market/search?q=${q}`),
  },
};
