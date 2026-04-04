'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  variant?: 'default' | 'sm' | 'lg';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', title: 'text-base', desc: 'text-xs', py: 'py-8' },
    default: { icon: 'w-12 h-12', title: 'text-lg', desc: 'text-sm', py: 'py-12' },
    lg: { icon: 'w-16 h-16', title: 'text-xl', desc: 'text-base', py: 'py-16' },
  };

  const s = sizes[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`glass-card flex flex-col items-center justify-center text-center ${s.py}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
        <Icon className={`${s.icon} text-muted/40`} />
      </div>
      <h3 className={`${s.title} font-semibold mb-2`}>{title}</h3>
      <p className={`${s.desc} text-muted max-w-sm mb-6 leading-relaxed`}>{description}</p>
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link href={actionHref} className="btn-primary text-sm">
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction} className="btn-primary text-sm">
            {actionLabel}
          </button>
        )
      )}
    </motion.div>
  );
}
