'use client';

import { memo } from 'react';
import {
  Activity, BarChart3, DollarSign, Target, TrendingUp, Zap,
  ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#00D4FF', '#00FF88', '#FF3366', '#FFD700', '#8892B0'];

interface CommandCenterProps {
  portfolioData: any[];
  totalValue: number;
  totalReturn: string;
  dailyPnl: number;
  trades: any[];
  agentActivity: any[];
}

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

export const CommandCenter = memo(function CommandCenter({
  portfolioData, totalValue, totalReturn, dailyPnl, trades, agentActivity
}: CommandCenterProps) {
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
              </AreaChart>
            </ResponsiveContainer>
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
            <button className="text-xs text-electric hover:text-electric/80 transition-colors flex items-center gap-1">
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
});
