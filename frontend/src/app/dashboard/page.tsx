'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import AgentLiveView from '@/components/AgentLiveView';
import Link from 'next/link';
import { apiFetch as api, getPortfolios, getTrades, getSignals } from '@/lib/api';

const TABS = [
  { id: 'command', label: 'COMMAND CENTER', icon: '◉' },
  { id: 'portfolio', label: 'PORTFOLIO', icon: '◈' },
  { id: 'live', label: 'LIVE FEED', icon: '◀' },
  { id: 'agents', label: 'AGENTS', icon: '◉' },
  { id: 'signals', label: 'SIGNALS', icon: '◆' },
];

// Fallback mock data when API unavailable
const FALLBACK_MARKET_DATA = [
  { symbol: 'SPX', name: 'S&P 500', price: 5892.31, change: 0.82, spark: [5820, 5840, 5855, 5870, 5885, 5892] },
  { symbol: 'NDX', name: 'Nasdaq 100', price: 20456.89, change: 1.24, spark: [20100, 20150, 20200, 20300, 20380, 20456] },
  { symbol: 'BTC', name: 'Bitcoin', price: 95432.50, change: -2.31, spark: [98000, 97000, 96500, 96000, 95800, 95432] },
  { symbol: 'ETH', name: 'Ethereum', price: 3214.67, change: -1.87, spark: [3300, 3280, 3250, 3220, 3215, 3214] },
  { symbol: 'GLD', name: 'Gold', price: 312.45, change: 0.54, spark: [308, 309, 310, 311, 312, 312] },
  { symbol: 'VIX', name: 'Volatility', price: 14.23, change: -5.12, spark: [16, 15.5, 15, 14.5, 14.3, 14.2] },
];

const FALLBACK_PORTFOLIO = [
  { date: 'Jan', value: 100000 },
  { date: 'Feb', value: 102500 },
  { date: 'Mar', value: 101200 },
  { date: 'Apr', value: 104800 },
  { date: 'May', value: 107200 },
  { date: 'Jun', value: 110500 },
];

const FALLBACK_TRADES = [
  { id: 1, symbol: 'XAUUSD', action: 'BUY', price: 3124.50, time: '07:00:02', pnl: 45.20 },
  { id: 2, symbol: 'XAUUSD', action: 'SELL', price: 3125.80, time: '07:00:15', pnl: -12.40 },
  { id: 3, symbol: 'NVDA', action: 'BUY', price: 892.30, time: '07:01:22', pnl: 0 },
  { id: 4, symbol: 'TSLA', action: 'BUY', price: 245.60, time: '07:02:05', pnl: 89.30 },
  { id: 5, symbol: 'AMD', action: 'SELL', price: 178.90, time: '07:03:11', pnl: 23.10 },
];

const FALLBACK_SIGNALS = [
  { id: 1, date: '2026-04-24', symbol: 'XAUUSD', signal: 'BUY', entry: 3120.50, sl: 3110, tp: 3140, result: 'WIN', pnl: 1950 },
  { id: 2, date: '2026-04-23', symbol: 'XAUUSD', signal: 'SELL', entry: 3145.00, sl: 3155, tp: 3125, result: 'WIN', pnl: 2000 },
  { id: 3, date: '2026-04-22', symbol: 'BTC', signal: 'BUY', entry: 96000, sl: 95000, tp: 98000, result: 'LOSS', pnl: -1000 },
  { id: 4, date: '2026-04-21', symbol: 'NVDA', signal: 'BUY', entry: 875.00, sl: 860, tp: 910, result: 'WIN', pnl: 3500 },
];

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  spark: number[];
}

interface Trade {
  id: number;
  symbol: string;
  action: string;
  price: number;
  time: string;
  pnl: number;
}

interface Signal {
  id: number;
  date: string;
  symbol: string;
  signal: string;
  entry: number;
  sl: number;
  tp: number;
  result: string;
  pnl: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('command');
  const [time, setTime] = useState(new Date());
  
