'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, TrendingUp, TrendingDown, Users, Award, ChevronRight,
  Clock, RefreshCw, Plus, Zap, X
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useRouter } from 'next/navigation';

interface PredictionMarket {
  id: string;
  title: string;
  description?: string;
  category: string;
  yes_price: number;
  no_price: number;
  total_volume: number;
  status: string;
  closes_at: string;
  resolution?: string;
}

interface PredictionPosition {
  id: string;
  side: 'yes' | 'no';
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  status: string;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_pnl: number;
  accuracy_pct: number;
  rank: number;
}

const CATEGORIES = [
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'commodities', label: 'Commodities', emoji: '🥇' },
  { id: 'macro', label: 'Macro', emoji: '📊' },
  { id: 'sa', label: 'South Africa', emoji: '🇿🇦' },
];

export default function PredictionsPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [positions, setPositions] = useState<PredictionPosition[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [marketsRes, positionsRes, leaderboardRes] = await Promise.all([
        apiFetch('/predictions/markets').catch(() => null),
        apiFetch('/predictions/positions').catch(() => null),
        apiFetch('/predictions/leaderboard').catch(() => null),
      ]);

      if (marketsRes?.ok) setMarkets(await marketsRes.json());
      if (positionsRes?.ok) setPositions(await positionsRes.json());
      if (leaderboardRes?.ok) setLeaderboard(await leaderboardRes.json());
    } catch {}
    setLoading(false);
  };

  const filteredMarkets = useMemo(() => {
    if (!selectedCategory) return markets;
    return markets.filter(m => m.category === selectedCategory);
  }, [markets, selectedCategory]);

  const userPositionsPnL = useMemo(() => {
    return positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  }, [positions]);

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[180px] -top-48 -left-48 animate-pulse-glow" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-orange-500/3 blur-[150px] top-1/2 right-0 animate-pulse-glow" style={{ animationDelay: '-2s' }} />
      </div>

      <div className="relative z-10 p-4 md:p-8 pt-20 md:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-semibold text-white tracking-tight flex items-center gap-3">
              <Flame className="w-6 h-6 text-amber-400" />
              Prediction Markets
            </h1>
            <p className="text-sm text-white/60 mt-1">
              Bet on outcomes. Earn from your intuition.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="cta-button text-sm"
          >
            <Plus className="w-4 h-4" /> Create Market
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-4">
            <p className="text-xs text-white/40 mb-1">Active Markets</p>
            <p className="text-xl font-bold font-mono text-white">{markets.filter(m => m.status === 'open').length}</p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-xs text-white/40 mb-1">Your Positions</p>
            <p className="text-xl font-bold font-mono text-white">{positions.length}</p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-xs text-white/40 mb-1">Total P&L</p>
            <p className={`text-xl font-bold font-mono ${userPositionsPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {userPositionsPnL >= 0 ? '+' : ''}{userPositionsPnL.toFixed(2)}
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-xs text-white/40 mb-1">Pool Volume</p>
            <p className="text-xl font-bold font-mono text-amber-400">
              ${markets.reduce((sum, m) => sum + (m.total_volume || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
              !selectedCategory
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-white/60 border border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            All Markets
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-white/60 border border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-panel p-6 rounded-xl animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))
          ) : filteredMarkets.length === 0 ? (
            <div className="col-span-full glass-panel p-12 text-center">
              <Flame className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
              <p className="text-white/60">No prediction markets available</p>
              <p className="text-sm text-white/40 mt-2">Check back soon for new markets</p>
            </div>
          ) : (
            filteredMarkets.map(market => (
              <PredictionCard key={market.id} market={market} />
            ))
          )}
        </div>

        {/* Leaderboard */}
        <div glass-panel p-6>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Top Predictors
            </h3>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">No predictions yet</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div key={entry.user_id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-400/20 text-amber-400' :
                    i === 1 ? 'bg-white/20 text-white' :
                    i === 2 ? 'bg-orange-400/20 text-orange-400' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{entry.username}</p>
                    <p className="text-xs text-white/40">{entry.accuracy_pct}% accuracy</p>
                  </div>
                  <p className={`text-sm font-mono ${entry.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.total_pnl >= 0 ? '+' : ''}{entry.total_pnl.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateMarketModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

const PredictionCard = memo(function PredictionCard({ market }: { market: PredictionMarket }) {
  const [betting, setBetting] = useState(false);

  const handleBet = async (side: 'yes' | 'no') => {
    setBetting(true);
    try {
      const res = await apiFetch('/predictions/trade', {
        method: 'POST',
        body: JSON.stringify({
          market_id: market.id,
          side,
          quantity: 100,
        }),
      });
      if (res?.ok) {
        notify.success(`Bet placed on ${side.toUpperCase()}`);
      }
    } catch {}
    setBetting(false);
  };

  const timeLeft = useMemo(() => {
    const close = new Date(market.closes_at);
    const now = new Date();
    const diff = close.getTime() - now.getTime();
    if (diff <= 0) return 'Closed';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }, [market.closes_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 rounded-xl border border-white/[0.06] hover:border-amber-500/20 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
          market.category === 'crypto' ? 'bg-orange-500/10 text-orange-400' :
          market.category === 'commodities' ? 'bg-amber-500/10 text-amber-400' :
          market.category === 'sa' ? 'bg-green-500/10 text-green-400' :
          'bg-blue-500/10 text-blue-400'
        }`}>
          {market.category}
        </span>
        <span className="text-xs text-white/40 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeLeft}
        </span>
      </div>

      <h3 className="font-medium text-white mb-2 line-clamp-2">{market.title}</h3>

      {market.description && (
        <p className="text-xs text-white/40 mb-4 line-clamp-2">{market.description}</p>
      )}

      {/* Price Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-green-400 font-mono">YES {(market.yes_price * 100).toFixed(0)}¢</span>
          <span className="text-red-400 font-mono">NO {((1 - market.yes_price) * 100).toFixed(0)}¢</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-green-400"
            initial={{ width: 0 }}
            animate={{ width: `${market.yes_price * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Volume */}
      <p className="text-xs text-white/30 mb-4">
        ${market.total_volume?.toLocaleString()} pooled
      </p>

      {/* Bet Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleBet('yes')}
          disabled={betting || market.status !== 'open'}
          className="flex-1 py-2.5 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
        >
          Buy YES
        </button>
        <button
          onClick={() => handleBet('no')}
          disabled={betting || market.status !== 'open'}
          className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          Buy NO
        </button>
      </div>
    </motion.div>
  );
});

function CreateMarketModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('crypto');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch('/predictions/markets', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res?.ok) {
        notify.success('Market created!');
        onClose();
      }
    } catch {}
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="glass-panel p-6 rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Create Market</h3>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-2 block">Question</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Will BTC reach $100k by end of 2024?"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/[0.06] text-white placeholder:text-white/30 focus:border-amber-500/30"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-2 block">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex-1 py-2 rounded-xl text-sm ${
                    category === cat.id
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-white/5 text-white/60 border border-white/[0.06]'
                  }`}
                >
                  {cat.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !title.trim()}
          className="cta-button w-full mt-6"
        >
          {creating ? 'Creating...' : 'Create Market'}
        </button>
      </motion.div>
    </motion.div>
  );
}