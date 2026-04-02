'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart3, Brain, Shield, Settings, TrendingUp, Bell,
  DollarSign, Target, Zap, RefreshCw, LogOut, ChevronRight, Plus,
  Play, Pause, Download, Copy, ExternalLink, AlertCircle, CheckCircle,
  Loader2, Wifi, WifiOff
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { apiFetch, clearAuthToken } from '@/lib/api';
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
// SKELETON LOADER
// ============================================================
function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 glass border-r border-white/5 p-4">
        <div className="shimmer h-8 w-32 rounded mb-8" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="shimmer h-10 rounded-lg" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="shimmer h-8 w-48 rounded mb-2" />
        <div className="shimmer h-4 w-64 rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-xl" />
          ))}
        </div>
        <div className="shimmer h-64 rounded-xl" />
      </main>
    </div>
  );
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
  const [isConnected, setIsConnected] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(true);
  const [autoTrading, setAutoTrading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check auth and load data
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/onboarding');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // First check if user is authenticated
      const userRes = await apiFetch('/api/v1/auth/me');
      
      if (!userRes.ok) {
        // Token expired or invalid
        clearAuthToken();
        router.push('/onboarding');
        return;
      }

      const userData = await userRes.json();
      setUser(userData);
      setAutoTrading(userData.auto_trading_enabled);
      setIsConnected(true);

      // Load other data in parallel (non-critical)
      const [portfolioRes, tradesRes, agentsRes] = await Promise.all([
        apiFetch('/api/v1/portfolio/').catch(() => null),
        apiFetch('/api/v1/trades/').catch(() => null),
        apiFetch('/api/v1/agents/').catch(() => null),
      ]);

      if (portfolioRes?.ok) {
        const portfolios = await portfolioRes.json();
        if (portfolios.length > 0) setPortfolio(portfolios[0]);
      }

      if (tradesRes?.ok) {
        setTrades(await tradesRes.json());
      }

      if (agentsRes?.ok) {
        setAgents(await agentsRes.json());
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError('Connection error. Please check your internet.');
      setIsConnected(false);
    }
    setLoading(false);
  };

  const toggleAutoTrading = async () => {
    setAutoTrading(!autoTrading);
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push('/onboarding');
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass border-r border-white/5 p-4 flex flex-col md:min-h-screen">
        <Link href="/" className="flex items-center gap-2.5 mb-8 group">
          <div className="relative">
            <Zap className="w-7 h-7 text-electric group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <span className="font-bold tracking-tight">StarkTrade AI</span>
            <span className="block text-[10px] text-muted">by ELEV8 DIGITAL</span>
          </div>
        </Link>

        {/* Connection Status */}
        <div className={`mb-4 p-2 rounded-lg text-xs flex items-center gap-2 ${
          isConnected ? 'bg-profit/5 text-profit' : 'bg-loss/5 text-loss'
        }`}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isConnected ? 'Connected to backend' : 'Disconnected'}
        </div>

        {/* Paper/Live Mode Toggle */}
        <div className="mb-6 p-3 rounded-xl bg-navy/50 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Trading Mode</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isPaperMode ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-profit/10 text-profit border border-profit/20'
            }`}>
              {isPaperMode ? 'PAPER' : 'LIVE'}
            </span>
          </div>
          <button
            onClick={() => setIsPaperMode(!isPaperMode)}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
              isPaperMode 
                ? 'bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20' 
                : 'bg-profit/10 text-profit border border-profit/20 hover:bg-profit/20'
            }`}
          >
            {isPaperMode ? 'Switch to Live Trading' : 'Switch to Paper'}
          </button>
          {!isPaperMode && (
            <p className="text-[10px] text-loss mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Real money at risk
            </p>
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
                <span className="flex-1 text-left">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-electric" />
                )}
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
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-electric/20 flex items-center justify-center text-electric text-sm font-bold">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || 'Trader'}</p>
              <p className="text-[10px] text-muted">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-all" title="Logout">
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
            <h1 className="text-2xl font-bold tracking-tight">
              {activeTab === 'command' && 'Command Center'}
              {activeTab === 'autopilot' && 'Autopilot Controls'}
              {activeTab === 'agents' && 'Agents Council'}
              {activeTab === 'trades' && 'Trade History'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              Welcome back, <span className="text-white">{user?.full_name || 'Trader'}</span>
              <span className="mx-2">·</span>
              <span className={isPaperMode ? 'text-gold' : 'text-profit'}>
                {isPaperMode ? 'Paper Trading' : 'Live Trading'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted hidden md:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <button 
              onClick={loadData} 
              className="p-2.5 rounded-lg glass text-muted hover:text-white transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-loss/10 border border-loss/20 text-loss text-sm flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <p className="text-xs opacity-70 mt-1">Click refresh to try again.</p>
            </div>
            <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-loss/20 text-loss text-xs font-medium hover:bg-loss/30 transition-colors">
              Retry
            </button>
          </motion.div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'command' && (
              <CommandCenterTab
                portfolio={portfolio}
                trades={trades}
                agents={agents}
                autoTrading={autoTrading}
                onToggleAutoTrading={toggleAutoTrading}
                isPaperMode={isPaperMode}
                onTabChange={setActiveTab}
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
function CommandCenterTab({ portfolio, trades, agents, autoTrading, onToggleAutoTrading, isPaperMode, onTabChange }: {
  portfolio: Portfolio | null;
  trades: Trade[];
  agents: AgentStatus[];
  autoTrading: boolean;
  onToggleAutoTrading: () => void;
  isPaperMode: boolean;
  onTabChange: (tab: string) => void;
}) {
  const totalValue = portfolio?.total_value || 100000;
  const dailyPnl = portfolio?.daily_pnl || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const cashBalance = portfolio?.cash_balance || 100000;
  const winRate = trades.length > 0 
    ? ((trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-electric" />
            </div>
            <span className="text-xs text-muted">Portfolio</span>
          </div>
          <p className="text-xl font-bold font-mono counter-value">${totalValue.toLocaleString()}</p>
          <p className={`text-xs font-mono mt-1 ${dailyPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {dailyPnl >= 0 ? '+' : ''}{dailyPnl.toFixed(2)} today
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${totalPnl >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
              <TrendingUp className={`w-4 h-4 ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`} />
            </div>
            <span className="text-xs text-muted">Total P&L</span>
          </div>
          <p className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </p>
          <p className="text-xs text-muted mt-1">{((totalPnl / 100000) * 100).toFixed(2)}% return</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-gold" />
            </div>
            <span className="text-xs text-muted">Win Rate</span>
          </div>
          <p className="text-xl font-bold font-mono">{winRate}%</p>
          <p className="text-xs text-muted mt-1">{trades.length} trades</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-electric" />
            </div>
            <span className="text-xs text-muted">Cash Available</span>
          </div>
          <p className="text-xl font-bold font-mono">${cashBalance.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">{((cashBalance / totalValue) * 100).toFixed(0)}% of portfolio</p>
        </motion.div>
      </div>

      {/* Autopilot Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }}
        className={`glass-card p-6 border transition-all ${autoTrading ? 'border-profit/30 shadow-glow-profit' : 'border-white/10'}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              autoTrading ? 'bg-profit/10 animate-pulse' : 'bg-white/5'
            }`}>
              <Zap className={`w-7 h-7 ${autoTrading ? 'text-profit' : 'text-muted'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Autopilot {autoTrading ? 'ACTIVE' : 'PAUSED'}</h3>
              <p className="text-sm text-muted">
                {autoTrading 
                  ? `${agents.filter(a => a.status === 'active').length} agents trading on your behalf`
                  : 'Enable to start autonomous trading'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onToggleAutoTrading}
            className={`px-8 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              autoTrading 
                ? 'bg-loss/10 text-loss border border-loss/20 hover:bg-loss/20' 
                : 'bg-profit text-navy hover:bg-profit/90 shadow-glow-profit'
            }`}
          >
            {autoTrading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoTrading ? 'Pause Autopilot' : 'Activate Autopilot'}
          </button>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Trades</h3>
            <button 
              onClick={() => onTabChange('trades')}
              className="text-xs text-electric hover:text-electric/80 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {trades.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted/20 mx-auto mb-3" />
              <p className="text-sm text-muted mb-2">No trades yet</p>
              <p className="text-xs text-muted/60">Activate autopilot to start trading</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs text-muted pb-3 font-medium">Symbol</th>
                    <th className="text-left text-xs text-muted pb-3 font-medium">Side</th>
                    <th className="text-right text-xs text-muted pb-3 font-medium">Price</th>
                    <th className="text-right text-xs text-muted pb-3 font-medium">P&L</th>
                    <th className="text-left text-xs text-muted pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 5).map((trade, i) => (
                    <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 font-mono font-medium">{trade.symbol}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                        }`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono">
                        ${trade.entry_price?.toFixed(2) || '—'}
                      </td>
                      <td className={`py-3 text-right font-mono font-medium ${
                        (trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'
                      }`}>
                        {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          trade.status === 'filled' ? 'bg-profit/10 text-profit' : 'bg-gold/10 text-gold'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Agents Status */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="font-semibold mb-4">Agents Online</h3>
          <div className="space-y-3">
            {agents.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">Loading agents...</p>
            ) : (
              agents.map((agent) => (
                <div key={agent.name} className="flex items-center gap-3 p-3 rounded-xl bg-navy/30 border border-white/5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    agent.status === 'active' ? 'bg-profit animate-pulse' : 'bg-muted'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-[10px] text-muted">{agent.role}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    agent.status === 'active' ? 'bg-profit/10 text-profit' : 'bg-white/5 text-muted'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => onTabChange('agents')}
            className="w-full mt-4 py-2 text-xs text-electric hover:text-electric/80 transition-colors flex items-center justify-center gap-1"
          >
            View All Agents <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-8 space-y-8">
        {/* Master Toggle */}
        <div className={`p-5 rounded-xl border transition-all ${autoTrading ? 'bg-profit/5 border-profit/20' : 'bg-navy/50 border-white/5'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Auto-Trading</h3>
              <p className="text-sm text-muted mt-1">
                {autoTrading ? 'Agents are actively trading on your behalf' : 'Enable to start autonomous trading'}
              </p>
            </div>
            <button
              onClick={onToggle}
              className={`w-16 h-8 rounded-full transition-all relative ${
                autoTrading ? 'bg-profit' : 'bg-white/10'
              }`}
            >
              <div className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-1 shadow ${
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
                className={`px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
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
            className="w-full accent-electric h-2 rounded-full"
          />
          <div className="flex justify-between text-xs text-muted mt-2">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            'Save Settings'
          )}
        </button>
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
      <h2 className="text-2xl font-bold tracking-tight">Agents Council</h2>
      <p className="text-sm text-muted">7 specialized AI agents, each with a unique trading strategy.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.length === 0 ? (
          [...Array(7)].map((_, i) => (
            <div key={i} className="glass-card p-6 shimmer h-24" />
          ))
        ) : (
          agents.map((agent) => (
            <div key={agent.name} className="glass-card p-6 hover:border-electric/20 transition-all">
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
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  agent.status === 'active' ? 'bg-profit/10 text-profit' : 'bg-muted/10 text-muted'
                }`}>
                  {agent.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// TRADES TAB
// ============================================================
function TradesTab({ trades }: { trades: Trade[] }) {
  const handleExport = () => {
    if (trades.length === 0) return;
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
    a.download = `starktrade-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trade History</h2>
          <p className="text-sm text-muted mt-1">{trades.length} trades recorded</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={trades.length === 0}
          className="btn-outline text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Activity className="w-16 h-16 text-muted/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trades Yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Your trade history will appear here once autopilot starts executing trades.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-navy/30">
                  <th className="text-left text-xs text-muted p-4 font-medium">Symbol</th>
                  <th className="text-left text-xs text-muted p-4 font-medium">Side</th>
                  <th className="text-right text-xs text-muted p-4 font-medium">Qty</th>
                  <th className="text-right text-xs text-muted p-4 font-medium">Price</th>
                  <th className="text-right text-xs text-muted p-4 font-medium">Stop Loss</th>
                  <th className="text-right text-xs text-muted p-4 font-medium">P&L</th>
                  <th className="text-left text-xs text-muted p-4 font-medium">Status</th>
                  <th className="text-right text-xs text-muted p-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-medium">{trade.symbol}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                      }`}>
                        {trade.side}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">{trade.quantity}</td>
                    <td className="p-4 text-right font-mono">${trade.entry_price?.toFixed(2) || '—'}</td>
                    <td className="p-4 text-right font-mono">${trade.stop_loss?.toFixed(2) || '—'}</td>
                    <td className={`p-4 text-right font-mono font-medium ${(trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        trade.status === 'filled' ? 'bg-profit/10 text-profit' : 'bg-gold/10 text-gold'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-xs text-muted">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0) / losses.length).toFixed(2) : '0';
  const profitFactor = losses.length > 0 && Number(avgLoss) > 0 
    ? (Number(avgWin) / Number(avgLoss)).toFixed(2) 
    : '—';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: trades.length, color: 'text-white' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-profit' },
          { label: 'Avg Win', value: `$${avgWin}`, color: 'text-profit' },
          { label: 'Avg Loss', value: `$${avgLoss}`, color: 'text-loss' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-5"
          >
            <p className="text-xs text-muted mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Performance Summary</h3>
          {trades.length === 0 ? (
            <p className="text-sm text-muted">No trades to analyze yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted">Profit Factor</span>
                <span className="text-sm font-mono">{profitFactor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Best Trade</span>
                <span className="text-sm font-mono text-profit">
                  +${wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)).toFixed(2) : '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Worst Trade</span>
                <span className="text-sm font-mono text-loss">
                  ${losses.length > 0 ? Math.min(...losses.map(t => t.pnl || 0)).toFixed(2) : '0'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Portfolio</h3>
          {portfolio ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted">Total Value</span>
                <span className="text-sm font-mono">${portfolio.total_value.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Cash Available</span>
                <span className="text-sm font-mono">${portfolio.cash_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Invested</span>
                <span className="text-sm font-mono">
                  ${(portfolio.total_value - portfolio.cash_balance).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Loading portfolio...</p>
          )}
        </div>
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
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-electric" />
            </span>
            Account Settings
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Email', value: user?.email || '—' },
              { label: 'Role', value: user?.role?.toUpperCase() || 'FREE' },
              { label: 'Strategy', value: user?.strategy?.replace('_', ' ')?.toUpperCase() || 'ALL WEATHER' },
              { label: 'Risk Tolerance', value: `${user?.risk_tolerance || 5}/10` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-navy/30">
                <span className="text-sm text-muted">{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 space-y-4">
          <h3 className="font-semibold text-lg">Broker Connections</h3>
          <p className="text-sm text-muted">Connect a broker to enable live trading with real money.</p>
          {[
            { name: 'Alpaca', desc: 'Commission-free stocks', available: true },
            { name: 'Interactive Brokers', desc: 'Global markets', available: true },
            { name: 'Coinbase', desc: 'Cryptocurrency', available: true },
            { name: 'Binance', desc: 'Crypto & derivatives', available: true },
          ].map((broker) => (
            <div key={broker.name} className="flex items-center justify-between p-4 rounded-xl bg-navy/50 border border-white/5">
              <div>
                <p className="font-medium text-sm">{broker.name}</p>
                <p className="text-xs text-muted">{broker.desc}</p>
              </div>
              <button className="px-4 py-2 rounded-lg border border-electric/20 text-electric text-xs font-medium hover:bg-electric/10 transition-all">
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
