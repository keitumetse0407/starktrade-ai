'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users, Settings, DollarSign, BarChart3, Shield, Save, Activity,
  ArrowLeft, Eye, EyeOff, TrendingUp, Target, Zap, Clock, AlertTriangle,
  UserPlus, UserMinus, CreditCard, Percent, Crown, RefreshCw, Download,
  ChevronUp, ChevronDown
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

// ============================================================
// MOCK DATA
// ============================================================
function generateMRRData() {
  const data = [];
  let mrr = 5000;
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    mrr += Math.random() * 3000 + 500;
    data.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      mrr: Math.round(mrr),
      users: Math.round(50 + (12 - i) * 25 + Math.random() * 10),
    });
  }
  return data;
}

function generateUserGrowth() {
  const data = [];
  let total = 100;
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    total += Math.floor(Math.random() * 15 + 3);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      total,
      active: Math.round(total * (0.6 + Math.random() * 0.2)),
    });
  }
  return data;
}

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8892B0'];

interface AdminStats {
  total_users: number;
  total_trades: number;
  total_aum: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  auto_trading_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface SiteConfig {
  [key: string]: { value: string; description: string };
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'adsense', label: 'AdSense', icon: CreditCard },
  { id: 'config', label: 'Site Config', icon: Settings },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<SiteConfig>({});
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const [mrrData] = useState(generateMRRData());
  const [userGrowth] = useState(generateUserGrowth());

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      setIsAuthenticated(true);
      loadData(stored);
    }
  }, []);

  const loadData = async (t: string) => {
    try {
      const [statsRes, usersRes, configRes] = await Promise.all([
        fetch((process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org') + '/api/v1/admin/stats', { headers: { Authorization: 'Bearer ${t}` } }),
        fetch((process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org') + '/api/v1/admin/users', { headers: { Authorization: 'Bearer ${t}` } }),
        fetch((process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org') + '/api/v1/admin/config', { headers: { Authorization: 'Bearer ${t}` } }),
      ]);

      if (statsRes.status === 403) {
        setError('Admin access required. Login with an admin account.');
        setIsAuthenticated(false);
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (configRes.ok) setConfig(await configRes.json());
    } catch (err) {
      setError('Failed to load admin data');
    }
  };

  const updateConfig = async (key: string, value: string) => {
    if (!token) return;
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org') + '/api/v1/admin/config/${key}?value=${encodeURIComponent(value)}', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData(token);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!token) return;
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org') + '/api/v1/admin/users/${userId}/role?new_role=${newRole}', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData(token);
  };

  const toggleUserActive = async (userId: string) => {
    if (!token) return;
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'https://starktrade-ai.duckdns.org') + '/api/v1/admin/users/${userId}/toggle-active', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData(token);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="ambient-orb w-96 h-96 bg-blue-500/10 -top-48 -left-48" />
        <div className="ambient-orb w-96 h-96 bg-blue-500/5 -bottom-48 -right-48" />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-6">
          <div className="glass-panel p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2 text-white">Admin Access</h2>
            <p className="text-white/60 mb-6 text-sm">Login with an admin account to access this panel.</p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <Link href="/onboarding" className="cta-button w-full justify-center">
              Go to Login <ArrowLeft className="w-4 h-4" />
            </Link>
            <p className="text-xs text-white/30 mt-6">
              First time? Register at /onboarding, then manually set role=&apos;admin&apos; in the database.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentMRR = mrrData[mrrData.length - 1]?.mrr || 34500;
  const prevMRR = mrrData[mrrData.length - 2]?.mrr || 31000;
  const mrrGrowth = ((currentMRR - prevMRR) / prevMRR * 100).toFixed(1);
  const totalUsers = userGrowth[userGrowth.length - 1]?.total || 2847;
  const activeUsers = userGrowth[userGrowth.length - 1]?.active || 1823;

  return (
    <div className="min-h-screen bg-black relative">
      {/* Ambient orbs */}
      <div className="ambient-orb w-[600px] h-[600px] bg-blue-500/5 -top-48 -left-48 animate-float-slow" />
      <div className="ambient-orb w-[500px] h-[500px] bg-emerald-500/5 -bottom-48 right-0 animate-float-slow-delay" />

      <div className="relative z-10 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 border-r border-white/[0.06] p-4 flex flex-col md:min-h-screen bg-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <span className="font-display font-semibold text-white">Admin Panel</span>
          </div>

          <nav className="flex-1">
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/[0.02] transition-all mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Back to Dashboard</span>
            </Link>

            <div className="section-divider mb-4" />

            <div className="flex md:flex-col gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats}
                mrrData={mrrData}
                userGrowth={userGrowth}
                currentMRR={currentMRR}
                mrrGrowth={mrrGrowth}
                totalUsers={totalUsers}
                activeUsers={activeUsers}
              />
            )}
            {activeTab === 'revenue' && <RevenueTab mrrData={mrrData} currentMRR={currentMRR} />}
            {activeTab === 'users' && (
              <UsersTab users={users} onUpdateRole={updateUserRole} onToggleActive={toggleUserActive} />
            )}
            {activeTab === 'adsense' && <AdSenseTab config={config} onUpdate={updateConfig} />}
            {activeTab === 'config' && <ConfigTab config={config} onUpdate={updateConfig} />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================
function OverviewTab({
  stats, mrrData, userGrowth, currentMRR, mrrGrowth, totalUsers, activeUsers
}: {
  stats: AdminStats | null;
  mrrData: any[];
  userGrowth: any[];
  currentMRR: number;
  mrrGrowth: string;
  totalUsers: number;
  activeUsers: number;
}) {
  const overviewStats = [
    { label: 'Monthly Revenue', value: `$${currentMRR.toLocaleString()}`, change: `+${mrrGrowth}%`, positive: true, icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Total Users', value: totalUsers.toLocaleString(), change: '+12.4% this month', positive: true, icon: <Users className="w-5 h-5" /> },
    { label: 'Active Users', value: activeUsers.toLocaleString(), change: `${((activeUsers / totalUsers) * 100).toFixed(0)}% of total`, positive: true, icon: <Activity className="w-5 h-5" /> },
    { label: 'Total AUM', value: `$${(stats?.total_aum || 2400000).toLocaleString()}`, change: '+18.2%', positive: true, icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Conversion Rate', value: '4.2%', change: '+0.8%', positive: true, icon: <Target className="w-5 h-5" /> },
    { label: 'Churn Rate', value: '2.1%', change: '-0.5%', positive: true, icon: <UserMinus className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-gradient-silver">Admin Overview</h2>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <Clock className="w-3 h-3" />
          Last updated: just now
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-white/30">{stat.icon}</span>
              <span className="text-xs text-white/60">{stat.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold stat-mono text-white">{stat.value}</p>
            <p className={`text-xs stat-mono mt-2 ${stat.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MRR Chart */}
        <div className="glass-panel p-6">
          <h3 className="font-display font-semibold mb-6 text-white">Monthly Recurring Revenue</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.3)' }} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.3)' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(5, 5, 5, 0.95)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(20px)',
                  }}
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="#10B981" fill="url(#mrrGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="glass-panel p-6">
          <h3 className="font-display font-semibold mb-6 text-white">User Growth (30 days)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} interval={4} tick={{ fill: 'rgba(255,255,255,0.3)' }} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.3)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(5, 5, 5, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(20px)',
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" fill="url(#userGradient)" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="active" stroke="#10B981" strokeWidth={1} dot={false} name="Active" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="glass-panel p-6">
        <h3 className="font-display font-semibold mb-6 text-white">Conversion Funnel</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { stage: 'Visitors', count: '45,230', pct: '100%' },
            { stage: 'Signups', count: '2,847', pct: '6.3%' },
            { stage: 'Onboarded', count: '2,104', pct: '73.9%' },
            { stage: 'Trial', count: '892', pct: '42.4%' },
            { stage: 'Paid', count: '312', pct: '35.0%' },
          ].map((step, i) => (
            <div key={step.stage} className="text-center">
              <div className={`p-4 rounded-xl border ${
                i === 4 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.06]'
              }`}>
                <p className="text-2xl font-bold stat-mono text-white">{step.count}</p>
                <p className="text-xs text-white/60 mt-2">{step.stage}</p>
                <p className="text-xs text-blue-400 mt-1 stat-mono">{step.pct}</p>
              </div>
              {i < 4 && <div className="flex justify-center mt-2"><ChevronDown className="w-4 h-4 text-white/30" /></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel p-6">
        <h3 className="font-display font-semibold mb-6 text-white">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 rounded-xl border border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.02] transition-all text-center group">
            <Download className="w-6 h-6 mx-auto mb-3 text-blue-500 group-hover:text-blue-400 transition-colors" />
            <p className="text-sm text-white/60 group-hover:text-white transition-colors">Export Data</p>
          </button>
          <button className="p-4 rounded-xl border border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.02] transition-all text-center group">
            <UserPlus className="w-6 h-6 mx-auto mb-3 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
            <p className="text-sm text-white/60 group-hover:text-white transition-colors">Add User</p>
          </button>
          <button className="p-4 rounded-xl border border-white/[0.06] hover:border-amber-500/30 hover:bg-white/[0.02] transition-all text-center group">
            <Zap className="w-6 h-6 mx-auto mb-3 text-amber-500 group-hover:text-amber-400 transition-colors" />
            <p className="text-sm text-white/60 group-hover:text-white transition-colors">Send Alert</p>
          </button>
          <button className="p-4 rounded-xl border border-white/[0.06] hover:border-red-500/30 hover:bg-white/[0.02] transition-all text-center group">
            <AlertTriangle className="w-6 h-6 mx-auto mb-3 text-red-500 group-hover:text-red-400 transition-colors" />
            <p className="text-sm text-white/60 group-hover:text-white transition-colors">System Status</p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REVENUE TAB
// ============================================================
function RevenueTab({ mrrData, currentMRR }: { mrrData: any[]; currentMRR: number }) {
  const tierBreakdown = [
    { name: 'Free', value: 65, color: '#8892B0' },
    { name: 'Pro', value: 28, color: '#10B981' },
    { name: 'Enterprise', value: 7, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-display font-bold text-gradient-silver">Revenue Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5">
          <p className="text-xs text-white/60 mb-1">MRR</p>
          <p className="text-2xl font-bold stat-mono text-gradient-green">${currentMRR.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs text-white/60 mb-1">ARR</p>
          <p className="text-2xl font-bold stat-mono text-white">${(currentMRR * 12).toLocaleString()}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs text-white/60 mb-1">ARPU</p>
          <p className="text-2xl font-bold stat-mono text-white">${(currentMRR / 312).toFixed(2)}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs text-white/60 mb-1">LTV</p>
          <p className="text-2xl font-bold stat-mono text-gradient-gold">$847</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="font-display font-semibold mb-6 text-white">Revenue by Tier</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {tierBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(5, 5, 5, 0.95)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(20px)',
                  }}
                  formatter={(value: any) => [`${value}%`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {tierBreakdown.map((t) => (
              <div key={t.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-white/60">{t.name}</span>
                <span className="stat-mono text-white">{t.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="font-display font-semibold mb-6 text-white">Pricing Tiers</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="font-medium text-white/80">Free</p>
                <p className="text-xs text-white/60">Paper trading, 3 agents</p>
              </div>
              <div className="text-right">
                <p className="stat-mono font-bold text-white">$0</p>
                <p className="text-xs text-white/30">~1,850 users</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
              <div>
                <p className="font-medium text-emerald-500">Pro</p>
                <p className="text-xs text-white/60">Live trading, all agents</p>
              </div>
              <div className="text-right">
                <p className="stat-mono font-bold text-emerald-500">$29.99/mo</p>
                <p className="text-xs text-white/30">~797 users</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-500 flex items-center gap-2">
                  <Crown className="w-4 h-4" /> Enterprise
                </p>
                <p className="text-xs text-white/60">Custom agents, API access</p>
              </div>
              <div className="text-right">
                <p className="stat-mono font-bold text-amber-500">$199/mo</p>
                <p className="text-xs text-white/30">~200 users</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// USERS TAB
// ============================================================
function UsersTab({ users, onUpdateRole, onToggleActive }: {
  users: User[];
  onUpdateRole: (id: string, role: string) => void;
  onToggleActive: (id: string) => void;
}) {
  const roleStyles: Record<string, string> = {
    admin: 'text-red-400 border-red-500/30 bg-red-500/10',
    enterprise: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    pro: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    free: 'text-white/60 border-white/10 bg-white/[0.02]',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-gradient-silver">User Management</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60 stat-mono">{users.length} users</span>
          <button className="cta-button text-sm px-4 py-2.5 h-auto">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs text-white/30 font-medium p-4">User</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Role</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Status</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Trading</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Joined</th>
                <th className="text-left text-xs text-white/30 font-medium p-4">Last Login</th>
                <th className="text-right text-xs text-white/30 font-medium p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-white/30">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-8 h-8 text-white/10" />
                      <p className="text-sm">No users found. Users will appear here after registration.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-sm text-white">{user.full_name || user.email}</p>
                      <p className="text-xs text-white/30 stat-mono">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => onUpdateRole(user.id, e.target.value)}
                        className={`text-xs px-3 py-1.5 rounded-lg border bg-transparent cursor-pointer ${roleStyles[user.role] || roleStyles.free}`}
                      >
                        <option value="free" className="bg-black">Free</option>
                        <option value="pro" className="bg-black">Pro</option>
                        <option value="enterprise" className="bg-black">Enterprise</option>
                        <option value="admin" className="bg-black">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-3 py-1 rounded-lg ${
                        user.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-white/30">
                        {user.auto_trading_enabled ? (
                          <span className="text-emerald-400">Enabled</span>
                        ) : (
                          'Disabled'
                        )}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-white/30 stat-mono">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-white/30">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onToggleActive(user.id)}
                        className="text-xs text-white/30 hover:text-white transition-colors"
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADSENSE TAB
// ============================================================
function AdSenseTab({ config, onUpdate }: {
  config: SiteConfig;
  onUpdate: (key: string, value: string) => void;
}) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const vals: Record<string, string> = {};
    Object.entries(config).forEach(([key, data]) => {
      if (key.startsWith('adsense_')) {
        vals[key] = data.value;
      }
    });
    setLocalValues(vals);
  }, [config]);

  const handleSave = (key: string) => {
    onUpdate(key, localValues[key] || '');
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-2xl font-display font-bold text-gradient-silver">Google AdSense Configuration</h2>

      <div className="glass-panel p-6">
        <p className="text-sm text-white/60 mb-8">
          Enter your Google AdSense credentials below. Ads will appear on public pages for free-tier users.
          Pro and Enterprise users see no ads.
        </p>

        <div className="space-y-6">
          {[
            { key: 'adsense_client_id', label: 'Publisher ID', placeholder: 'ca-pub-XXXXXXXXXXXXXXXX', desc: 'Your AdSense publisher ID' },
            { key: 'adsense_slot_landing', label: 'Landing Page Ad Slot', placeholder: '1234567890', desc: 'Banner ad shown on the landing page' },
            { key: 'adsense_slot_dashboard', label: 'Dashboard Ad Slot', placeholder: '1234567890', desc: 'Sidebar ad shown in dashboard (free users only)' },
            { key: 'adsense_slot_predictions', label: 'Predictions Page Ad Slot', placeholder: '1234567890', desc: 'Ad shown on prediction markets page' },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-sm font-medium text-white/80 mb-2 block">{field.label}</label>
              <p className="text-xs text-white/30 mb-3">{field.desc}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localValues[field.key] || ''}
                  onChange={(e) => setLocalValues({ ...localValues, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="input-void flex-1"
                />
                <button
                  onClick={() => handleSave(field.key)}
                  className="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="font-display font-semibold mb-4 text-white">How It Works</h3>
        <ul className="text-sm text-white/60 space-y-3">
          <li className="flex items-start gap-3"><span className="text-blue-400 stat-mono">1.</span> Sign up at google.com/adsense</li>
          <li className="flex items-start gap-3"><span className="text-blue-400 stat-mono">2.</span> Get your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)</li>
          <li className="flex items-start gap-3"><span className="text-blue-400 stat-mono">3.</span> Create ad units in AdSense dashboard</li>
          <li className="flex items-start gap-3"><span className="text-blue-400 stat-mono">4.</span> Paste the slot IDs above</li>
          <li className="flex items-start gap-3"><span className="text-blue-400 stat-mono">5.</span> Ads automatically show to free-tier users</li>
          <li className="flex items-start gap-3"><span className="text-blue-400 stat-mono">6.</span> Pro/Enterprise users see no ads</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// CONFIG TAB
// ============================================================
function ConfigTab({ config, onUpdate }: {
  config: SiteConfig;
  onUpdate: (key: string, value: string) => void;
}) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const vals: Record<string, string> = {};
    Object.entries(config).forEach(([key, data]) => {
      vals[key] = data.value;
    });
    setLocalValues(vals);
  }, [config]);

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-2xl font-display font-bold text-gradient-silver">Site Configuration</h2>

      <div className="glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-xs text-white/30 font-medium p-4">Key</th>
              <th className="text-left text-xs text-white/30 font-medium p-4">Value</th>
              <th className="text-right text-xs text-white/30 font-medium p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(config).map(([key, data]) => (
              <tr key={key} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <p className="text-sm stat-mono text-white">{key}</p>
                  <p className="text-xs text-white/30 mt-1">{data.description}</p>
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={localValues[key] || ''}
                    onChange={(e) => setLocalValues({ ...localValues, [key]: e.target.value })}
                    className="w-full input-void py-2 px-3 text-sm"
                  />
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onUpdate(key, localValues[key] || '')}
                    className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
