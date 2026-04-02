import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  setToken: (token: string) => void;
  setUser: (user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));

interface DashboardState {
  portfolioValue: number;
  dailyPnl: number;
  winRate: number;
  sharpeRatio: number;
  agents: AgentStatus[];
  positions: Position[];
  setPortfolioData: (data: Partial<DashboardState>) => void;
}

interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'analyzing' | 'voting' | 'error';
  currentTask: string;
  performanceScore: number;
}

interface Position {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  portfolioValue: 0,
  dailyPnl: 0,
  winRate: 0,
  sharpeRatio: 0,
  agents: [],
  positions: [],
  setPortfolioData: (data) => set((state) => ({ ...state, ...data })),
}));
