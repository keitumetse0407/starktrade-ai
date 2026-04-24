'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const MARKETS = [
  { id: 1, question: 'Will ESKOM implement load shedding in the next 7 days?', category: 'SA Energy', yesPrice: 0.65, noPrice: 0.35, volume: 12500, endsIn: '5d' },
  { id: 2, question: 'Will XAU/USD break 3200 by end of April?', category: 'Commodities', yesPrice: 0.42, noPrice: 0.58, volume: 28400, endsIn: '6d' },
  { id: 3, question: 'Will BTC reach 100k USD in Q2 2026?', category: 'Crypto', yesPrice: 0.38, noPrice: 0.62, volume: 45600, endsIn: '67d' },
  { id: 4, question: 'Will SARB keep repo rate unchanged at 8.25%?', category: 'SA Macro', yesPrice: 0.72, noPrice: 0.28, volume: 8900, endsIn: '12d' },
];

const LEADERBOARD = [
  { rank: 1, user: 'CryptoKing', accuracy: 78, points: 2450 },
  { rank: 2, user: 'SAGem', accuracy: 72, points: 1890 },
  { rank: 3, user: 'GoldBug', accuracy: 69, points: 1650 },
  { rank: 4, user: 'LoadShed', accuracy: 65, points: 1230 },
  { rank: 5, user: 'TaurusTrader', accuracy: 61, points: 980 },
];

export default function PredictionsPage() {
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [userVote, setUserVote] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-[rgba(0,212,255,0.15)] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-[#00D4FF] font-mono">STARKTRADE</Link>
          <span className="text-xs text-white/40 font-mono">PREDICTION MARKETS</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Markets */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-mono mb-4">ACTIVE MARKETS</h2>
            {MARKETS.map((market) => (
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
                    <div className="text-sm mt-2">{market.question}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/40">Expires</div>
                    <div className="text-sm font-mono">{market.endsIn}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedMarket(market.id); setUserVote('YES'); }}
                      className={`px-4 py-2 rounded font-mono text-sm ${
                        userVote === 'YES' && selectedMarket === market.id
                          ? 'bg-[#00FF88] text-black'
                          : 'border border-[#00FF88] text-[#00FF88]'
                      }`}
                    >
                      YES {Math.round(market.yesPrice * 100)}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedMarket(market.id); setUserVote('NO'); }}
                      className={`px-4 py-2 rounded font-mono text-sm ${
                        userVote === 'NO' && selectedMarket === market.id
                          ? 'bg-[#FF4444] text-white'
                          : 'border border-[#FF4444] text-[#FF4444]'
                      }`}
                    >
                      NO {Math.round(market.noPrice * 100)}
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/40">Volume</div>
                    <div className="text-sm font-mono">R{market.volume.toLocaleString()}</div>
                  </div>
                </div>
                
                {/* Vote distribution bars */}
                <div className="mt-3 h-2 rounded-full overflow-hidden flex">
                  <div className="h-full bg-[#00FF88]" style={{ width: `${market.yesPrice * 100}%` }} />
                  <div className="h-full bg-[#FF4444]" style={{ width: `${market.noPrice * 100}%` }} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Leaderboard */}
          <div>
            <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
              <div className="text-sm font-mono mb-4">LEADERBOARD</div>
              <div className="space-y-3">
                {LEADERBOARD.map((user) => (
                  <div key={user.rank} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        user.rank === 1 ? 'bg-[#FFD700] text-black' :
                        user.rank === 2 ? 'bg-[#C0C0C0] text-black' :
                        user.rank === 3 ? 'bg-[#CD7F32] text-black' :
                        'border border-white/20'
                      }`}>
                        {user.rank}
                      </span>
                      <span className="text-sm">{user.user}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-[#00FF88]">{user.accuracy}%</div>
                      <div className="text-xs text-white/40">{user.points} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border mt-4 p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
              <div className="text-xs text-white/40 mb-2">YOUR CREDITS</div>
              <div className="text-2xl font-mono text-[#FFD700]">2,500</div>
              <div className="text-xs text-white/40 mt-1">Earn more by predicting accurately!</div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
    </div>
  );
}
