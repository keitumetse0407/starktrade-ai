'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart3, Brain, Shield, Settings, TrendingUp, Bell,
  DollarSign, Target, Zap, Menu, ChevronRight, ArrowUpRight, ArrowDownRight,
  Play, Pause, RefreshCw, X, LogOut, User, Coins
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { CommandCenter, AutopilotControls, AgentsCouncil, TradeHistory, Predictions, Analytics, SettingsPanel } from '@/components/dashboard/DashboardPanels';
import { LiveAgentFeed, InlineAgentFeed } from '@/components/dashboard/LiveAgentFeed';

// ============================================================
// MOCK DATA GENERATORS
// ============================================================
function generatePortfolioHistory() {
  const data = [];
  let value = 100000;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    value += (Math.random() - 0.4) * 1500;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value),
      sp500: 100000 + (30 - i) * 300 + (Math.random() - 0.5) * 2000,
    });
  }
  return data;
}

function generateTradeHistory() {
  const symbols = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BTC', 'ETH', 'SPY'];
  const agents = ['Strategist', 'Quant', 'Researcher', 'Fundamentalist'];
  return Array.from({ length: 12 }, (_, i) => {
    const isBuy = Math.random() > 0.4;
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const price = 50 + Math.random() * 900;
    const pnl = isBuy ? (Math.random() - 0.3) * 5000 : (Math.random() - 0.6) * 3000;
    return {
      id: i,
      symbol,
      side: isBuy ? 'BUY' : 'SELL',
      price: price.toFixed(2),
      quantity: (1 + Math.random() * 50).toFixed(0),
      pnl: pnl.toFixed(2),
      pnlPct: ((pnl / (price * 10)) * 100).toFixed(2),
      agent: agents[Math.floor(Math.random() * agents.length)],
      time: `${Math.floor(Math.random() * 24)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      status: Math.random() > 0.1 ? 'filled' : 'pending',
    };
  });
}

function generateAgentActivity() {
  const activities = [
    { agent: 'Researcher', action: 'Scanning NVDA earnings call transcript...', status: 'active' },
    { agent: 'Strategist', action: 'AAPL margin of safety: 32% — APPROVED', status: 'success' },
    { agent: 'Quant', action: 'Sharpe ratio signal: 2.1 — BUY generated', status: 'success' },
    { agent: 'Risk Manager', action: 'Position size: 3.2% of portfolio — APPROVED', status: 'success' },
    { agent: 'Fundamentalist', action: 'MSFT 10-K analysis: Strong moat confirmed', status: 'success' },
    { agent: 'Quant', action: 'Trade executed: BUY NVDA @ $875.30', status: 'success' },
    { agent: 'Researcher', action: 'Monitoring VIX spike to 16.2...', status: 'warning' },
    { agent: 'Organizer', action: 'Daily digest compiled — 3 trades today', status: 'active' },
    { agent: 'Learner', action: 'Pattern identified: Momentum + RSI confluence', status: 'active' },
    { agent: 'Risk Manager', action: 'Portfolio beta: 1.2 — within limits', status: 'success' },
  ];
  return activities;
}

const COLORS = ['#00D4FF', '#00FF88', '#FF3366', '#FFD700', '#8892B0'];

const TABS = [
  { id: 'command', label: 'Command Center', icon: Activity },
  { id: 'autopilot', label: 'Autopilot', icon: Zap },
  { id: 'agents', label: 'Agents Council', icon: Brain },
  { id: 'trades', label: 'Trade History', icon: TrendingUp },
  { id: 'predictions', label: 'Predictions', icon: Target },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('command');
  const [portfolioData, setPortfolioData] = useState(generatePortfolioHistory());
  const [trades, setTrades] = useState(generateTradeHistory());
  const [agentActivity, setAgentActivity] = useState(generateAgentActivity());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      // Occasionally add new activity
      if (Math.random() > 0.7) {
        const newActivities = generateAgentActivity();
        setAgentActivity([newActivities[Math.floor(Math.random() * newActivities.length)], ...agentActivity.slice(0, 9)]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [agentActivity]);

  const totalValue = portfolioData[portfolioData.length - 1]?.value || 127845;
  const startValue = portfolioData[0]?.value || 100000;
  const totalReturn = ((totalValue - startValue) / startValue * 100).toFixed(2);
  const dailyPnl = (portfolioData[portfolioData.length - 1]?.value || 0) - (portfolioData[portfolioData.length - 2]?.value || 0);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass border-r border-white/5 p-4 flex flex-col md:min-h-screen">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-electric" />
          <span className="font-bold">StarkTrade AI</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-x-auto md:overflow-visible">
          <div className="flex md:flex-col gap-1 min-w-max md:min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-electric/10 text-electric border border-electric/20'
                      : 'text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/5 my-2 pt-2 hidden md:block">
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-loss hover:bg-loss/5 transition-all"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        </nav>

        {/* User section */}
        <div className="mt-auto pt-4 border-t border-white/5 hidden md:block">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-electric text-sm font-bold">
              ST
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">StarkTrade User</p>
              <p className="text-xs text-muted">Paper Account</p>
            </div>
            <button className="text-muted hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {TABS.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-muted">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg glass text-muted hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg glass text-muted hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'command' && (
              <CommandCenter
                portfolioData={portfolioData}
                totalValue={totalValue}
                totalReturn={totalReturn}
                dailyPnl={dailyPnl}
                trades={trades}
                agentActivity={agentActivity}
              />
            )}
            {activeTab === 'autopilot' && <AutopilotControls />}
            {activeTab === 'agents' && <AgentsCouncil />}
            {activeTab === 'trades' && <TradeHistory trades={trades} />}
            {activeTab === 'predictions' && <Predictions />}
            {activeTab === 'analytics' && <Analytics portfolioData={portfolioData} />}
            {activeTab === 'settings' && <SettingsPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================================
// COMMAND CENTER
// ============================================================
function CommandCenter({
  portfolioData, totalValue, totalReturn, dailyPnl, trades, agentActivity
}: {
  portfolioData: any[];
  totalValue: number;
  totalReturn: string;
  dailyPnl: number;
  trades: any[];
  agentActivity: any[];
}) {
  const allocationData = [
    { name: 'Tech', value: 35 },
    { name: 'Finance', value: 20 },
    { name: 'Crypto', value: 15 },
    { name: 'Healthcare', value: 15 },
    { name: 'Energy', value: 10 },
    { name: 'Cash', value: 5 },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroStat
          label="Portfolio Value"
          value={`$${totalValue.toLocaleString()}`}
          change={`${totalReturn >= '0' ? '+' : ''}${totalReturn}% all time`}
          positive={Number(totalReturn) >= 0}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <HeroStat
          label="Today's P&L"
          value={`${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toFixed(2)}`}
          change={`${((dailyPnl / totalValue) * 100).toFixed(2)}%`}
          positive={dailyPnl >= 0}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <HeroStat
          label="Win Rate"
          value="68.5%"
          change="+2.1% this week"
          positive
          icon={<Target className="w-5 h-5" />}
        />
        <HeroStat
          label="Sharpe Ratio"
          value="2.34"
          change="Excellent"
          positive
          icon={<BarChart3 className="w-5 h-5" />}
        />
      </div>

      {/* Chart + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Portfolio Performance</h3>
            <div className="flex gap-2">
              {['1W', '1M', '3M', '1Y'].map((p) => (
                <button key={p} className={`px-3 py-1 rounded text-xs ${
                  p === '1M' ? 'bg-electric/10 text-electric' : 'text-muted hover:text-white'
                }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#8892B0" fontSize={10} />
                <YAxis stroke="#8892B0" fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 39, 0.9)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Portfolio']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#00D4FF"
                  fill="url(#portfolioGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="sp500"
                  stroke="#8892B0"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-electric rounded" /> Portfolio
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-muted rounded border-dashed" /> S&P 500
            </span>
          </div>
        </div>

        {/* Agent Activity */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Agent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-auto">
            {agentActivity.map((item, i) => (
              <ActivityItem key={i} {...item} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trades + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Trades</h3>
            <button
              onClick={() => {}}
              className="text-xs text-electric hover:text-electric/80 transition-colors flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-muted pb-2">Symbol</th>
                  <th className="text-left text-xs text-muted pb-2">Side</th>
                  <th className="text-right text-xs text-muted pb-2">Price</th>
                  <th className="text-right text-xs text-muted pb-2">P&L</th>
                  <th className="text-left text-xs text-muted pb-2">Agent</th>
                  <th className="text-right text-xs text-muted pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 6).map((trade) => (
                  <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 font-mono font-medium">{trade.symbol}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">${trade.price}</td>
                    <td className={`py-2 text-right font-mono ${
                      Number(trade.pnl) >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {Number(trade.pnl) >= 0 ? '+' : ''}${trade.pnl}
                    </td>
                    <td className="py-2 text-muted text-xs">{trade.agent}</td>
                    <td className="py-2 text-right text-muted text-xs">{trade.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Allocation */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Allocation</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 39, 0.9)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {allocationData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted">{item.name}</span>
                <span className="font-mono ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Heatmap + Market Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Heatmap</h3>
          <div className="grid grid-cols-3 gap-2">
            <RiskCell label="Tech" value="18%" level="medium" />
            <RiskCell label="Finance" value="12%" level="low" />
            <RiskCell label="Crypto" value="15%" level="medium" />
            <RiskCell label="Healthcare" value="8%" level="low" />
            <RiskCell label="Energy" value="5%" level="low" />
            <RiskCell label="Drawdown" value="3.2%" level="low" />
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Market Pulse</h3>
          <div className="grid grid-cols-3 gap-3">
            <MarketPulseItem symbol="S&P 500" price="5,234" change="+0.42%" positive />
            <MarketPulseItem symbol="NASDAQ" price="16,742" change="+0.67%" positive />
            <MarketPulseItem symbol="BTC" price="$67,500" change="+2.31%" positive />
            <MarketPulseItem symbol="ETH" price="$3,450" change="+1.89%" positive />
            <MarketPulseItem symbol="Gold" price="$2,340" change="-0.12%" positive={false} />
            <MarketPulseItem symbol="VIX" price="14.2" change="-3.2%" positive={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTOPILOT CONTROLS
// ============================================================
function AutopilotControls() {
  const [autoTrading, setAutoTrading] = useState(false);
  const [strategy, setStrategy] = useState('all-weather');
  const [riskLevel, setRiskLevel] = useState(5);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-8 space-y-8">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-navy/50 border border-white/5">
          <div>
            <h3 className="font-semibold text-lg">Auto-Trading</h3>
            <p className="text-sm text-muted">Enable autonomous trade execution</p>
          </div>
          <button
            onClick={() => setAutoTrading(!autoTrading)}
            className={`w-16 h-8 rounded-full transition-all relative ${
              autoTrading ? 'bg-profit shadow-glow-profit' : 'bg-white/10'
            }`}
          >
            <div className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-1 ${
              autoTrading ? 'translate-x-9' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {autoTrading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 rounded-lg bg-profit/10 border border-profit/20 text-profit text-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Autopilot is ACTIVE — agents are trading on your behalf
          </motion.div>
        )}

        {/* Strategy Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Strategy</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['Value', 'Quant', 'Momentum', 'All-Weather', 'Aggressive', 'Conservative'].map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s.toLowerCase())}
                className={`px-4 py-3 rounded-xl border text-sm transition-all ${
                  strategy === s.toLowerCase()
                    ? 'border-electric/30 bg-electric/10 text-electric'
                    : 'border-white/10 hover:border-electric/20 hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Tolerance */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Risk Tolerance</label>
            <span className="text-sm font-mono text-electric">{riskLevel}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={riskLevel}
            onChange={(e) => setRiskLevel(Number(e.target.value))}
            className="w-full accent-electric"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>Ultra-Conservative</span>
            <span>Saitama Mode</span>
          </div>
        </div>

        {/* Asset Classes */}
        <div>
          <label className="text-sm font-medium mb-3 block">Asset Classes</label>
          <div className="flex flex-wrap gap-2">
            {['Stocks', 'ETFs', 'Options', 'Crypto', 'Forex'].map((a) => (
              <button key={a} className="px-4 py-2 rounded-lg bg-electric/10 border border-electric/20 text-electric text-sm hover:bg-electric/20 transition-all">
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Limits */}
        <div>
          <label className="text-sm font-medium mb-3 block">Risk Limits</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1 block">Max Drawdown %</label>
              <input
                type="number"
                defaultValue={8}
                className="input-stark"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Daily Loss Limit %</label>
              <input
                type="number"
                defaultValue={3}
                className="input-stark"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Max Position Size %</label>
              <input
                type="number"
                defaultValue={5}
                className="input-stark"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Max Open Positions</label>
              <input
                type="number"
                defaultValue={10}
                className="input-stark"
              />
            </div>
          </div>
        </div>

        <button className="btn-primary w-full">
          Save Settings
        </button>
      </div>
    </div>
  );
}

// ============================================================
// AGENTS COUNCIL
// ============================================================
function AgentsCouncil() {
  const agents = [
    { name: 'The Researcher', emoji: '🕵️', status: 'active', task: 'Scanning NVDA earnings call', pnl: '+$450', score: 8.5, decisions: 342 },
    { name: 'The Strategist', emoji: '🧠', status: 'active', task: 'Evaluating AAPL margin of safety', pnl: '+$1,230', score: 9.2, decisions: 289 },
    { name: 'The Quant', emoji: '📊', status: 'active', task: 'Running Monte Carlo on SPY', pnl: '+$890', score: 8.8, decisions: 567 },
    { name: 'The Risk Manager', emoji: '🛡️', status: 'active', task: 'Monitoring portfolio beta: 1.2', pnl: '$0', score: 9.5, decisions: 1204 },
    { name: 'The Organizer', emoji: '📋', status: 'idle', task: 'Next cycle in 12 min', pnl: '$0', score: 8.0, decisions: 89 },
    { name: 'The Learner', emoji: '🎓', status: 'idle', task: 'Next review: Sunday 08:00', pnl: '$0', score: 7.8, decisions: 52 },
    { name: 'The Fundamentalist', emoji: '🔍', status: 'active', task: 'Reviewing MSFT 10-K filing', pnl: '+$560', score: 8.9, decisions: 198 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agents Council</h2>
          <p className="text-sm text-muted">7 agents, each specialized, each relentless</p>
        </div>
        <div className="badge badge-profit">
          <span className="w-2 h-2 rounded-full bg-profit mr-2 animate-pulse" />
          5 Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.name} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agent.emoji}</span>
                <div>
                  <h3 className="font-semibold">{agent.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`status-dot ${agent.status}`} />
                    <span className="text-xs text-muted capitalize">{agent.status}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-mono ${agent.pnl.startsWith('+') ? 'text-profit' : 'text-muted'}`}>
                  {agent.pnl}
                </p>
                <p className="text-xs text-muted">Score: {agent.score}/10</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-3">{agent.task}</p>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{agent.decisions} decisions made</span>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>View History</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TRADE HISTORY
// ============================================================
function TradeHistory({ trades }: { trades: any[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trade History</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-electric/10 border border-electric/20 text-electric text-sm">
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-muted p-4">Symbol</th>
                <th className="text-left text-xs text-muted p-4">Side</th>
                <th className="text-right text-xs text-muted p-4">Price</th>
                <th className="text-right text-xs text-muted p-4">Qty</th>
                <th className="text-right text-xs text-muted p-4">P&L</th>
                <th className="text-right text-xs text-muted p-4">P&L %</th>
                <th className="text-left text-xs text-muted p-4">Agent</th>
                <th className="text-left text-xs text-muted p-4">Status</th>
                <th className="text-right text-xs text-muted p-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono font-medium">{trade.symbol}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono">${trade.price}</td>
                  <td className="p-4 text-right font-mono">{trade.quantity}</td>
                  <td className={`p-4 text-right font-mono ${Number(trade.pnl) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {Number(trade.pnl) >= 0 ? '+' : ''}${trade.pnl}
                  </td>
                  <td className={`p-4 text-right font-mono ${Number(trade.pnlPct) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {Number(trade.pnlPct) >= 0 ? '+' : ''}{trade.pnlPct}%
                  </td>
                  <td className="p-4 text-muted text-xs">{trade.agent}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.status === 'filled' ? 'bg-profit/10 text-profit' : 'bg-gold/10 text-gold'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="p-4 text-right text-muted text-xs">{trade.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREDICTIONS
// ============================================================
function Predictions() {
  const markets = [
    { title: 'Will BTC hit $100K by June 2026?', category: 'Crypto', yesPrice: 0.67, volume: '$45,230', timeLeft: '3 months' },
    { title: 'Fed rate cut in Q2 2026?', category: 'Economics', yesPrice: 0.42, volume: '$128,500', timeLeft: '6 weeks' },
    { title: 'NVDA earnings beat estimates?', category: 'Tech', yesPrice: 0.78, volume: '$67,890', timeLeft: '2 weeks' },
    { title: 'S&P 500 > 5500 by EOY?', category: 'Finance', yesPrice: 0.55, volume: '$89,340', timeLeft: '9 months' },
    { title: 'Gold > $2500 by Q3?', category: 'Commodities', yesPrice: 0.38, volume: '$34,120', timeLeft: '5 months' },
    { title: 'ETH flippening in 2026?', category: 'Crypto', yesPrice: 0.12, volume: '$23,670', timeLeft: '9 months' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prediction Markets</h2>
          <p className="text-sm text-muted">Bet on outcomes. Earn from your market intuition.</p>
        </div>
        <button className="btn-primary text-sm">
          Create Market
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {markets.map((m, i) => (
          <div key={i} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="badge badge-electric">{m.category}</span>
              <span className="text-xs text-muted ml-auto">{m.timeLeft}</span>
            </div>
            <h3 className="font-semibold mb-4">{m.title}</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-profit font-mono">YES {(m.yesPrice * 100).toFixed(0)}%</span>
                  <span className="text-loss font-mono">NO {((1 - m.yesPrice) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-loss/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-profit rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${m.yesPrice * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Volume</p>
                <p className="text-sm font-mono font-medium">{m.volume}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 rounded-lg bg-profit/10 text-profit text-sm font-medium hover:bg-profit/20 transition-colors">
                Buy YES
              </button>
              <button className="flex-1 py-2 rounded-lg bg-loss/10 text-loss text-sm font-medium hover:bg-loss/20 transition-colors">
                Buy NO
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ANALYTICS
// ============================================================
function Analytics({ portfolioData }: { portfolioData: any[] }) {
  const monthlyReturns = [
    { month: 'Jan', return: 4.2 },
    { month: 'Feb', return: 2.1 },
    { month: 'Mar', return: -1.8 },
    { month: 'Apr', return: 5.6 },
    { month: 'May', return: 3.3 },
    { month: 'Jun', return: 1.9 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Portfolio Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Returns */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Monthly Returns</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReturns}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#8892B0" fontSize={10} />
                <YAxis stroke="#8892B0" fontSize={10} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 39, 0.9)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Return']}
                />
                <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                  {monthlyReturns.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#00FF88' : '#FF3366'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Drawdown Chart</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData.slice(-20).map((d, i) => ({
                date: d.date,
                drawdown: -Math.random() * 5,
              }))}>
                <defs>
                  <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3366" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF3366" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#8892B0" fontSize={10} />
                <YAxis stroke="#8892B0" fontSize={10} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 39, 0.9)',
                    border: '1px solid rgba(255, 51, 102, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value.toFixed(2)}%`, 'Drawdown']}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#FF3366"
                  fill="url(#drawdownGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Total Return" value="+27.8%" positive />
            <MetricCard label="Annualized Return" value="+38.2%" positive />
            <MetricCard label="Sharpe Ratio" value="2.34" positive />
            <MetricCard label="Sortino Ratio" value="3.12" positive />
            <MetricCard label="Max Drawdown" value="-3.2%" positive={false} />
            <MetricCard label="Calmar Ratio" value="8.4" positive />
            <MetricCard label="Win Rate" value="68.5%" positive />
            <MetricCard label="Profit Factor" value="2.1x" positive />
          </div>
        </div>

        {/* Agent Performance */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Agent Performance</h3>
          <div className="space-y-4">
            {[
              { name: 'Strategist', score: 9.2, pnl: '+$1,230', color: '#00D4FF' },
              { name: 'Quant', score: 8.8, pnl: '+$890', color: '#00FF88' },
              { name: 'Fundamentalist', score: 8.9, pnl: '+$560', color: '#FFD700' },
              { name: 'Researcher', score: 8.5, pnl: '+$450', color: '#00D4FF' },
              { name: 'Risk Manager', score: 9.5, pnl: '$0', color: '#FF3366' },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-4">
                <span className="text-sm w-28">{agent.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${agent.score * 10}%`, backgroundColor: agent.color }}
                  />
                </div>
                <span className="text-xs text-muted w-12 text-right">{agent.score}/10</span>
                <span className={`text-xs font-mono w-16 text-right ${
                  agent.pnl.startsWith('+') ? 'text-profit' : 'text-muted'
                }`}>{agent.pnl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-navy/50 border border-white/5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${positive ? 'text-profit' : 'text-loss'}`}>{value}</p>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
function SettingsPanel() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-8 space-y-8">
        {/* Broker Connections */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Broker Connections</h3>
          <div className="space-y-3">
            {[
              { name: 'Alpaca', desc: 'Stocks & ETFs', connected: false },
              { name: 'Interactive Brokers', desc: 'Global markets', connected: false },
              { name: 'Coinbase', desc: 'Crypto', connected: false },
              { name: 'Binance', desc: 'Crypto & Derivatives', connected: false },
            ].map((broker) => (
              <div key={broker.name} className="flex items-center justify-between p-4 rounded-xl bg-navy/50 border border-white/5">
                <div>
                  <p className="font-medium">{broker.name}</p>
                  <p className="text-xs text-muted">{broker.desc}</p>
                </div>
                <button className="px-4 py-2 rounded-lg border border-white/10 text-sm text-muted hover:text-white hover:border-electric/30 transition-all">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Notifications</h3>
          <div className="space-y-2">
            {[
              { label: 'Trade executed', desc: 'Get notified on every trade' },
              { label: 'Risk alert', desc: 'Circuit breaker triggered' },
              { label: 'Daily digest', desc: 'End-of-day summary' },
              { label: 'Agent update', desc: 'When agents make decisions' },
              { label: 'Weekly review', desc: 'Learner agent weekly report' },
            ].map((n) => (
              <label key={n.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer">
                <div>
                  <span className="text-sm font-medium">{n.label}</span>
                  <p className="text-xs text-muted">{n.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="accent-electric w-4 h-4" />
              </label>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div>
          <h3 className="font-semibold text-lg mb-4">API Access</h3>
          <p className="text-sm text-muted mb-4">Generate API keys to integrate StarkTrade AI with your own systems.</p>
          <button className="btn-outline text-sm">
            Generate API Key
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function HeroStat({ label, value, change, positive, icon }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted">{icon}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold font-mono counter-value">{value}</p>
      <p className={`text-xs font-mono mt-1 ${positive ? 'text-profit' : 'text-loss'}`}>{change}</p>
    </div>
  );
}

function ActivityItem({ agent, action, status }: { agent: string; action: string; status: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className={`status-dot ${status === 'active' ? 'busy' : status === 'success' ? 'active' : status === 'warning' ? 'busy' : 'idle'} mt-1.5`} />
      <div>
        <span className="text-muted text-xs">{agent}</span>
        <p className="text-white/90 text-xs mt-0.5">{action}</p>
      </div>
    </div>
  );
}

function RiskCell({ label, value, level }: { label: string; value: string; level: string }) {
  const colors: Record<string, string> = {
    low: 'border-profit/30 text-profit bg-profit/5',
    medium: 'border-yellow-400/30 text-yellow-400 bg-yellow-400/5',
    high: 'border-loss/30 text-loss bg-loss/5',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[level]} text-center`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}

function MarketPulseItem({ symbol, price, change, positive }: {
  symbol: string; price: string; change: string; positive: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-navy/50 border border-white/5 text-center">
      <p className="text-xs text-muted mb-1">{symbol}</p>
      <p className="text-sm font-bold font-mono">{price}</p>
      <p className={`text-xs font-mono ${positive ? 'text-profit' : 'text-loss'}`}>{change}</p>
    </div>
  );
}
