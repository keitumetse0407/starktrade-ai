'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'avatar' | 'card' | 'chart' | 'circle' | 'button';
  className?: string;
  count?: number;
}

export function Skeleton({ variant = 'text', className = '', count = 1 }: SkeletonProps) {
  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'w-10 h-10 rounded-full',
    card: 'h-32 w-full rounded-2xl',
    chart: 'h-64 w-full rounded-xl',
    circle: 'w-8 h-8 rounded-full',
    button: 'h-10 w-32 rounded-xl',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`skeleton ${variants[variant]} ${className}`}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-card p-6 space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circle" />
        <Skeleton variant="title" className="w-1/2" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton variant="circle" />
              <Skeleton variant="text" className="w-16" />
            </div>
            <Skeleton variant="title" className="w-2/3" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="glass-card p-8">
        <Skeleton variant="title" className="w-1/3 mb-4" />
        <Skeleton variant="text" className="w-2/3" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    </div>
  );
}
