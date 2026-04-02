'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart3, Brain, Shield, Settings, TrendingUp, Bell,
  DollarSign, Target, Zap, RefreshCw, LogOut, ChevronRight, Plus,
  Play, Pause, Download, Copy, ExternalLink, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { apiFetch, clearAuthToken, getAuthToken } from '@/lib/api';
import { ReferralDashboard } from '@/components/ReferralSystem';

// ============================================================
// TYPES
// ============================================================
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_verified: boolean;
  risk_tolerance: number;
  strategy: string;
  auto_trading_enabled: boolean;
}

interface Portfolio {
  id: string;
  name: string;
  total_value: number;
  cash_balance: number;
  daily_pnl: number;
  total_pnl: number;
  is_paper: boolean;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number | null;
  stop_loss: number | null;
  status: string;
  pnl: number | null;
  reasoning: string | null;
  created_at: string;
}

interface AgentStatus {
  name: string;
  status: string;
  role: string;
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('command');
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaperMode, setIsPaperMode] = useState(true);
  const [autoTrading, setAutoTrading] = useState(false);

  // Check auth and load data
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/onboarding');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userRes, portfolioRes, tradesRes, agentsRes] = await Promise.all([
        apiFetch('/api/v1/auth/me'),
        apiFetch('/api/v1/portfolio/'),
        apiFetch('/api/v1/trades/'),
        apiFetch('/api/v1/agents/'),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        setAutoTrading(userData.auto_trading_enabled);
      } else {
        clearAuthToken();
        router.push('/onboarding');
        return;
      }

      if (portfolioRes.ok) {
        const portfolios = await portfolioRes.json();
        if (portfolios.length > 0) setPortfolio(portfolios[0]);
      }

      if (tradesRes.ok) {
        setTrades(await tradesRes.json());
      }

      if (agentsRes.ok) {
        setAgents(await agentsRes.json());
      }
    } catch (err) {
      setError('Failed to load data');
    }
    setLoading(false);
  };

  const toggleAutoTrading = async () => {
    // In production, this would call the backend
    setAutoTrading(!autoTrading);
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push('/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-electric mx-auto mb-4 animate-pulse" />
          <p className="text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalValue = portfolio?.total_value || 100000;
  const dailyPnl = portfolio?.daily_pnl || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const totalReturn = ((totalPnl / 100000) * 100).toFixed(2);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass border-r border-white/5 p-4 flex flex-col md:min-h-screen">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-electric" />
          <div>
            <span className="font-bold">StarkTrade AI</span>
            <span className="block text-[10px] text-muted">by ELEV8 DIGITAL</span>
          </div>
        </Link>

        {/* Paper/Live Mode Toggle */}
        <div className="mb-6 p-3 rounded-xl bg-navy/50 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Mode</span>
            <span className={`text-xs px-2 py-0.5 rounded ${isPaperMode ? 'bg-gold/10 text-gold' : 'bg-profit/10 text-profit'}`}>
              {isPaperMode ? 'PAPER' : 'LIVE'}
            </span>
          </div>
          <button
            onClick={() => setIsPaperMode(!isPaperMode)}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
              isPaperMode 
                ? 'bg-gold/10 text-gold border border-gold/20' 
                : 'bg-profit/10 text-profit border border-profit/20'
            }`}
          >
            {isPaperMode ? 'Switch to Live Trading' : 'Switch to Paper'}
          </button>
          {!isPaperMode && (
            <p className="text-[10px] text-loss mt-2">⚠️ Real money at risk</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {[
            { id: 'command', label: 'Command Center', icon: Activity },
            { id: 'autopilot', label: 'Autopilot', icon: Zap },
            { id: 'agents', label: 'Agents Council', icon: Brain },
            { id: 'trades', label: 'Trade History', icon: TrendingUp },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-electric/10 text-electric border border-electric/20'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}

          <div className="border-t border-white/5 my-2 pt-2">
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-loss hover:bg-loss/5 transition-all"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </div>
        </nav>

        {/* User Section */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-electric text-sm font-bold">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted">{isPaperMode ? 'Paper Account' : 'Live Account'}</p>
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-white">
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
              {activeTab === 'command' && 'Command Center'}
              {activeTab === 'autopilot' && 'Autopilot Controls'}
              {activeTab === 'agents' && 'Agents Council'}
              {activeTab === 'trades' && 'Trade History'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="text-sm text-muted">
              Welcome back, {user?.full_name || 'Trader'}
              {isPaperMode ? ' · Paper Trading' : ' · Live Trading'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 rounded-lg glass text-muted hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'command' && (
              <CommandCenterTab
                portfolio={portfolio}
                trades={trades}
                agents={agents}
                autoTrading={autoTrading}
                onToggleAutoTrading={toggleAutoTrading}
                isPaperMode={isPaperMode}
              />
            )}
            {activeTab === 'autopilot' && (
              <AutopilotTab autoTrading={autoTrading} onToggle={toggleAutoTrading} />
            )}
            {activeTab === 'agents' && <AgentsTab agents={agents} />}
            {activeTab === 'trades' && <TradesTab trades={trades} />}
            {activeTab === 'analytics' && <AnalyticsTab portfolio={portfolio} trades={trades} />}
            {activeTab === 'settings' && <SettingsTab user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================================
// COMMAND CENTER TAB
// ============================================================
function CommandCenterTab({ portfolio, trades, agents, autoTrading, onToggleAutoTrading, isPaperMode }: {
  portfolio: Portfolio | null;
  trades: Trade[];
  agents: AgentStatus[];
  autoTrading: boolean;
  onToggleAutoTrading: () => void;
  isPaperMode: boolean;
}) {
  const totalValue = portfolio?.total_value || 100000;
  const dailyPnl = portfolio?.daily_pnl || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const winRate = trades.length > 0 
    ? ((trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Portfolio Value</span>
          </div>
          <p className="text-xl font-bold font-mono">${totalValue.toLocaleString()}</p>
          <p className={`text-xs font-mono ${dailyPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {dailyPnl >= 0 ? '+' : ''}{dailyPnl.toFixed(2)} today
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Total P&L</span>
          </div>
          <p className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </p>
          <p className="text-xs text-muted">{((totalPnl / 100000) * 100).toFixed(2)}% return</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Win Rate</span>
          </div>
          <p className="text-xl font-bold font-mono">{winRate}%</p>
          <p className="text-xs text-muted">{trades.length} trades</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Agents Active</span>
          </div>
          <p className="text-xl font-bold font-mono">{agents.filter(a => a.status === 'active').length}/{agents.length}</p>
          <p className="text-xs text-profit">Online</p>
        </div>
      </div>

      {/* Autopilot Status */}
      <div className={`glass-card p-6 border ${autoTrading ? 'border-profit/30' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              autoTrading ? 'bg-profit/10' : 'bg-white/5'
            }`}>
              <Zap className={`w-6 h-6 ${autoTrading ? 'text-profit' : 'text-muted'}`} />
            </div>
            <div>
              <h3 className="font-semibold">Autopilot {autoTrading ? 'ACTIVE' : 'PAUSED'}</h3>
              <p className="text-sm text-muted">
                {autoTrading 
                  ? `${agents.filter(a => a.status === 'active').length} agents trading on your behalf`
                  : 'Click to enable autonomous trading'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onToggleAutoTrading}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              autoTrading 
                ? 'bg-loss/10 text-loss border border-loss/20 hover:bg-loss/20' 
                : 'bg-profit/10 text-profit border border-profit/20 hover:bg-profit/20'
            }`}
          >
            {autoTrading ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Trades</h3>
          <button 
            onClick={() => {/* Navigate to trades tab */}}
            className="text-xs text-electric hover:text-electric/80 flex items-center gap-1"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {trades.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            No trades yet. Activate autopilot to start trading.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-muted pb-2">Symbol</th>
                  <th className="text-left text-xs text-muted pb-2">Side</th>
                  <th className="text-right text-xs text-muted pb-2">Price</th>
                  <th className="text-right text-xs text-muted pb-2">P&L</th>
                  <th className="text-left text-xs text-muted pb-2">Status</th>
                  <th className="text-right text-xs text-muted pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 5).map((trade) => (
                  <tr key={trade.id} className="border-b border-white/5">
                    <td className="py-2 font-mono font-medium">{trade.symbol}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      ${trade.entry_price?.toFixed(2) || '—'}
                    </td>
                    <td className={`py-2 text-right font-mono ${
                      (trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'
                    }`}>
                      {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        trade.status === 'filled' ? 'bg-profit/10 text-profit' : 'bg-gold/10 text-gold'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="py-2 text-right text-muted text-xs">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agents Status */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Agents Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {agents.map((agent) => (
            <div key={agent.name} className="p-3 rounded-xl bg-navy/50 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-profit animate-pulse' : 'bg-muted'
                }`} />
                <span className="text-xs text-muted">{agent.role}</span>
              </div>
              <p className="text-sm font-medium truncate">{agent.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTOPILOT TAB
// ============================================================
function AutopilotTab({ autoTrading, onToggle }: { autoTrading: boolean; onToggle: () => void }) {
  const [strategy, setStrategy] = useState('all-weather');
  const [riskLevel, setRiskLevel] = useState(5);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-8 space-y-6">
        {/* Master Toggle */}
        <div className={`p-4 rounded-xl border ${autoTrading ? 'bg-profit/5 border-profit/20' : 'bg-navy/50 border-white/5'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Auto-Trading</h3>
              <p className="text-sm text-muted">
                {autoTrading ? 'Agents are actively trading on your behalf' : 'Enable to start autonomous trading'}
              </p>
            </div>
            <button
              onClick={onToggle}
              className={`w-16 h-8 rounded-full transition-all relative ${
                autoTrading ? 'bg-profit' : 'bg-white/10'
              }`}
            >
              <div className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-1 ${
                autoTrading ? 'translate-x-9' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Strategy */}
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
                    : 'border-white/10 hover:border-electric/20'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Level */}
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
        </div>

        <button className="btn-primary w-full">Save Settings</button>
      </div>
    </div>
  );
}

// ============================================================
// AGENTS TAB
// ============================================================
function AgentsTab({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Agents Council</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.name} className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  agent.status === 'active' ? 'bg-profit animate-pulse' : 'bg-muted'
                }`} />
                <div>
                  <h3 className="font-semibold">{agent.name}</h3>
                  <p className="text-xs text-muted">{agent.role}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                agent.status === 'active' ? 'bg-profit/10 text-profit' : 'bg-muted/10 text-muted'
              }`}>
                {agent.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TRADES TAB
// ============================================================
function TradesTab({ trades }: { trades: Trade[] }) {
  const handleExport = () => {
    const csv = [
      ['Symbol', 'Side', 'Quantity', 'Entry Price', 'Stop Loss', 'P&L', 'Status', 'Date'],
      ...trades.map(t => [
        t.symbol, t.side, t.quantity, t.entry_price || '', t.stop_loss || '',
        t.pnl || '', t.status, t.created_at
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'starktrade-trades.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trade History</h2>
        <button onClick={handleExport} className="btn-outline text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Activity className="w-12 h-12 text-muted/30 mx-auto mb-4" />
          <p className="text-muted">No trades yet. Activate autopilot to start trading.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-muted p-4">Symbol</th>
                <th className="text-left text-xs text-muted p-4">Side</th>
                <th className="text-right text-xs text-muted p-4">Qty</th>
                <th className="text-right text-xs text-muted p-4">Price</th>
                <th className="text-right text-xs text-muted p-4">Stop Loss</th>
                <th className="text-right text-xs text-muted p-4">P&L</th>
                <th className="text-left text-xs text-muted p-4">Status</th>
                <th className="text-left text-xs text-muted p-4">Reason</th>
                <th className="text-right text-xs text-muted p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-mono font-medium">{trade.symbol}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono">{trade.quantity}</td>
                  <td className="p-4 text-right font-mono">${trade.entry_price?.toFixed(2) || '—'}</td>
                  <td className="p-4 text-right font-mono">${trade.stop_loss?.toFixed(2) || '—'}</td>
                  <td className={`p-4 text-right font-mono ${(trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.status === 'filled' ? 'bg-profit/10 text-profit' : 'bg-gold/10 text-gold'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted max-w-[200px] truncate">
                    {trade.reasoning || '—'}
                  </td>
                  <td className="p-4 text-right text-xs text-muted">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ANALYTICS TAB
// ============================================================
function AnalyticsTab({ portfolio, trades }: { portfolio: Portfolio | null; trades: Trade[] }) {
  const wins = trades.filter(t => (t.pnl || 0) > 0);
  const losses = trades.filter(t => (t.pnl || 0) < 0);
  const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
  const avgWin = wins.length > 0 ? (wins.reduce((a, t) => a + (t.pnl || 0), 0) / wins.length).toFixed(2) : '0';
  const avgLoss = losses.length > 0 ? (losses.reduce((a, t) => a + (t.pnl || 0), 0) / losses.length).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">Total Trades</p>
          <p className="text-2xl font-bold font-mono">{trades.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">Win Rate</p>
          <p className="text-2xl font-bold font-mono text-profit">{winRate}%</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">Avg Win</p>
          <p className="text-2xl font-bold font-mono text-profit">${avgWin}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">Avg Loss</p>
          <p className="text-2xl font-bold font-mono text-loss">${avgLoss}</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Performance Summary</h3>
        {trades.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No trades to analyze yet.</p>
        ) : (
          <p className="text-sm text-muted">
            You've made {trades.length} trades with a {winRate}% win rate. 
            Your average winning trade is ${avgWin} and average losing trade is ${avgLoss}.
            {portfolio && ` Your portfolio is currently valued at $${portfolio.total_value.toLocaleString()}.`}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function SettingsTab({ user }: { user: User | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="glass-card p-8 space-y-6">
          <h3 className="font-semibold text-lg">Account</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Role</label>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Strategy</label>
              <p className="font-medium capitalize">{user?.strategy?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-xs text-muted">Risk Tolerance</label>
              <p className="font-medium">{user?.risk_tolerance}/10</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-4">
          <h3 className="font-semibold text-lg">Broker Connections</h3>
          {['Alpaca', 'Interactive Brokers', 'Coinbase', 'Binance'].map((broker) => (
            <div key={broker} className="flex items-center justify-between p-4 rounded-xl bg-navy/50 border border-white/5">
              <span>{broker}</span>
              <button className="px-4 py-2 rounded-lg border border-white/10 text-sm text-muted hover:text-white transition-all">
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>

      <ReferralDashboard />
    </div>
  );
}
