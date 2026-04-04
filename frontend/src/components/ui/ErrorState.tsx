'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorStateProps {
  code?: number;
  title?: string;
  message: string;
  onRetry?: () => void;
  showHome?: boolean;
  variant?: 'inline' | 'full';
}

export function ErrorState({
  code,
  title,
  message,
  onRetry,
  showHome = true,
  variant = 'inline',
}: ErrorStateProps) {
  if (variant === 'full') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-loss/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-loss" />
          </div>
          {code && <p className="text-6xl font-bold text-loss/20 mb-2 font-mono">{code}</p>}
          <h2 className="text-2xl font-bold mb-3">{title || 'Something went wrong'}</h2>
          <p className="text-sm text-muted mb-8 leading-relaxed">{message}</p>
          <div className="flex gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="btn-primary inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            {showHome && (
              <Link href="/" className="btn-outline inline-flex items-center gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 border border-loss/20 bg-loss/5"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-loss/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-loss" />
        </div>
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          <p className="text-sm text-muted leading-relaxed">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg bg-loss/20 text-loss text-xs font-medium hover:bg-loss/30 transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </motion.div>
  );
}
