'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart3, Brain, Shield, Settings, TrendingUp, Bell,
  DollarSign, Target, Zap, RefreshCw, LogOut, ChevronRight, Menu, X,
  Sun, Moon, Play, Pause, Download, AlertCircle, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Clock, Sparkles, Flame, Layers
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAuthToken } from '@/lib/api';
import { useTheme } from '@/lib/theme';
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

interface Prediction {
  id: string;
  title: string;
  category: string;
  yes_price: number;
  volume: number;
  status: string;
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('command');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [isPaperMode, setIsPaperMode] = useState(true);
  const [autoTrading, setAutoTrading] = useState(false);

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
      const userRes = await apiFetch('/api/v1/auth/me');
      if (!userRes.ok) {
        clearAuthToken();
        router.push('/onboarding');
        return;
      }
      const userData = await userRes.json();
      setUser(userData);
      setAutoTrading(userData.auto_trading_enabled);
      setIsConnected(true);

      const [portfolioRes, tradesRes, agentsRes, predictionsRes] = await Promise.all([
        apiFetch('/api/v1/portfolio/').catch(() => null),
        apiFetch('/api/v1/trades/').catch(() => null),
        apiFetch('/api/v1/agents/').catch(() => null),
        apiFetch('/api/v1/predictions/markets').catch(() => null),
      ]);

