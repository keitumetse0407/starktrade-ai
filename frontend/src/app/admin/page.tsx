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

const COLORS = ['#00D4FF', '#00FF88', '#FF3366', '#FFD700', '#8892B0'];

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
        fetch('/api/v1/admin/stats', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/v1/admin/config', { headers: { Authorization: `Bearer ${t}` } }),
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
    await fetch(`/api/v1/admin/config/${key}?value=${encodeURIComponent(value)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData(token);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!token) return;
    await fetch(`/api/v1/admin/users/${userId}/role?new_role=${newRole}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData(token);
  };

  const toggleUserActive = async (userId: string) => {
    if (!token) return;
    await fetch(`/api/v1/admin/users/${userId}/toggle-active`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData(token);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-mesh grid-bg flex items-center justify-center px-6">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-electric" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Admin Access</h2>
          <p className="text-muted mb-6">Login with an admin account to access this panel.</p>
          {error && <p className="text-loss text-sm mb-4">{error}</p>}
          <Link href="/onboarding" className="btn-primary inline-flex items-center gap-2">
            Go to Login <ArrowLeft className="w-4 h-4" />
          </Link>
          <p className="text-xs text-muted mt-4">
            First time? Register at /onboarding, then manually set role='admin' in the database.
          </p>
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass border-r border-white/5 p-4 flex flex-col md:min-h-screen">
        <div className="flex items-center gap-2 mb-8">
          <Shield className="w-6 h-6 text-loss" />
          <span className="font-bold">Admin Panel</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-x-auto md:overflow-visible">
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="border-t border-white/5 my-2 pt-2" />

          <div className="flex md:flex-col gap-1 min-w-max md:min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-loss/10 text-loss border border-loss/20'
                      : 'text-muted hover:text-white hover:bg-white/5'
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
      <main className="flex-1 p-4 md:p-6 overflow-auto">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin Overview</h2>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Clock className="w-3 h-3" />
          Last updated: just now
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-muted">{stat.icon}</span>
              <span className="text-xs text-muted">{stat.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono">{stat.value}</p>
            <p className={`text-xs font-mono mt-1 ${stat.positive ? 'text-profit' : 'text-loss'}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MRR Chart */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Monthly Recurring Revenue</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#8892B0" fontSize={10} />
                <YAxis stroke="#8892B0" fontSize={10} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 39, 0.9)',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'MRR']}
                />
                <Area type="monotone" dataKey="mrr" stroke="#00FF88" fill="url(#mrrGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">User Growth (30 days)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#8892B0" fontSize={9} interval={4} />
                <YAxis stroke="#8892B0" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 39, 0.9)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#00D4FF" fill="url(#userGradient)" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="active" stroke="#00FF88" strokeWidth={1} dot={false} name="Active" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Conversion Funnel</h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { stage: 'Visitors', count: '45,230', pct: '100%' },
            { stage: 'Signups', count: '2,847', pct: '6.3%' },
            { stage: 'Onboarded', count: '2,104', pct: '73.9%' },
            { stage: 'Trial', count: '892', pct: '42.4%' },
            { stage: 'Paid', count: '312', pct: '35.0%' },
          ].map((step, i) => (
            <div key={step.stage} className="text-center">
              <div className={`p-4 rounded-xl border ${
                i === 4 ? 'bg-profit/10 border-profit/20' : 'bg-white/5 border-white/5'
              }`}>
                <p className="text-2xl font-bold font-mono">{step.count}</p>
                <p className="text-xs text-muted mt-1">{step.stage}</p>
                <p className="text-xs text-electric mt-1">{step.pct}</p>
              </div>
              {i < 4 && <ChevronDown className="w-4 h-4 text-muted mx-auto mt-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 rounded-lg border border-white/10 hover:border-electric/30 transition-all text-center">
            <Download className="w-6 h-6 mx-auto mb-2 text-electric" />
            <p className="text-sm">Export Data</p>
          </button>
          <button className="p-4 rounded-lg border border-white/10 hover:border-profit/30 transition-all text-center">
            <UserPlus className="w-6 h-6 mx-auto mb-2 text-profit" />
            <p className="text-sm">Add User</p>
          </button>
          <button className="p-4 rounded-lg border border-white/10 hover:border-gold/30 transition-all text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-gold" />
            <p className="text-sm">Send Alert</p>
          </button>
          <button className="p-4 rounded-lg border border-white/10 hover:border-loss/30 transition-all text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-loss" />
            <p className="text-sm">System Status</p>
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
    { name: 'Pro', value: 28, color: '#00FF88' },
    { name: 'Enterprise', value: 7, color: '#FFD700' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Revenue Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">MRR</p>
          <p className="text-2xl font-bold font-mono text-profit">${currentMRR.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">ARR</p>
          <p className="text-2xl font-bold font-mono">${(currentMRR * 12).toLocaleString()}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">ARPU</p>
          <p className="text-2xl font-bold font-mono">${(currentMRR / 312).toFixed(2)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-muted mb-1">LTV</p>
          <p className="text-2xl font-bold font-mono text-gold">$847</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Revenue by Tier</h3>
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
          <div className="flex justify-center gap-6">
            {tierBreakdown.map((t) => (
              <div key={t.name} className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
                <span className="text-muted">{t.name}</span>
                <span className="font-mono">{t.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Pricing Tiers</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-navy/50 border border-white/5 flex items-center justify-between">
              <div>
                <p className="font-medium">Free</p>
                <p className="text-xs text-muted">Paper trading, 3 agents</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold">$0</p>
                <p className="text-xs text-muted">~1,850 users</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-profit/5 border border-profit/10 flex items-center justify-between">
              <div>
                <p className="font-medium text-profit">Pro</p>
                <p className="text-xs text-muted">Live trading, all agents</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-profit">$29.99/mo</p>
                <p className="text-xs text-muted">~797 users</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/10 flex items-center justify-between">
              <div>
                <p className="font-medium text-gold flex items-center gap-2">
                  <Crown className="w-4 h-4" /> Enterprise
                </p>
                <p className="text-xs text-muted">Custom agents, API access</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-gold">$199/mo</p>
                <p className="text-xs text-muted">~200 users</p>
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
  const roleColors: Record<string, string> = {
    admin: 'text-loss border-loss/30 bg-loss/10',
    enterprise: 'text-gold border-gold/30 bg-gold/10',
    pro: 'text-profit border-profit/30 bg-profit/10',
    free: 'text-muted border-white/10 bg-white/5',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{users.length} users</span>
          <button className="btn-primary text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-muted p-4">User</th>
                <th className="text-left text-xs text-muted p-4">Role</th>
                <th className="text-left text-xs text-muted p-4">Status</th>
                <th className="text-left text-xs text-muted p-4">Trading</th>
                <th className="text-left text-xs text-muted p-4">Joined</th>
                <th className="text-left text-xs text-muted p-4">Last Login</th>
                <th className="text-right text-xs text-muted p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No users found. Users will appear here after registration.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-sm">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => onUpdateRole(user.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded border bg-transparent ${roleColors[user.role] || ''}`}
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.is_active ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                      }`}>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted">
                        {user.auto_trading_enabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onToggleActive(user.id)}
                        className="text-xs text-muted hover:text-white transition-colors"
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
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Google AdSense Configuration</h2>

      <div className="glass-card p-6">
        <p className="text-sm text-muted mb-6">
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
              <label className="text-sm font-medium mb-2 block">{field.label}</label>
              <p className="text-xs text-muted mb-2">{field.desc}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localValues[field.key] || ''}
                  onChange={(e) => setLocalValues({ ...localValues, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="input-stark flex-1"
                />
                <button
                  onClick={() => handleSave(field.key)}
                  className="px-4 py-2 bg-electric/10 border border-electric/30 rounded-lg text-electric text-sm hover:bg-electric/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-2">How It Works</h3>
        <ul className="text-sm text-muted space-y-2">
          <li className="flex items-start gap-2"><span className="text-electric">1.</span> Sign up at google.com/adsense</li>
          <li className="flex items-start gap-2"><span className="text-electric">2.</span> Get your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)</li>
          <li className="flex items-start gap-2"><span className="text-electric">3.</span> Create ad units in AdSense dashboard</li>
          <li className="flex items-start gap-2"><span className="text-electric">4.</span> Paste the slot IDs above</li>
          <li className="flex items-start gap-2"><span className="text-electric">5.</span> Ads automatically show to free-tier users</li>
          <li className="flex items-start gap-2"><span className="text-electric">6.</span> Pro/Enterprise users see no ads</li>
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
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Site Configuration</h2>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-muted p-4">Key</th>
              <th className="text-left text-xs text-muted p-4">Value</th>
              <th className="text-right text-xs text-muted p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(config).map(([key, data]) => (
              <tr key={key} className="border-b border-white/5">
                <td className="p-4">
                  <p className="text-sm font-mono">{key}</p>
                  <p className="text-xs text-muted">{data.description}</p>
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={localValues[key] || ''}
                    onChange={(e) => setLocalValues({ ...localValues, [key]: e.target.value })}
                    className="w-full bg-navy/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono focus:border-electric/50 focus:outline-none"
                  />
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onUpdate(key, localValues[key] || '')}
                    className="px-3 py-1.5 bg-electric/10 border border-electric/30 rounded-lg text-electric text-xs hover:bg-electric/20 transition-all"
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
