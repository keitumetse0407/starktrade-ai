'use client';

import toast from 'react-hot-toast';

/**
 * Centralized toast notifications for StarkTrade AI
 * Usage: import { notify } from '@/lib/toast';
 *        notify.success('Trade executed!');
 */

const toastStyle = {
  style: {
    background: 'rgba(10, 14, 39, 0.95)',
    border: '1px solid rgba(0, 191, 255, 0.2)',
    borderRadius: '12px',
    color: '#E6F1FF',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    backdropFilter: 'blur(20px)',
  },
  duration: 4000,
  position: 'bottom-right' as const,
};

const successStyle = {
  ...toastStyle,
  style: {
    ...toastStyle.style,
    border: '1px solid rgba(0, 230, 118, 0.3)',
  },
  iconTheme: {
    primary: '#00E676',
    secondary: '#0A0E27',
  },
};

const errorStyle = {
  ...toastStyle,
  style: {
    ...toastStyle.style,
    border: '1px solid rgba(255, 51, 102, 0.3)',
  },
  iconTheme: {
    primary: '#FF3366',
    secondary: '#0A0E27',
  },
};

export const notify = {
  success: (message: string, duration?: number) =>
    toast.success(message, { ...successStyle, duration }),

  error: (message: string, duration?: number) =>
    toast.error(message, { ...errorStyle, duration }),

  info: (message: string, duration?: number) =>
    toast(message, { ...toastStyle, duration }),

  warning: (message: string, duration?: number) =>
    toast(message, {
      ...toastStyle,
      style: {
        ...toastStyle.style,
        border: '1px solid rgba(255, 215, 0, 0.3)',
      },
      icon: '⚠️',
      duration,
    }),

  /**
   * Trade execution notification
   */
  tradeExecuted: (symbol: string, side: string, price: number) =>
    toast.success(
      `${side === 'BUY' ? '🟢' : '🔴'} ${side} ${symbol} @ $${price.toFixed(2)}`,
      { ...successStyle, duration: 5000 }
    ),

  /**
   * Autopilot toggle notification
   */
  autopilotToggle: (enabled: boolean) =>
    enabled
      ? toast.success('🚀 Autopilot activated — AI agents are now trading', { ...successStyle, duration: 5000 })
      : toast('⏸️ Autopilot paused', { ...toastStyle, duration: 3000 }),

  /**
   * Settings saved notification
   */
  settingsSaved: () =>
    toast.success('✓ Settings saved successfully', { ...successStyle, duration: 3000 }),

  /**
   * API error notification
   */
  apiError: (message: string) =>
    notify.error(message || 'Failed to connect to server. Please try again.'),

  /**
   * Copy to clipboard notification
   */
  copied: (message?: string) =>
    toast.success(message ? `${message} copied!` : 'Copied to clipboard!', { ...successStyle, duration: 2000 }),

  /**
   * Dismiss all toasts
   */
  dismiss: () => toast.dismiss(),
};
