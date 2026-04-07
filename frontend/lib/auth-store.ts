import { create } from 'zustand';
import { pb, login as pbLogin, signup as pbSignup, logout as pbLogout, getUser } from './pb';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await pbLogin(email, password);
      set({ user: getUser(), isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      await pbSignup(email, password, name);
      set({ user: getUser(), isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    pbLogout();
    set({ user: null });
  },

  checkAuth: () => {
    set({ user: getUser(), isLoading: false });
  }
}));