  // Data state
  const [marketData, setMarketData] = useState<MarketData[]>(FALLBACK_MARKET_DATA);
  const [portfolioData, setPortfolioData] = useState<{date: string; value: number}[]>(FALLBACK_PORTFOLIO);
  const [trades, setTrades] = useState<Trade[]>(FALLBACK_TRADES);
  const [signals, setSignals] = useState<Signal[]>(FALLBACK_SIGNALS);
  const [portfolioValue, setPortfolioValue] = useState(110500);
  const [totalPnl, setTotalPnl] = useState({ value: 10500, pct: 10.5 });
  const [availableCash, setAvailableCash] = useState(45200);
  
  // Loading/error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'fallback'>('fallback');

  // Fetch data from API
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Try to fetch real data
      if (token) {
        try {
          // Fetch portfolio
          const portfolioRes = await api('/portfolio/', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
          if (portfolioRes.ok) {
            const portfolios = await portfolioRes.json();
            if (portfolios.length > 0) {
              const p = portfolios[0];
              setPortfolioValue(Number(p.total_value) || 110500);
              setTotalPnl({ value: Number(p.total_pnl) || 10500, pct: Number(p.total_return_pct) || 10.5 });
              setAvailableCash(Number(p.cash_balance) || 45200);
            }
          }

          // Fetch recent trades
          const tradesRes = await api('/trades/?limit=10', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
          if (tradesRes.ok) {
            const tradeData = await tradesRes.json();
            if (Array.isArray(tradeData)) {
              setTrades(tradeData.slice(0, 5).map((t: any, i: number) => ({
                id: i + 1,
                symbol: t.symbol || 'UNKNOWN',
                action: t.side?.toUpperCase() || 'BUY',
                price: Number(t.entry_price) || 0,
                time: t.created_at ? new Date(t.created_at).toLocaleTimeString() : '00:00:00',
                pnl: Number(t.pnl) || 0,
              })));
            }
          }

// Fetch signals
          const signalsRes = await api('/signals', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
          if (signalsRes.ok) {
            const signalData = await signalsRes.json();
            if (Array.isArray(signalData)) {
              setSignals(signalData.slice(0, 5).map((s: any, i: number) => ({
                id: i + 1,
                date: s.created_at?.split('T')[0] || '2026-04-24',
                symbol: s.symbol || 'UNKNOWN',
                signal: s.signal || 'BUY',
                entry: Number(s.entry_price) || 0,
                sl: Number(s.stop_loss) || 0,
                tp: Number(s.take_profit) || 0,
                result: s.status === 'closed' ? (s.pnl > 0 ? 'WIN' : 'LOSS') : 'PENDING',
                pnl: Number(s.pnl) || 0,
              })));
            }
          }

          setDataSource('api');
        } catch (e) {
          console.warn('API fetch failed, using fallback:', e);
          setDataSource('fallback');
        }
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      setError('Using offline data');
      setDataSource('fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh timer
  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setTime(new Date()), 1000);
    const refresh = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, [fetchDashboardData]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[rgba(0,212,255,0.15)] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-[#00D4FF] font-mono">STARKTRADE</Link>
            <span className="text-xs text-white/40 font-mono">AI COMMAND CENTER</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono text-white/40">{time.toLocaleTimeString()}</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
              <span className="text-xs text-white/40">{dataSource === 'api' ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-[rgba(0,212,255,0.15)] px-4">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-mono transition-all ${
                activeTab === tab.id
                  ? 'text-[#00D4FF] border-b-2 border-[#00D4FF]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-2 bg-yellow-900/20 border border-yellow-500/50 rounded text-xs text-yellow-400">
            {error} — <button onClick={fetchDashboardData} className="underline">Retry</button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* COMMAND CENTER */}
          {activeTab === 'command' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="command">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {marketData.map((market) => (
                  <motion.div
                    key={market.symbol}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border p-3"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}
                  >
                    <div className="text-xs text-white/40 mb-1">{market.name}</div>
                    <div className="text-lg font-mono font-bold mb-1">{market.price.toLocaleString()}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono" style={{ color: market.change >= 0 ? '#00FF88' : '#FF4444' }}>
                        {market.change >= 0 ? '+' : ''}{market.change}%
                      </span>
                      <ResponsiveContainer width={50} height={20}>
                        <AreaChart data={market.spark.map((v, i) => ({ v, i }))}>
                          <Area type="monotone" dataKey="v" stroke={market.change >= 0 ? '#00FF88' : '#FF4444'} fill="none" strokeWidth={1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Equity Curve */}
              <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-white/40">PORTFOLIO VALUE</div>
                    <div className="text-2xl font-mono font-bold text-[#00D4FF]">R{portfolioValue.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/40">ALL TIME P&L</div>
                    <div className="text-lg font-mono text-[#00FF88]">+R{totalPnl.value.toLocaleString()} (+{totalPnl.pct}%)</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={portfolioData}>
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} domain={['dataMin - 1000', 'dataMax + 1000']} />
                    <Tooltip contentStyle={{ background: '#000', border: '1px solid rgba(0,212,255,0.3)' }} />
                    <Area type="monotone" dataKey="value" stroke="#00D4FF" fill="rgba(0,212,255,0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* PORTFOLIO TAB */}
          {activeTab === 'portfolio' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="portfolio">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                  <div className="text-xs text-white/40 mb-2">TOTAL EQUITY</div>
                  <div className="text-3xl font-mono font-bold text-[#00D4FF]">R{portfolioValue.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                  <div className="text-xs text-white/40 mb-2">AVAILABLE CASH</div>
                  <div className="text-3xl font-mono font-bold text-[#00FF88]">R{availableCash.toLocaleString()}</div>
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="text-xs text-white/40 mb-4">EQUITY CURVE</div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={portfolioData}>
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#000', border: '1px solid rgba(0,212,255,0.3)' }} />
                    <Area type="monotone" dataKey="value" stroke="#00D4FF" fill="rgba(0,212,255,0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* LIVE FEED TAB */}
          {activeTab === 'live' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="live">
              <div className="rounded-lg border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="p-3 border-b border-[rgba(0,212,255,0.15)] flex items-center justify-between">
                  <div className="text-sm font-mono">LIVE TRADES</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
                    <span className="text-xs text-white/40">LIVE</span>
                  </div>
                </div>
                <div className="divide-y divide-[rgba(0,212,255,0.1)]">
                  {trades.map((trade) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/40">{trade.time}</span>
                        <span className="font-mono">{trade.symbol}</span>
                        <span className="text-xs font-mono" style={{ color: trade.action === 'BUY' ? '#00FF88' : '#FF4444' }}>{trade.action}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/60">{trade.price}</span>
                        <span className="text-xs font-mono" style={{ color: trade.pnl > 0 ? '#00FF88' : trade.pnl < 0 ? '#FF4444' : 'white' }}>
                          {trade.pnl > 0 ? '+' : ''}{trade.pnl}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* AGENTS TAB */}
          {activeTab === 'agents' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="agents">
              <AgentLiveView demoMode={true} />
            </motion.div>
          )}

          {/* SIGNALS TAB */}
          {activeTab === 'signals' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="signals">
              <div className="rounded-lg border mb-4 p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-mono">RECENT SIGNALS</div>
                  <button 
                    onClick={fetchDashboardData}
                    className="text-xs text-[#00D4FF] hover:underline"
                  >
                    ↻ Refresh
                  </button>
                </div>
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div>
                        <span className="text-xs text-white/40 mr-2">{signal.date}</span>
                        <span className="font-mono">{signal.symbol}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          signal.signal === 'BUY' ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-[#FF4444]/20 text-[#FF4444]'
                        }`}>
                          {signal.signal}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/60">
                          Entry: {signal.entry} | SL: {signal.sl} | TP: {signal.tp}
                        </div>
                        <span className={`text-xs ml-2 ${
                          signal.result === 'WIN' ? 'text-[#00FF88]' : signal.result === 'LOSS' ? 'text-[#FF4444]' : 'text-yellow-400'
                        }`}>
                          {signal.result} ({signal.pnl > 0 ? '+' : ''}{signal.pnl})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
    </div>
  );
}