      if (portfolioRes?.ok) {
        const portfolios = await portfolioRes.json();
        if (portfolios.length > 0) setPortfolio(portfolios[0]);
      }
      if (tradesRes?.ok) setTrades(await tradesRes.json());
      if (agentsRes?.ok) setAgents(await agentsRes.json());
      if (predictionsRes?.ok) setPredictions(await predictionsRes.json());
    } catch (err) {
      setError('Connection error');
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

  const totalValue = portfolio?.total_value || 100000;
  const dailyPnl = portfolio?.daily_pnl || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const cashBalance = portfolio?.cash_balance || 100000;
  const winRate = trades.length > 0 
    ? ((trades.filter(t => (t.pnl || 0) > 0).length / trades.length) * 100).toFixed(1)
    : '—';

  const NAV_ITEMS = [
    { id: 'command', label: 'Command Center', icon: Activity },
    { id: 'autopilot', label: 'Autopilot', icon: Zap },
    { id: 'agents', label: 'Agents', icon: Brain },
    { id: 'predictions', label: 'Predictions', icon: Flame },
    { id: 'trades', label: 'History', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen gradient-bg grid-bg flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-accent animate-pulse" />
          </div>
          <p className="text-secondary">Initializing systems...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen gradient-bg ${sidebarOpen ? 'overflow-hidden md:overflow-auto' : ''}`}>
      {/* Gradient Orbs (AntiGravity ambient lighting) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="gradient-orb w-96 h-96 bg-accent/20 -top-48 -left-48" />
        <div className="gradient-orb w-96 h-96 bg-profit/10 -bottom-48 -right-48" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass-dark border-b border-border-primary px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-2 rounded-xl hover:bg-white/5 transition-all ${sidebarOpen ? 'hamburger-active' : ''}`}
        >
          <div className="flex flex-col gap-1.5">
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </div>
        </button>
        
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          <span className="font-bold text-sm">StarkTrade</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-white/5 transition-all">
            {isDark ? <Sun className="w-4 h-4 text-secondary" /> : <Moon className="w-4 h-4 text-secondary" />}
          </button>
          <button onClick={loadData} className="p-2 rounded-xl hover:bg-white/5 transition-all">
            <RefreshCw className="w-4 h-4 text-secondary" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 glass-dark z-50 flex flex-col"
            >
              <SidebarContent
                user={user}
                isPaperMode={isPaperMode}
                setIsPaperMode={setIsPaperMode}
                activeTab={activeTab}
                setActiveTab={(tab: string) => { setActiveTab(tab); setSidebarOpen(false); }}
                navItems={NAV_ITEMS}
                onLogout={handleLogout}
                isConnected={isConnected}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-72 glass-dark border-r border-border-primary flex-col z-30">
        <SidebarContent
          user={user}
          isPaperMode={isPaperMode}
          setIsPaperMode={setIsPaperMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navItems={NAV_ITEMS}
          onLogout={handleLogout}
          isConnected={isConnected}
        />
      </aside>

      {/* Main Content */}
      <main className="md:ml-72 pt-16 md:pt-0 relative z-10">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between px-8 py-6 border-b border-border-primary">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {NAV_ITEMS.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              Welcome back, <span className="text-primary">{user?.full_name || 'Trader'}</span>
              <span className="mx-2">·</span>
              <span className={isPaperMode ? 'text-gold' : 'text-profit'}>
                {isPaperMode ? 'Paper Mode' : 'Live Mode'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl glass hover:bg-white/5 transition-all">
              {isDark ? <Sun className="w-4 h-4 text-secondary" /> : <Moon className="w-4 h-4 text-secondary" />}
            </button>
            <button onClick={loadData} className="p-2.5 rounded-xl glass hover:bg-white/5 transition-all">
              <RefreshCw className="w-4 h-4 text-secondary" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-loss/10 border border-loss/20 text-loss text-sm flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-loss/20 text-xs font-medium hover:bg-loss/30">
                Retry
              </button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'command' && (
                <CommandCenter
                  portfolio={portfolio}
                  trades={trades}
                  agents={agents}
                  predictions={predictions}
                  autoTrading={autoTrading}
                  onToggleAutoTrading={toggleAutoTrading}
                  isPaperMode={isPaperMode}
                  onTabChange={setActiveTab}
                />
              )}
              {activeTab === 'autopilot' && <AutopilotPanel autoTrading={autoTrading} onToggle={toggleAutoTrading} />}
              {activeTab === 'agents' && <AgentsPanel agents={agents} />}
              {activeTab === 'predictions' && <PredictionsPanel predictions={predictions} />}
              {activeTab === 'trades' && <TradesPanel trades={trades} />}
              {activeTab === 'analytics' && <AnalyticsPanel portfolio={portfolio} trades={trades} />}
              {activeTab === 'settings' && <SettingsPanel user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// SIDEBAR CONTENT
// ============================================================
function SidebarContent({ user, isPaperMode, setIsPaperMode, activeTab, setActiveTab, navItems, onLogout, isConnected }: any) {
  return (
    <div className="flex flex-col h-full p-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8 px-2">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div className="absolute inset-0 w-10 h-10 bg-accent/20 rounded-2xl blur-xl" />
        </div>
        <div>
          <span className="font-bold tracking-tight">StarkTrade</span>
          <span className="block text-[10px] text-secondary -mt-0.5">by ELEV8 DIGITAL</span>
        </div>
      </Link>

      {/* Connection Status */}
      <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
        isConnected ? 'bg-profit/5 text-profit border border-profit/10' : 'bg-loss/5 text-loss border border-loss/10'
      }`}>
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 p-1 rounded-xl bg-input border border-border-primary flex">
        <button
          onClick={() => setIsPaperMode(true)}
          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            isPaperMode ? 'bg-gold/20 text-gold' : 'text-secondary hover:text-primary'
          }`}
        >
          Paper
        </button>
        <button
          onClick={() => setIsPaperMode(false)}
          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            !isPaperMode ? 'bg-profit/20 text-profit' : 'text-secondary hover:text-primary'
          }`}
        >
          Live
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((tab: any) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-secondary hover:text-primary hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{tab.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          );
        })}

        {user?.role === 'admin' && (
          <div className="border-t border-border-primary my-2 pt-2">
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-loss hover:bg-loss/5 transition-all"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="pt-4 border-t border-border-primary">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent font-bold">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || 'Trader'}</p>
            <p className="text-[10px] text-secondary truncate">{user?.email}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-secondary hover:text-primary rounded-lg hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMMAND CENTER
// ============================================================
function CommandCenter({ portfolio, trades, agents, predictions, autoTrading, onToggleAutoTrading, isPaperMode, onTabChange }: any) {
  const totalValue = portfolio?.total_value || 100000;
  const dailyPnl = portfolio?.daily_pnl || 0;
  const totalPnl = portfolio?.total_pnl || 0;
  const cashBalance = portfolio?.cash_balance || 100000;
  const winRate = trades.length > 0 
    ? ((trades.filter((t: any) => (t.pnl || 0) > 0).length / trades.length) * 100).toFixed(1)
    : '—';
  const invested = totalValue - cashBalance;

  return (
    <div className="space-y-6">
      {/* Hero Stats - Floating Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio', value: `$${totalValue.toLocaleString()}`, change: `${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toFixed(2)} today`, positive: dailyPnl >= 0, icon: DollarSign, delay: 0 },
          { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, change: `${((totalPnl / 100000) * 100).toFixed(2)}% return`, positive: totalPnl >= 0, icon: TrendingUp, delay: 0.05 },
          { label: 'Win Rate', value: `${winRate}%`, change: `${trades.length} trades`, positive: true, icon: Target, delay: 0.1 },
          { label: 'Cash', value: `$${cashBalance.toLocaleString()}`, change: `${((cashBalance / totalValue) * 100).toFixed(0)}% available`, positive: true, icon: Layers, delay: 0.15 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.5 }}
            className="glass-card p-5 floating-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xs text-secondary">{stat.label}</span>
            </div>
            <p className="text-xl font-bold font-mono counter-value">{stat.value}</p>
            <p className={`text-xs font-mono mt-1 ${stat.positive ? 'text-profit' : 'text-loss'}`}>
              {stat.change}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Autopilot - Big CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`glass-card p-8 border transition-all ${autoTrading ? 'border-profit/30' : 'border-border-primary'}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              autoTrading ? 'bg-profit/10 animate-pulse' : 'bg-accent/10'
            }`}>
              <Zap className={`w-8 h-8 ${autoTrading ? 'text-profit' : 'text-accent'}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Autopilot {autoTrading ? 'ACTIVE' : 'PAUSED'}</h2>
              <p className="text-sm text-secondary mt-1">
                {autoTrading 
                  ? `${agents.filter((a: any) => a.status === 'active').length} agents trading autonomously`
                  : 'Activate to let AI agents trade for you'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onToggleAutoTrading}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all flex items-center gap-3 ${
              autoTrading 
                ? 'bg-loss/10 text-loss border border-loss/20 hover:bg-loss/20' 
                : 'bg-accent text-bg-primary hover:bg-accent/90 shadow-glow'
            }`}
          >
            {autoTrading ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {autoTrading ? 'Pause Autopilot' : 'Activate Autopilot'}
          </button>
        </div>
      </motion.div>

      {/* Two Column: Trades + Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold">Recent Trades</h3>
            <button onClick={() => onTabChange('trades')} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {trades.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-secondary/20 mx-auto mb-3" />
              <p className="text-sm text-secondary">No trades yet — activate autopilot to begin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trades.slice(0, 5).map((trade: any) => (
                <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl bg-input/50 border border-border-primary hover:border-border-hover transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      trade.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                    }`}>
                      {trade.side}
                    </span>
                    <div>
                      <p className="font-mono font-medium text-sm">{trade.symbol}</p>
                      <p className="text-[10px] text-secondary">${trade.entry_price?.toFixed(2) || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-medium ${(trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                    </p>
                    <p className="text-[10px] text-secondary">{trade.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Kalshi-style Predictions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold">Predictions</h3>
            <button onClick={() => onTabChange('predictions')} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {predictions.length === 0 ? (
            <div className="text-center py-8">
              <Flame className="w-10 h-10 text-secondary/20 mx-auto mb-2" />
              <p className="text-xs text-secondary">Loading markets...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.slice(0, 3).map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl bg-input/50 border border-border-primary hover:border-border-hover transition-all cursor-pointer">
                  <p className="text-sm font-medium mb-2">{p.title}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="badge badge-accent text-[10px]">{p.category}</span>
                    <span className="text-[10px] text-secondary">${p.volume?.toLocaleString()} vol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 probability-bar">
                      <div className="probability-bar-fill" style={{ width: `${p.yes_price * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-profit">{(p.yes_price * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Agents Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">Agents Online</h3>
          <button onClick={() => onTabChange('agents')} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {agents.length === 0 ? (
            [...Array(7)].map((_, i) => <div key={i} className="shimmer h-16 rounded-xl" />)
          ) : (
            agents.map((agent: any) => (
              <div key={agent.name} className="p-3 rounded-xl bg-input/50 border border-border-primary hover:border-border-hover transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-profit animate-pulse' : 'bg-secondary'}`} />
                  <span className="text-[10px] text-secondary">{agent.role}</span>
                </div>
                <p className="text-xs font-medium truncate">{agent.name}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// PREDICTIONS PANEL (Kalshi-inspired)
// ============================================================
function PredictionsPanel({ predictions }: { predictions: Prediction[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Prediction Markets</h2>
          <p className="text-sm text-secondary mt-1">Bet on outcomes. Earn from your intuition.</p>
        </div>
        <button className="btn-primary text-sm flex items-center gap-2">
          <Flame className="w-4 h-4" /> Create Market
        </button>
      </div>

      {predictions.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Flame className="w-16 h-16 text-secondary/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Markets Yet</h3>
          <p className="text-sm text-secondary">Prediction markets will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map((p) => (
            <div key={p.id} className="glass-card p-6 hover:border-accent/20 transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge badge-accent">{p.category}</span>
                <span className="text-[10px] text-secondary ml-auto">${p.volume?.toLocaleString()} volume</span>
              </div>
              <h3 className="font-semibold mb-4">{p.title}</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-profit font-mono">YES {(p.yes_price * 100).toFixed(0)}¢</span>
                    <span className="text-loss font-mono">NO {((1 - p.yes_price) * 100).toFixed(0)}¢</span>
                  </div>
                  <div className="probability-bar">
                    <motion.div
                      className="probability-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${p.yes_price * 100}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-2.5 rounded-xl bg-profit/10 text-profit text-sm font-medium hover:bg-profit/20 transition-all">
                  Buy YES
                </button>
                <button className="flex-1 py-2.5 rounded-xl bg-loss/10 text-loss text-sm font-medium hover:bg-loss/20 transition-all">
                  Buy NO
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AUTOPILOT PANEL
// ============================================================
function AutopilotPanel({ autoTrading, onToggle }: any) {
  const [strategy, setStrategy] = useState('all-weather');
  const [riskLevel, setRiskLevel] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card p-8 space-y-8">
        <div className={`p-6 rounded-2xl border transition-all ${autoTrading ? 'bg-profit/5 border-profit/20' : 'bg-input border-border-primary'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Auto-Trading</h3>
              <p className="text-sm text-secondary mt-1">
                {autoTrading ? 'Agents are actively trading' : 'Enable autonomous trading'}
              </p>
            </div>
            <button onClick={onToggle} className={`w-16 h-8 rounded-full transition-all relative ${autoTrading ? 'bg-profit' : 'bg-white/10'}`}>
              <div className={`w-6 h-6 rounded-full bg-white transition-transform absolute top-1 shadow ${autoTrading ? 'translate-x-9' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-3 block">Strategy</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['Value', 'Quant', 'Momentum', 'All-Weather', 'Aggressive', 'Conservative'].map((s) => (
              <button key={s} onClick={() => setStrategy(s.toLowerCase())} className={`px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${strategy === s.toLowerCase() ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border-primary hover:border-border-hover'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Risk Tolerance</label>
            <span className="text-sm font-mono text-accent">{riskLevel}/10</span>
          </div>
          <input type="range" min="1" max="10" value={riskLevel} onChange={(e) => setRiskLevel(Number(e.target.value))} className="w-full accent-accent" />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// Simple panels for other tabs
function AgentsPanel({ agents }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Agents Council</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent: any) => (
          <div key={agent.name} className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-profit animate-pulse' : 'bg-secondary'}`} />
                <div><h3 className="font-semibold">{agent.name}</h3><p className="text-xs text-secondary">{agent.role}</p></div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${agent.status === 'active' ? 'bg-profit/10 text-profit' : 'bg-secondary/10 text-secondary'}`}>{agent.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradesPanel({ trades }: any) {
  const handleExport = () => {
    if (trades.length === 0) return;
    const csv = [['Symbol','Side','Qty','Price','P&L','Status','Date'], ...trades.map((t: any) => [t.symbol, t.side, t.quantity, t.entry_price||'', t.pnl||'', t.status, t.created_at])].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'starktrade-trades.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold tracking-tight">Trade History</h2><p className="text-sm text-secondary mt-1">{trades.length} trades</p></div>
        <button onClick={handleExport} disabled={trades.length === 0} className="btn-outline text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
      </div>
      {trades.length === 0 ? (
        <div className="glass-card p-16 text-center"><Activity className="w-16 h-16 text-secondary/20 mx-auto mb-4" /><h3 className="text-lg font-semibold mb-2">No Trades Yet</h3></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-primary bg-input/30">
              <th className="text-left text-xs text-secondary p-4">Symbol</th><th className="text-left text-xs text-secondary p-4">Side</th>
              <th className="text-right text-xs text-secondary p-4">Price</th><th className="text-right text-xs text-secondary p-4">P&L</th>
              <th className="text-left text-xs text-secondary p-4">Status</th>
            </tr></thead>
            <tbody>
              {trades.map((t: any) => (
                <tr key={t.id} className="border-b border-border-primary hover:bg-white/5">
                  <td className="p-4 font-mono font-medium">{t.symbol}</td>
                  <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${t.side === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>{t.side}</span></td>
                  <td className="p-4 text-right font-mono">${t.entry_price?.toFixed(2) || '—'}</td>
                  <td className={`p-4 text-right font-mono font-medium ${(t.pnl||0) >= 0 ? 'text-profit' : 'text-loss'}`}>{t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}</td>
                  <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full ${t.status === 'filled' ? 'bg-profit/10 text-profit' : 'bg-gold/10 text-gold'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnalyticsPanel({ portfolio, trades }: any) {
  const wins = trades.filter((t: any) => (t.pnl || 0) > 0);
  const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{l:'Trades',v:trades.length},{l:'Win Rate',v:`${winRate}%`},{l:'Portfolio',v:`$${(portfolio?.total_value||100000).toLocaleString()}`},{l:'Cash',v:`$${(portfolio?.cash_balance||100000).toLocaleString()}`}].map((s,i)=>(
          <div key={s.l} className="glass-card p-5"><p className="text-xs text-secondary mb-1">{s.l}</p><p className="text-2xl font-bold font-mono">{s.v}</p></div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ user }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="glass-card p-8 space-y-4">
          <h3 className="font-semibold text-lg">Account</h3>
          {[{l:'Email',v:user?.email},{l:'Role',v:user?.role?.toUpperCase()},{l:'Strategy',v:user?.strategy?.replace('_',' ')}].map(i=>(
            <div key={i.l} className="flex justify-between p-3 rounded-xl bg-input/50"><span className="text-sm text-secondary">{i.l}</span><span className="text-sm font-medium">{i.v||'—'}</span></div>
          ))}
        </div>
      </div>
      <ReferralDashboard />
    </div>
  );
}
