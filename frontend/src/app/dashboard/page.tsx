'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import AgentLiveView from '@/components/AgentLiveView';
import Link from 'next/link';

const TABS = [
  { id: 'command', label: 'COMMAND CENTER', icon: '◉' },
  { id: 'portfolio', label: 'PORTFOLIO', icon: '◈' },
  { id: 'live', label: 'LIVE FEED', icon: '◀' },
  { id: 'agents', label: 'AGENTS', icon: '◉' },
  { id: 'signals', label: 'SIGNALS', icon: '◆' },
];

const MARKET_DATA = [
  { symbol: 'SPX', name: 'S&P 500', price: 5892.31, change: 0.82, spark: [5820, 5840, 5855, 5870, 5885, 5892] },
  { symbol: 'NDX', name: 'Nasdaq 100', price: 20456.89, change: 1.24, spark: [20100, 20150, 20200, 20300, 20380, 20456] },
  { symbol: 'BTC', name: 'Bitcoin', price: 95432.50, change: -2.31, spark: [98000, 97000, 96500, 96000, 95800, 95432] },
  { symbol: 'ETH', name: 'Ethereum', price: 3214.67, change: -1.87, spark: [3300, 3280, 3250, 3220, 3215, 3214] },
  { symbol: 'GLD', name: 'Gold', price: 312.45, change: 0.54, spark: [308, 309, 310, 311, 312, 312] },
  { symbol: 'VIX', name: 'Volatility', price: 14.23, change: -5.12, spark: [16, 15.5, 15, 14.5, 14.3, 14.2] },
];

const PORTFOLIO_DATA = [
  { date: 'Jan', value: 100000 },
  { date: 'Feb', value: 102500 },
  { date: 'Mar', value: 101200 },
  { date: 'Apr', value: 104800 },
  { date: 'May', value: 107200 },
  { date: 'Jun', value: 110500 },
];

const TRADES = [
  { id: 1, symbol: 'XAUUSD', action: 'BUY', price: 3124.50, time: '07:00:02', pnl: 45.20 },
  { id: 2, symbol: 'XAUUSD', action: 'SELL', price: 3125.80, time: '07:00:15', pnl: -12.40 },
  { id: 3, symbol: 'NVDA', action: 'BUY', price: 892.30, time: '07:01:22', pnl: 0 },
  { id: 4, symbol: 'TSLA', action: 'BUY', price: 245.60, time: '07:02:05', pnl: 89.30 },
  { id: 5, symbol: 'AMD', action: 'SELL', price: 178.90, time: '07:03:11', pnl: 23.10 },
];

const SIGNAL_HISTORY = [
  { id: 1, date: '2026-04-24', symbol: 'XAUUSD', signal: 'BUY', entry: 3120.50, sl: 3110, tp: 3140, result: 'WIN', pnl: 1950 },
  { id: 2, date: '2026-04-23', symbol: 'XAUUSD', signal: 'SELL', entry: 3145.00, sl: 3155, tp: 3125, result: 'WIN', pnl: 2000 },
  { id: 3, date: '2026-04-22', symbol: 'BTC', signal: 'BUY', entry: 96000, sl: 95000, tp: 98000, result: 'LOSS', pnl: -1000 },
  { id: 4, date: '2026-04-21', symbol: 'NVDA', signal: 'BUY', entry: 875.00, sl: 860, tp: 910, result: 'WIN', pnl: 3500 },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('command');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
            <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
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
        <AnimatePresence mode="wait">
          {/* COMMAND CENTER */}
          {activeTab === 'command' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key="command">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {MARKET_DATA.map((market) => (
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
                    <div className="text-2xl font-mono font-bold text-[#00D4FF]">R110,500</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/40">ALL TIME P&L</div>
                    <div className="text-lg font-mono text-[#00FF88]">+R10,500 (+10.5%)</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={PORTFOLIO_DATA}>
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
                  <div className="text-3xl font-mono font-bold text-[#00D4FF]">R110,500</div>
                </div>
                <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                  <div className="text-xs text-white/40 mb-2">AVAILABLE CASH</div>
                  <div className="text-3xl font-mono font-bold text-[#00FF88]">R45,200</div>
                </div>
              </div>
              <div className="rounded-lg border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="text-xs text-white/40 mb-4">EQUITY CURVE</div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={PORTFOLIO_DATA}>
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
                  {TRADES.map((trade) => (
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
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-white/40">WIN RATE</div>
                    <div className="text-2xl font-mono text-[#00FF88]">75%</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40">TOTAL SIGNALS</div>
                    <div className="text-2xl font-mono">42</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40">SHARPE RATIO</div>
                    <div className="text-2xl font-mono text-[#00D4FF]">1.69</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/40">PROFIT FACTOR</div>
                    <div className="text-2xl font-mono text-[#FFD700]">2.01</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(0,212,255,0.15)' }}>
                <div className="p-3 border-b border-[rgba(0,212,255,0.15)]">
                  <div className="text-sm font-mono">SIGNAL HISTORY</div>
                </div>
                <div className="divide-y divide-[rgba(0,212,255,0.1)]">
                  {SIGNAL_HISTORY.map((signal) => (
                    <div key={signal.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/40">{signal.date}</span>
                        <span className="font-mono">{signal.symbol}</span>
                        <span className="text-xs font-mono" style={{ color: signal.signal === 'BUY' ? '#00FF88' : '#FF4444' }}>{signal.signal}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white/60">Entry: {signal.entry} SL: {signal.sl} TP: {signal.tp}</span>
                        <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: signal.result === 'WIN' ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)', color: signal.result === 'WIN' ? '#00FF88' : '#FF4444' }}>
                          {signal.result} R{signal.pnl}
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

      {/* Matrix background */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
    </div>
  );
}
