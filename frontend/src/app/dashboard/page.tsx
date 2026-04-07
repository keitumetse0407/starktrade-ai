'use client';

import { useEffect } from 'react';
import { useTradesStore } from '@/lib/trades-store';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const { trades, isLoading, fetchTrades, addTrade, closeTrade, removeTrade, subscribeRealtime } = useTradesStore();

  useEffect(() => {
    checkAuth();
    if (!user) {
      router.push('/');
    } else {
      fetchTrades();
      subscribeRealtime();
    }
  }, [user]);

  const handleAddTrade = async () => {
    await addTrade({
      symbol: 'BTC/USDT',
      type: 'long',
      entry: 45000,
      status: 'open'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading trades...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <button 
            onClick={handleAddTrade}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Add Test Trade
          </button>
        </div>

        <div className="grid gap-6">
          {trades.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-gray-500 mb-4">No trades yet</p>
              <button 
                onClick={handleAddTrade}
                className="text-blue-600 hover:underline"
              >
                Create your first trade
              </button>
            </div>
          ) : (
            trades.map((trade) => (
              <div key={trade.id} className="border rounded-lg p-6 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{trade.symbol}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        Type: <span className="font-medium capitalize">{trade.type}</span>
                      </p>
                      <p className="text-gray-600">
                        Entry: <span className="font-medium">${trade.entry.toLocaleString()}</span>
                      </p>
                      {trade.exit && (
                        <p className="text-gray-600">
                          Exit: <span className="font-medium">${trade.exit.toLocaleString()}</span>
                        </p>
                      )}
                      {trade.profit !== undefined && (
                        <p className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Profit: <span className="font-bold">
                            ${trade.profit.toLocaleString()} ({trade.profitPercent?.toFixed(2)}%)
                          </span>
                        </p>
                      )}
                      <p className="text-gray-600">
                        Status: <span className={`font-medium ${trade.status === 'open' ? 'text-blue-600' : 'text-gray-600'}`}>
                          {trade.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {trade.status === 'open' && (
                      <button
                        onClick={() => closeTrade(trade.id!, trade.entry * 1.05)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                      >
                        Close +5%
                      </button>
                    )}
                    <button
                      onClick={() => removeTrade(trade.id!)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
