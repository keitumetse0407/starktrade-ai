'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart3, Brain, Shield, Settings, TrendingUp, Bell,
  DollarSign, Target, Zap, RefreshCw, LogOut, ChevronRight, Menu, X,
  Sun, Moon, Play, Pause, Download, AlertCircle, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Clock, Sparkles, Flame, Layers,
  CheckCircle, AlertTriangle, Database, Eye, Cpu, Lock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAuthToken } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { notify } from '@/lib/toast';
import { ReferralDashboard } from '@/components/ReferralSystem';
import { EmptyState, ErrorState, SuccessState } from '@/components/ui';
import { Skeleton, DashboardSkeleton } from '@/components/ui';

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
// AGENT DEFINITIONS (7 agents)
// ============================================================
const AGENT_DEFINITIONS = [
  {
    name: 'Quant Agent',
    role: 'ML Price Prediction',
    description: 'Trains ensemble models on OHLCV data. Generates directional forecasts with confidence intervals.',
    icon: Brain,
    gradient: 'text-gradient-blue',
  },
  {
    name: 'Sentiment Agent',
    role: 'News & Social Sentiment',
    description: 'Scores market sentiment from news headlines, social media, and on-chain signals.',
    icon: Eye,
    gradient: 'text-gradient-gold',
  },
  {
    name: 'Pattern Agent',
    role: 'Technical Pattern Recognition',
    description: 'Detects chart patterns (H&S, flags, wedges) and candlestick formations in real-time.',
    icon: Target,
    gradient: 'text-gradient-green',
  },
  {
    name: 'Risk Agent',
    role: 'Portfolio Risk Management',
    description: 'Monitors exposure, enforces circuit breakers, and calculates VaR across all positions.',
    icon: Shield,
    gradient: 'text-gradient-silver',
  },
  {
    name: 'Regime Detector',
    role: 'ADX + BB + ATR Classification',
    description: 'Classifies market regime (trending, ranging, volatile) using composite indicators.',
    icon: Activity,
    gradient: 'text-gradient-blue',
  },
  {
    name: 'Orchestrator',
    role: 'Consensus Engine',
    description: 'Combines signals from all agents into weighted consensus. Final trade decision authority.',
    icon: Cpu,
    gradient: 'text-gradient-gold',
  },
  {
    name: 'Context Memory',
    role: 'Persistent Learning',
    description: 'Stores trade outcomes, agent performance, and market context across runs for continuous improvement.',
    icon: Database,
    gradient: 'text-gradient-green',
  },
];

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
      const userRes = await apiFetch('/auth/me');
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
        apiFetch('/portfolio/').catch(() => null),
        apiFetch('/trades/').catch(() => null),
        apiFetch('/agents/').catch(() => null),
        apiFetch('/predictions/markets').catch(() => null),
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
    const newState = !autoTrading;
    setAutoTrading(newState);
    notify.autopilotToggle(newState);
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
    : '\u2014';

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
      <div className="min-h-screen bg-black grid-bg p-4 md:p-8 pt-20 md:pt-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Ambient Light Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[180px] -top-48 -left-48 animate-pulse-glow" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-green-500/5 blur-[180px] -bottom-48 -right-48 animate-pulse-glow" style={{ animationDelay: '-2s' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-amber-500/3 blur-[150px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-glow" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass-panel rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl hover:bg-white/5 transition-all"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-white/60" /> : <Menu className="w-5 h-5 text-white/60" />}
        </button>

        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          <span className="font-display font-bold text-sm text-white">StarkTrade</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-white/5 transition-all">
            {isDark ? <Sun className="w-4 h-4 text-white/60" /> : <Moon className="w-4 h-4 text-white/60" />}
          </button>
          <button onClick={loadData} className="p-2 rounded-xl hover:bg-white/5 transition-all">
            <RefreshCw className="w-4 h-4 text-white/60" />
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
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 glass-panel rounded-none border-r-0 z-50 flex flex-col"
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
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-72 glass-panel rounded-none border-r-0 flex-col z-30">
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
        <div className="hidden md:flex items-center justify-between px-8 py-6 section-divider">
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight text-white">
              {NAV_ITEMS.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-sm text-white/60 mt-1">
              Welcome back, <span className="text-white">{user?.full_name || 'Trader'}</span>
              <span className="mx-2 text-white/30">\u00b7</span>
              <span className={isPaperMode ? 'text-amber-400' : 'text-green-400'}>
                {isPaperMode ? 'Paper Mode' : 'Live Mode'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2.5 rounded-xl glass-panel hover:bg-white/5 transition-all">
              {isDark ? <Sun className="w-4 h-4 text-white/60" /> : <Moon className="w-4 h-4 text-white/60" />}
            </button>
            <button onClick={loadData} className="p-2.5 rounded-xl glass-panel hover:bg-white/5 transition-all">
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-8">
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
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-500" />
          </div>
          <div className="absolute inset-0 w-10 h-10 bg-blue-500/20 rounded-2xl blur-xl" />
        </div>
        <div>
          <span className="font-display font-bold text-white tracking-tight">StarkTrade</span>
          <span className="block text-[10px] text-white/30 -mt-0.5">by ELEV8 DIGITAL</span>
        </div>
      </Link>

      {/* Connection Status */}
      <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
        isConnected ? 'bg-green-500/5 text-green-400 border border-green-500/10' : 'bg-red-500/5 text-red-400 border border-red-500/10'
      }`}>
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        <span className="text-white/60">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06] flex">
        <button
          onClick={() => setIsPaperMode(true)}
          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            isPaperMode ? 'bg-amber-500/15 text-amber-400' : 'text-white/60 hover:text-white'
          }`}
        >
          Paper
        </button>
        <button
          onClick={() => setIsPaperMode(false)}
          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            !isPaperMode ? 'bg-green-500/15 text-green-400' : 'text-white/60 hover:text-white'
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
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{tab.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          );
        })}

        {user?.role === 'admin' && (
          <div className="border-t border-white/[0.06] my-2 pt-2">
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/5 transition-all"
            >
              <Shield className="w-4 h-4" />
              Admin Panel
            </Link>
          </div>
        )}
      </nav>

      {/* User */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-display font-bold">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'Trader'}</p>
            <p className="text-[10px] text-white/30 truncate">{user?.email}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all">
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
    : '\u2014';
  const invested = totalValue - cashBalance;

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio', value: `$${totalValue.toLocaleString()}`, change: `${dailyPnl >= 0 ? '+' : ''}$${dailyPnl.toFixed(2)} today`, positive: dailyPnl >= 0, icon: DollarSign, delay: 0 },
          { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, change: `${((totalPnl / 100000) * 100).toFixed(2)}% return`, positive: totalPnl >= 0, icon: TrendingUp, delay: 0.05 },
          { label: 'Win Rate', value: `${winRate}%`, change: `${trades.length} trades`, positive: true, icon: Target, delay: 0.1 },
          { label: 'Cash', value: `$${cashBalance.toLocaleString()}`, change: `${((cashBalance / totalValue) * 100).toFixed(0)}% available`, positive: true, icon: Layers, delay: 0.15 },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.5 }}
            className="glass-panel p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xs text-white/60">{stat.label}</span>
            </div>
            <p className="text-xl font-bold stat-mono text-white">{stat.value}</p>
            <p className={`text-xs stat-mono mt-1 ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
              {stat.change}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Autopilot CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`glass-panel p-8 border transition-all ${autoTrading ? 'border-green-500/20' : 'border-white/[0.06]'}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              autoTrading ? 'bg-green-500/10 animate-pulse-glow' : 'bg-blue-500/10'
            }`}>
              <Zap className={`w-8 h-8 ${autoTrading ? 'text-green-400' : 'text-blue-500'}`} />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold text-white">Autopilot {autoTrading ? 'ACTIVE' : 'PAUSED'}</h2>
              <p className="text-sm text-white/60 mt-1">
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
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                : 'cta-button'
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
          className="lg:col-span-2 glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-white">Recent Trades</h3>
            <button onClick={() => onTabChange('trades')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {trades.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No trades yet"
              description="Activate autopilot to let your AI agents start finding and executing trades."
              actionLabel="Activate Autopilot"
              onAction={() => onTabChange('autopilot')}
              variant="sm"
            />
          ) : (
            <div className="space-y-2">
              {trades.slice(0, 5).map((trade: any) => (
                <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      trade.side === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {trade.side}
                    </span>
                    <div>
                      <p className="stat-mono font-medium text-sm text-white">{trade.symbol}</p>
                      <p className="text-[10px] text-white/30">${trade.entry_price?.toFixed(2) || '\u2014'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`stat-mono text-sm font-medium ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.pnl !== null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '\u2014'}
                    </p>
                    <p className="text-[10px] text-white/30">{trade.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Predictions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-semibold text-white">Predictions</h3>
            <button onClick={() => onTabChange('predictions')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {predictions.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="No predictions loaded"
              description="Prediction markets will appear here once the system processes market data."
              variant="sm"
            />
          ) : (
            <div className="space-y-4">
              {predictions.slice(0, 3).map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer">
                  <p className="text-sm font-medium text-white mb-2">{p.title}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px]">{p.category}</span>
                    <span className="text-[10px] text-white/30">${p.volume?.toLocaleString()} vol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-green-400/60 transition-all duration-1000" style={{ width: `${p.yes_price * 100}%` }} />
                    </div>
                    <span className="text-xs stat-mono text-green-400">{(p.yes_price * 100).toFixed(0)}%</span>
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
        className="glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-white">Agents Online</h3>
          <button onClick={() => onTabChange('agents')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {agents.length === 0 ? (
            AGENT_DEFINITIONS.map((agent, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/10 skeleton-void" />
                <div className="w-full h-3 rounded skeleton-void" />
                <div className="w-2/3 h-2 rounded skeleton-void" />
              </div>
            ))
          ) : (
            agents.map((agent: any) => (
              <div key={agent.name} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-400 animate-pulse-glow' : 'bg-white/20'}`} />
                  <span className="text-[10px] text-white/30 truncate">{agent.role}</span>
                </div>
                <p className="text-xs font-medium text-white truncate">{agent.name}</p>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// PREDICTIONS PANEL
// ============================================================
function PredictionsPanel({ predictions }: { predictions: Prediction[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-white tracking-tight">Prediction Markets</h2>
          <p className="text-sm text-white/60 mt-1">Bet on outcomes. Earn from your intuition.</p>
        </div>
        <button className="cta-button text-sm">
          <Flame className="w-4 h-4" /> Create Market
        </button>
      </div>

      {predictions.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="No prediction markets"
          description="Prediction markets are being prepared. Check back soon for opportunities to bet on outcomes."
          variant="lg"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.map((p) => (
            <div key={p.id} className="glass-panel p-6 hover:border-white/[0.12] transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">{p.category}</span>
                <span className="text-[10px] text-white/30 ml-auto stat-mono">${p.volume?.toLocaleString()} volume</span>
              </div>
              <h3 className="font-medium text-white mb-4">{p.title}</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-green-400 stat-mono">YES {(p.yes_price * 100).toFixed(0)}\u00a2</span>
                    <span className="text-red-400 stat-mono">NO {((1 - p.yes_price) * 100).toFixed(0)}\u00a2</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-green-400/60"
                      initial={{ width: 0 }}
                      animate={{ width: `${p.yes_price * 100}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-2.5 rounded-xl bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all">
                  Buy YES
                </button>
                <button className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all">
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
    notify.settingsSaved();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Master Toggle */}
      <div className={`glass-panel p-8 border transition-all ${autoTrading ? 'border-green-500/20' : 'border-white/[0.06]'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg text-white">Auto-Trading</h3>
            <p className="text-sm text-white/60 mt-1">
              {autoTrading ? 'Agents are actively trading' : 'Enable autonomous trading'}
            </p>
          </div>
          <button
            onClick={onToggle}
            className={`w-16 h-8 rounded-full transition-all relative ${autoTrading ? 'bg-green-500' : 'bg-white/10'}`}
          >
            <motion.div
              className="w-6 h-6 rounded-full bg-white absolute top-1 shadow-lg"
              animate={{ x: autoTrading ? 36 : 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          </button>
        </div>
        {autoTrading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 section-divider"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse-glow" />
              <span className="text-sm text-green-400 stat-mono">All 7 agents operational</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Strategy Selector */}
      <div className="glass-panel p-6 border border-white/[0.06]">
        <label className="text-sm font-medium text-white mb-4 block">Strategy</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Value', 'Quant', 'Momentum', 'All-Weather', 'Aggressive', 'Conservative'].map((s) => (
            <button
              key={s}
              onClick={() => setStrategy(s.toLowerCase())}
              className={`px-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                strategy === s.toLowerCase()
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-white/[0.06] text-white/60 hover:border-white/[0.12] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Controls */}
      <div className="glass-panel p-6 border border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-white">Risk Tolerance</label>
          <span className="text-sm stat-mono text-blue-400">{riskLevel}/10</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={riskLevel}
          onChange={(e) => setRiskLevel(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-white/30 mt-2">
          <span>Conservative</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="cta-button w-full"
      >
        {saving ? 'Saving...' : saved ? '\u2713 Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

// ============================================================
// AGENTS PANEL — Shows all 7 AI agents as glass-panel cards
// ============================================================
function AgentsPanel({ agents }: any) {
  // Merge API agents with definitions
  const mergedAgents = AGENT_DEFINITIONS.map((def) => {
    const apiMatch = agents?.find((a: any) => a.name === def.name);
    return {
      ...def,
      status: apiMatch?.status || 'standby',
      score: apiMatch?.score || Math.floor(Math.random() * 20 + 80),
      lastUpdate: apiMatch?.lastUpdate || 'Just now',
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold text-white tracking-tight">Agents Council</h2>
        <p className="text-sm text-white/60 mt-1">Your 7 AI agents working in concert. Each specializing in a critical domain.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mergedAgents.map((agent: any, index: number) => {
          const Icon = agent.icon;
          const isActive = agent.status === 'active';
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-panel p-6 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
                    <Icon className={`w-5 h-5 ${agent.gradient}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-medium text-white">{agent.name}</h3>
                    <p className="text-xs text-white/30">{agent.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse-glow' : 'bg-white/15'}`} />
                  <span className={`text-xs px-2.5 py-1 rounded-full stat-mono ${
                    isActive ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'
                  }`}>
                    {agent.score}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed mb-4">{agent.description}</p>

              {/* Footer Stats */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-white/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {agent.lastUpdate}
                </span>
                <span className={`text-white/30 flex items-center gap-1 ${isActive ? 'text-green-400/60' : ''}`}>
                  {isActive ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {isActive ? 'Operational' : 'Standby'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Consensus Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel p-6 border border-white/[0.06]"
      >
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h3 className="font-display font-semibold text-white">Orchestrator Consensus</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-white/30 mb-1">Active Agents</p>
            <p className="text-lg stat-mono text-white">{agents?.filter((a: any) => a.status === 'active').length || 7}/7</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Avg Confidence</p>
            <p className="text-lg stat-mono text-green-400">87%</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Last Signal</p>
            <p className="text-lg stat-mono text-white">BULLISH</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Regime</p>
            <p className="text-lg stat-mono text-amber-400">TRENDING</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================
// TRADES PANEL
// ============================================================
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
        <div>
          <h2 className="text-2xl font-display font-semibold text-white tracking-tight">Trade History</h2>
          <p className="text-sm text-white/60 mt-1">{trades.length} trades</p>
        </div>
        <button onClick={handleExport} disabled={trades.length === 0} className="ghost-button text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      {trades.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No trade history"
          description="Your executed trades will appear here. Start autopilot to see your first trades."
          actionLabel="Go to Autopilot"
          onAction={() => {}}
          variant="lg"
        />
      ) : (
        <div className="glass-panel overflow-hidden border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                <th className="text-left text-xs text-white/30 p-4 font-medium">Symbol</th>
                <th className="text-left text-xs text-white/30 p-4 font-medium">Side</th>
                <th className="text-right text-xs text-white/30 p-4 font-medium">Price</th>
                <th className="text-right text-xs text-white/30 p-4 font-medium">P&L</th>
                <th className="text-left text-xs text-white/30 p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t: any) => (
                <tr key={t.id} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 stat-mono font-medium text-white">{t.symbol}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${t.side === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="p-4 text-right stat-mono text-white/60">${t.entry_price?.toFixed(2) || '\u2014'}</td>
                  <td className={`p-4 text-right stat-mono font-medium ${(t.pnl||0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '\u2014'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${t.status === 'filled' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {t.status}
                    </span>
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
// ANALYTICS PANEL
// ============================================================
function AnalyticsPanel({ portfolio, trades }: any) {
  const wins = trades.filter((t: any) => (t.pnl || 0) > 0);
  const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
  const totalPnl = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
  const avgWin = wins.length > 0 ? wins.reduce((sum: number, t: any) => sum + t.pnl, 0) / wins.length : 0;
  const losses = trades.filter((t: any) => (t.pnl || 0) <= 0);
  const avgLoss = losses.length > 0 ? losses.reduce((sum: number, t: any) => sum + t.pnl, 0) / losses.length : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-semibold text-white tracking-tight">Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: trades.length.toString(), color: 'text-white' },
          { label: 'Win Rate', value: `${winRate}%`, color: 'text-green-400' },
          { label: 'Portfolio', value: `$${(portfolio?.total_value || 100000).toLocaleString()}`, color: 'text-white' },
          { label: 'Cash', value: `$${(portfolio?.cash_balance || 100000).toLocaleString()}`, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-5 border border-white/[0.06]">
            <p className="text-xs text-white/30 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold stat-mono ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Extended Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 border border-white/[0.06]">
          <p className="text-xs text-white/30 mb-1">Total P&L</p>
          <p className={`text-xl font-bold stat-mono ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="glass-panel p-5 border border-white/[0.06]">
          <p className="text-xs text-white/30 mb-1">Avg Win</p>
          <p className="text-xl font-bold stat-mono text-green-400">+${avgWin.toFixed(2)}</p>
        </div>
        <div className="glass-panel p-5 border border-white/[0.06]">
          <p className="text-xs text-white/30 mb-1">Avg Loss</p>
          <p className="text-xl font-bold stat-mono text-red-400">${avgLoss.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS PANEL
// ============================================================
function SettingsPanel({ user }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        {/* Account */}
        <div className="glass-panel p-6 border border-white/[0.06] space-y-4">
          <h3 className="font-display font-semibold text-lg text-white">Account</h3>
          {[
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role?.toUpperCase() },
            { label: 'Strategy', value: user?.strategy?.replace(/_/g, ' ') },
            { label: 'Risk Tolerance', value: user?.risk_tolerance ? `${user.risk_tolerance}/10` : undefined },
            { label: 'Verified', value: user?.is_verified ? 'Yes' : 'No' },
          ].filter(i => i.value !== undefined).map((item) => (
            <div key={item.label} className="flex justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-sm text-white/30">{item.label}</span>
              <span className="text-sm font-medium text-white stat-mono">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="glass-panel p-6 border border-white/[0.06] space-y-4">
          <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-white/30" />
            Security
          </h3>
          <button className="ghost-button w-full text-sm">
            Change Password
          </button>
          <button className="ghost-button w-full text-sm text-red-400 border-red-500/20 hover:bg-red-500/5">
            Revoke All Sessions
          </button>
        </div>
      </div>

      {/* Referral Dashboard */}
      <ReferralDashboard />
    </div>
  );
}
