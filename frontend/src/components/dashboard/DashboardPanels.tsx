'use client';

import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Activity, Brain, Target, TrendingUp, BarChart3, Settings } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#00D4FF', '#00FF88', '#FF3366', '#FFD700', '#8892B0'];

export const AutopilotControls = memo(function AutopilotControls() {
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
});

export const AgentsCouncil = memo(function AgentsCouncil() {
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
});

export const TradeHistory = memo(function TradeHistory({ trades }: { trades: any[] }) {
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
});

export const Predictions = memo(function Predictions() {
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
});

export const Analytics = memo(function Analytics({ portfolioData }: { portfolioData: any[] }) {
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
});

function MetricCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-navy/50 border border-white/5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${positive ? 'text-profit' : 'text-loss'}`}>{value}</p>
    </div>
  );
}

export const SettingsPanel = memo(function SettingsPanel() {
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
});
