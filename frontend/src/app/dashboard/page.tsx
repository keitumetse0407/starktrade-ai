'use client';

import { useEffect } from 'react';
import { useTradesStore } from '@/lib/trades-store';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();
  const { trades, isLoading, fetchTrades, addTrade, closeTrade, removeTrade, subscribeRealtime } = useTradesStore();

  useEffect(() => {
    checkAuth();
    if (!user) {
      router.push('/login'); // <-- REDIRECT TO NEW LOGIN PAGE
    } else {
      fetchTrades();
      subscribeRealtime();
    }
  }, [user, checkAuth, fetchTrades, subscribeRealtime, router]);

  const handleAddTrade = async () => {
    await addTrade({
      symbol: 'ETH/USD',
      type: 'long',
      entry: 2500,
      status: 'open',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-gray-400 mt-2">Welcome, {user.email}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleAddTrade} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
              Add Test Trade
            </button>
            <button onClick={() => { logout(); router.push('/login'); }} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg">
              Logout
            </button>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-2xl mb-4">Trades</h2>
          {isLoading && <p>Loading trades...</p>}
          <div className="grid gap-4">
            {trades.map((trade) => (
              <div key={trade.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                <h3 className="font-bold">{trade.symbol}</h3>
                <p>Entry: ${trade.entry}</p>
                <p>Status: {trade.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
