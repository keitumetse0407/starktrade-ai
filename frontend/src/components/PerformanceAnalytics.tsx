'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, Calendar, Award,
  Target, Activity, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { apiFetch } from '@/lib/api';

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  status: string;
  created_at: string;
}

interface AgentStats {
  name: string;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  accuracy: number;
}

export const PerformanceAnalytics = memo(function PerformanceAnalytics() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tradesRes, agentsRes] = await Promise.all([
        apiFetch('/trades/').catch(() => null),
        apiFetch('/agents/').catch(() => null),
      ]);

      if (tradesRes?.ok) setTrades(await tradesRes.json());
      if (agentsRes?.ok) {
        const data = await agentsRes.json();
        setAgentStats(data.map((a: any) => ({
          name: a.name,
          total_trades: a.total_trades || 0,
          winning_trades: a.winning_trades || 0,
          total_pnl: a.total_pnl || 0,
          accuracy: a.total_trades ? (a.winning_trades / a.total_trades) * 100 : 0,
        })));
      }
    } catch {}
    setLoading(false);
  };

  const winRate = useMemo(() => {
    if (trades.length === 0) return 0;
    const wins = trades.filter(t => (t.pnl || 0) > 0).length;
    return (wins / trades.length) * 100;
  }, [trades]);

  const totalPnl = useMemo(() => {
    return trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [trades]);

  const avgWin = useMemo(() => {
    const wins = trades.filter(t => (t.pnl || 0) > 0);
    if (wins.length === 0) return 0;
    return wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length;
  }, [trades]);

  const avgLoss = useMemo(() => {
    const losses = trades.filter(t => (t.pnl || 0) <= 0);
    if (losses.length === 0) return 0;
    return Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length);
  }, [trades]);

  const maxDrawdown = useMemo(() => {
    if (trades.length === 0) return 0;
    let peak = 0;
    let maxDd = 0;
    let running = 0;
    for (const t of trades) {
      running += t.pnl || 0;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDd) maxDd = dd;
    }
    return maxDd;
  }, [trades]);

  const equityCurve = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let running = 100000;
    return sorted.map(t => {
      running += t.pnl || 0;
      return {
        date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: running,
      };
    });
  }, [trades]);

  const winRateOverTime = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const periods = [];
    let wins = 0;
    let total = 0;
    for (let i = 0; i < sorted.length; i++) {
      if ((sorted[i].pnl || 0) > 0) wins++;
      total++;
      if (i % 5 === 0 || i === sorted.length - 1) {
        periods.push({
          period: `Trade ${i + 1}`,
          winRate: total > 0 ? (wins / total) * 100 : 0,
        });
      }
    }
    return periods;
  }, [trades]);

  const monthlyPnL = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const t of trades) {
      const month = new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      byMonth[month] = (byMonth[month] || 0) + (t.pnl || 0);
    }
    return Object.entries(byMonth).map(([month, pnl]) => ({ month, pnl }));
  }, [trades]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel p-5 animate-pulse">
              <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
              <div className="h-6 bg-white/10 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/40">Win Rate</span>
          </div>
          <p className="text-2xl font-bold font-mono text-green-400">{winRate.toFixed(1)}%</p>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-white/40">Total Trades</span>
          </div>
          <p className="text-2xl font-bold font-mono text-white">{trades.length}</p>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/40">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
          </p>
        </div>

        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-white/40">Max Drawdown</span>
          </div>
          <p className="text-2xl font-bold font-mono text-red-400">-{maxDrawdown.toFixed(2)}</p>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="glass-panel p-6 rounded-xl">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Equity Curve
        </h3>
        {equityCurve.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-12">No trades to display</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#00D4FF"
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two Column: Win Rate Over Time + Agent Accuracy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Win Rate Over Time */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Win Rate Over Time
          </h3>
          {winRateOverTime.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">No data</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={winRateOverTime}>
                  <XAxis dataKey="period" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'Win Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Agent Accuracy */}
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Agent Accuracy
          </h3>
          {agentStats.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">No agent data</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentStats}>
                  <XAxis dataKey="name" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Monthly P&L Heatmap */}
      <div className="glass-panel p-6 rounded-xl">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          Monthly P&L
        </h3>
        {monthlyPnL.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-8">No data</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {monthlyPnL.map((item, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-center ${
                  item.pnl >= 0
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <p className="text-xs text-white/40 mb-1">{item.month}</p>
                <p className={`text-sm font-mono font-medium ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.pnl >= 0 ? '+' : ''}{item.pnl.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extended Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">Avg Win</p>
          <p className="text-xl font-bold font-mono text-green-400">+{avgWin.toFixed(2)}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">Avg Loss</p>
          <p className="text-xl font-bold font-mono text-red-400">-{avgLoss.toFixed(2)}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">Profit Factor</p>
          <p className="text-xl font-bold font-mono text-white">
            {avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'}
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl">
          <p className="text-xs text-white/40 mb-1">Sharpe Ratio</p>
          <p className="text-xl font-bold font-mono text-white">—</p>
        </div>
      </div>
    </div>
  );
});

export default PerformanceAnalytics;