'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org';

export default function DashboardPage() {
  const router = useRouter();
  const [trades, setTrades] = useState([]);
  const [agents, setAgents] = useState([]);
  const [pulse, setPulse] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth'); return; }
    fetchAll(token);
  }, []);

  async function fetchAll(token: string) {
    const h = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const [meRes, tradesRes, agentsRes, pulseRes] = await Promise.all([
        fetch(`${API}/api/v1/auth/me`, { headers: h }),
        fetch(`${API}/api/v1/trades/`, { headers: h }),
        fetch(`${API}/api/v1/agents/`, { headers: h }),
        fetch(`${API}/api/v1/market/pulse`),
      ]);
      if (meRes.status === 401) { router.push('/auth'); return; }
      if (meRes.ok) setUser(await meRes.json());
      if (tradesRes.ok) setTrades(await tradesRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (pulseRes.ok) setPulse(await pulseRes.json());
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>Loading StarkTrade AI...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>StarkTrade AI</h1>
          {user && <span style={{ color: '#666' }}>{user.email} · {user.role}</span>}
        </div>

        {/* Market Pulse */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(pulse).map(([k, v]: any) => (
            <div key={k} style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.25rem' }}>{k}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>${v.price?.toLocaleString()}</div>
              <div style={{ color: v.change_pct >= 0 ? '#22c55e' : '#ef4444', fontSize: '0.875rem' }}>{v.change_pct >= 0 ? '+' : ''}{v.change_pct?.toFixed(2)}%</div>
            </div>
          ))}
        </div>

        {/* Agents */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>AI Agents ({agents.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {agents.map((a: any) => (
            <div key={a.id} style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ fontWeight: 'bold' }}>{a.name}</div>
              <div style={{ color: '#666', fontSize: '0.75rem' }}>{a.persona}</div>
              <div style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.125rem 0.5rem', backgroundColor: a.status === 'idle' ? '#1a1a2e' : '#0d2e1a', color: a.status === 'idle' ? '#4488ff' : '#22c55e', borderRadius: '999px', fontSize: '0.75rem' }}>{a.status}</div>
            </div>
          ))}
        </div>

        {/* Trades */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Trades</h2>
        {trades.length === 0 ? (
          <div style={{ padding: '2rem', border: '2px dashed #222', borderRadius: '0.75rem', textAlign: 'center', color: '#444' }}>No trades yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {(trades as any[]).map((t: any) => (
              <div key={t.id} style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '0.75rem', padding: '1rem' }}>
                <span style={{ fontWeight: 'bold' }}>{t.symbol}</span> · ${t.entry_price} · <span style={{ color: t.status === 'open' ? '#22c55e' : '#666' }}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
