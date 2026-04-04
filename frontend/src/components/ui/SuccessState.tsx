'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, LucideIcon } from 'lucide-react';

interface SuccessStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  showConfetti?: boolean;
  duration?: number;
  onClose?: () => void;
}

export function SuccessState({
  icon: Icon = CheckCircle,
  title,
  description,
  showConfetti = false,
  duration,
  onClose,
}: SuccessStateProps) {
  const confettiColors = ['#00BFFF', '#00E676', '#FFD700', '#FF3366', '#A8B2D1'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card p-6 border border-profit/20 bg-profit/5 relative overflow-hidden"
    >
      {/* Confetti effect */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {confettiColors.map((color, i) => (
              <motion.div
                key={i}
                className="confetti-piece"
                style={{
                  backgroundColor: color,
                  left: `${10 + i * 20}%`,
                  top: '-10px',
                  animationDelay: `${i * 0.1}s`,
                }}
                initial={{ y: -10, opacity: 1, rotate: 0 }}
                animate={{ y: 100, opacity: 0, rotate: 360 }}
                transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-profit/10 flex items-center justify-center flex-shrink-0 success-pop">
          <Icon className="w-6 h-6 text-profit" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-profit mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-muted leading-relaxed">{description}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors p-1"
          >
            ✕
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div className="glass-card p-4 border border-profit/30 bg-profit/10 flex items-center gap-3 shadow-glow-profit">
        <CheckCircle className="w-5 h-5 text-profit flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <Sparkles className="w-4 h-4 text-profit/50" />
      </div>
    </motion.div>
  );
}
