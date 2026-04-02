'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CountdownTimerProps {
  // Default: 72 hours from now
  endDate?: Date;
  showCTA?: boolean;
}

export function CountdownTimer({ endDate, showCTA = true }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  // Default: 72 hours from first visit (stored in localStorage)
  const getEndDate = () => {
    if (endDate) return endDate;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('countdown_end');
      if (stored) {
        return new Date(stored);
      }
      // Set 72 hours from now
      const end = new Date(Date.now() + 72 * 60 * 60 * 1000);
      localStorage.setItem('countdown_end', end.toISOString());
      return end;
    }
    return new Date(Date.now() + 72 * 60 * 60 * 1000);
  };

  useEffect(() => {
    const target = getEndDate();
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0) {
        setExpired(true);
        return;
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (expired) return null;

  return (
    <div className="glass-card p-6 border-electric/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-loss/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-loss" />
        </div>
        <div>
          <h3 className="font-semibold text-loss">Early Bird Pricing Ends Soon</h3>
          <p className="text-xs text-muted">Lock in $29.99/mo before it goes to $49.99</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { value: timeLeft.days, label: 'Days' },
          { value: timeLeft.hours, label: 'Hours' },
          { value: timeLeft.minutes, label: 'Mins' },
          { value: timeLeft.seconds, label: 'Secs' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="bg-navy/50 rounded-lg p-3 border border-white/5">
              <span className="text-2xl font-bold font-mono text-loss">
                {String(item.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xs text-muted mt-1 block">{item.label}</span>
          </div>
        ))}
      </div>

      {showCTA && (
        <Link
          href="/onboarding"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Lock In Early Bird Price
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// Inline countdown for pricing cards
export function InlineCountdown() {
  const [hours, setHours] = useState(71);
  const [minutes, setMinutes] = useState(59);
  const [seconds, setSeconds] = useState(59);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s === 0) {
          setMinutes((m) => {
            if (m === 0) {
              setHours((h) => Math.max(0, h - 1));
              return 59;
            }
            return m - 1;
          });
          return 59;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs text-loss font-mono">
      {hours}h {minutes}m {seconds}s left
    </span>
  );
}
