import { create } from 'zustand';
import { getTrades, createTrade, updateTrade, deleteTrade, subscribeToTrades, Trade } from './pb';

interface TradesState {
  trades: Trade[];
  isLoading: boolean;
  error: string | null;
  fetchTrades: () => Promise<void>;
  addTrade: (trade: Omit<Trade, 'id' | 'created'>) => Promise<void>;
  closeTrade: (id: string, exit: number) => Promise<void>;
  removeTrade: (id: string) => Promise<void>;
  subscribeRealtime: () => void;
}

export const useTradesStore = create<TradesState>((set, get) => ({
  trades: [],
  isLoading: false,
  error: null,

  fetchTrades: async () => {
    set({ isLoading: true });
    try {
      const trades = await getTrades();
      set({ trades, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addTrade: async (trade) => {
    const newTrade = await createTrade(trade);
    set({ trades: [newTrade, ...get().trades] });
  },

  closeTrade: async (id, exit) => {
    const trade = get().trades.find(t => t.id === id);
    if (!trade) return;
    
    const profit = trade.type === 'long' 
      ? exit - trade.entry 
      : trade.entry - exit;
    
    const updated = await updateTrade(id, { exit, profit, status: 'closed' });
    set({ 
      trades: get().trades.map(t => t.id === id ? updated : t) 
    });
  },

  removeTrade: async (id) => {
    await deleteTrade(id);
    set({ trades: get().trades.filter(t => t.id !== id) });
  },

  subscribeRealtime: () => {
    subscribeToTrades((e) => {
      const { action, record } = e;
      if (action === 'create') {
        set({ trades: [record, ...get().trades] });
      } else if (action === 'update') {
        set({ trades: get().trades.map(t => t.id === record.id ? record : t) });
      } else if (action === 'delete') {
        set({ trades: get().trades.filter(t => t.id !== record.id) });
      }
    });
  }
}));
