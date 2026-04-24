'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PredictionMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  yes_price: number;
  no_price: number;
  yes_pool: number;
  no_pool: number;
  total_volume: number;
  status: string;
  closes_at: string;
}

interface LeaderboardEntry {
  rank: number;
  user: string;
  accuracy: number;
  points: number;
}

export default function PredictionsPage() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [credits, setCredits] = useState(2500);
  const [user, setUser] = useState<{email: string} | null>(null);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get token for authenticated requests
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Fetch markets
      const marketsRes = await api.get('/predictions/markets?status=open&limit=20');
      if (marketsRes.ok) {
        const data = await marketsRes.json();
        setMarkets(data.markets || data);
      }

      // Fetch user if logged in
      if (token) {
        try {
          const userRes = await api.get('/auth/me', token);
          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData);
            setCredits(userData.credits || 2500);
          }
        } catch {}
      }

      // Generate mock leaderboard (would come from API in production)
      setLeaderboard([
        { rank: 1, user: 'CryptoKing', accuracy: 78, points: 2450 },
        { rank: 2, user: 'SAGem', accuracy: 72, points: 1890 },
        { rank: 3, user: 'GoldBug', accuracy: 69, points: 1650 },
        { rank: 4, user: 'LoadShed', accuracy: 65, points: 1230 },
        { rank: 5, user: 'TaurusTrader', accuracy: 61, points: 980 },
      ]);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
      setError('Failed to load markets');
      
      // Fallback to empty markets if API fails
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle voting
  const handleVote = async (marketId: string, vote: 'yes' | 'no') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      alert('Please login to trade predictions');
      return;
    }

    try {
      const res = await api.post('/predictions/trade', {
        market_id: marketId,
        side: vote,
        quantity: 100,
      }, token);

      if (res.ok) {
        alert(`Vote placed! You voted ${vote.toUpperCase()}`);
        fetchData(); // Refresh data
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || 'Failed to place vote');
      }
    } catch (err) {
      console.error('Vote failed:', err);
      alert('Failed to place vote');
    }
  };

  // Format time remaining
  const getTimeRemaining = (closesAt: string) => {
    const diff = new Date(closesAt).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[rgba(0,212,255,0.15)] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-[#00D4FF] font-mono">STARKTRADE</Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/40 font-mono">PREDICTION MARKETS</span>
            <button 
              onClick={fetchData}
              className="text-xs text-[#00D4FF] hover:underline"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {loading && (
          <div className="text-center py-20">
            <div className="text-[#00D4FF] animate-pulse">Loading markets...</div>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <div className="text-red-400 mb-4">{error}</div>
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-[#00D4FF] text-black rounded"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && markets.length === 0 && (
          <div className="text-center py-20">
            <div className="text-white/60 mb-4">No active markets</div>
            <p className="text-sm text-white/40">Create a prediction market to get started!</p>
          </div>
        )}

        {!loading && markets.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Markets */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-mono mb-4">ACTIVE MARKETS</h2>
              {markets.map((market) => (
                <motion.div
                  key={market.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedMarket === market.id ? 'border-[#00D4FF]' : 'border-[rgba(0,212,255,0.15)]'
                  }`}
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                  onClick={() => setSelectedMarket(market.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(0,212,255,0.2)', color: '#00D4FF' }}>
                        {market.category}
                      </span>
                      <div className="text-sm mt-2">{market.title}</div>
                      {market.description && (
                        <div className="text-xs text-white/40 mt-1">{market.description}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/40">Expires</div>
                      <div className="text-sm font-mono">{getTimeRemaining(market.closes_at)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedMarket(market.id); 
                          handleVote(market.id, 'yes');
                        }}
                        className={`px-4 py-2 rounded font-mono text-sm ${
                          userVote === 'YES' && selectedMarket === market.id
                            ? 'bg-[#00FF88] text-black'
                            : 'border border-[#00FF88] text-[#00FF88]'
                        }`}
                      >
                        YES {Math.round(market.yes_price * 100)}
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedMarket(market.id); 
                          handleVote(market.id, 'no');
                        }}
                        className={`px-4 py-2 rounded font-mono text-sm ${
                          userVote === 'NO' && selectedMarket === market.id
                            ? 'bg-[#FF4444] text-white'
                            : 'border border-[#FF4444] text-[#FF4444]'
                        }`}
                      >
                        NO {Math.round(market.no_price * 100)}
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/40">Volume</div>
                      <div className="text-sm font-mono">R{Math.round(market.total_volume).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {/* Vote distribution bars */}
                  <div className="mt-3 h-2 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#00FF88]" style={{ width: `${market.yes_price * 100}%` }} />
                    <div className="h-full bg-[#FF4444]" style={{ width: `${market.no_price * 100}%` }} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Leaderboard */}
            <div>
              <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="text-sm font-mono mb-4">LEADERBOARD</div>
                <div className="space-y-3">
                  {leaderboard.map((entry) => (
                    <div key={entry.rank} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          entry.rank === 1 ? 'bg-[#FFD700] text-black' :
                          entry.rank === 2 ? 'bg-[#C0C0C0] text-black' :
                          entry.rank === 3 ? 'bg-[#CD7F32] text-black' :
                          'border border-white/20'
                        }`}>
                          {entry.rank}
                        </span>
                        <span className="text-sm">{entry.user}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-[#00FF88]">{entry.accuracy}%</div>
                        <div className="text-xs text-white/40">{entry.points} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border mt-4 p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="text-xs text-white/40 mb-2">YOUR CREDITS</div>
                <div className="text-2xl font-mono text-[#FFD700]">{credits.toLocaleString()}</div>
                <div className="text-xs text-white/40 mt-1">Earn more by predicting accurately!</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
    </div>
  );
}