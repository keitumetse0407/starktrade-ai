'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart3, Brain, Shield, Settings, TrendingUp, Bell,
  Target, Zap, RefreshCw, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { CommandCenter } from '@/components/dashboard/CommandCenter';
import { AutopilotControls, AgentsCouncil, TradeHistory, Predictions, Analytics, SettingsPanel } from '@/components/dashboard/DashboardPanels';

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