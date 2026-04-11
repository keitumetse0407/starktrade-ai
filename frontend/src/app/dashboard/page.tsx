'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    try {
      const res = await fetch('https://starktrade-ai.duckdns.org/api/collections/trades/records');
      const data = await res.json();
      setTrades(data.items || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function addTrade() {
    try {
      await fetch('https://starktrade-ai.duckdns.org/api/collections/trades/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'ETH/USD',
          type: 'long',
          entry: 2500,
          status: 'open'
        })
      });
      fetchTrades();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: 'white', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Dashboard</h1>
          <button onClick={addTrade} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#0066ff', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
            Add Test Trade
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {trades.length === 0 ? (
            <div style={{ padding: '2rem', border: '2px dashed #333', borderRadius: '0.5rem', textAlign: 'center', color: '#666' }}>
              No trades yet. Click "Add Test Trade" to create one.
            </div>
          ) : (
            trades.map((trade: any) => (
              <div key={trade.id} style={{ padding: '1.5rem', backgroundColor: '#111', border: '1px solid #333', borderRadius: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{trade.symbol}</h3>
                <p style={{ color: '#999', fontSize: '0.875rem' }}>Entry: ${trade.entry}</p>
                <p style={{ color: '#999', fontSize: '0.875rem' }}>Status: {trade.status}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
