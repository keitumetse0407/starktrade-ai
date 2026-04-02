'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid';

interface ReferralState {
  code: string;
  referrals: number;
  credits: number;
}

export function useReferral() {
  const [referral, setReferral] = useState<ReferralState | null>(null);

  useEffect(() => {
    // Get or create referral code
    if (typeof window !== 'undefined') {
      let code = localStorage.getItem('referral_code');
      if (!code) {
        code = nanoid(8);
        localStorage.setItem('referral_code', code);
      }
      
      const referrals = parseInt(localStorage.getItem('referral_count') || '0');
      const credits = parseInt(localStorage.getItem('referral_credits') || '0');
      
      setReferral({ code, referrals, credits });
    }
  }, []);

  const getReferralLink = () => {
    if (!referral) return '';
    return `https://starktrade-ai.vercel.app?ref=${referral.code}`;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!', {
      style: {
        background: 'rgba(10, 14, 39, 0.95)',
        border: '1px solid rgba(0, 255, 136, 0.2)',
        color: '#E6F1FF',
      },
    });
  };

  const shareWhatsApp = () => {
    const link = getReferralLink();
    const text = encodeURIComponent(
      `🚀 Check out StarkTrade AI — 7 AI agents trade for you automatically!\n\nFree to start (no credit card):\n${link}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareTwitter = () => {
    const link = getReferralLink();
    const text = encodeURIComponent(
      `I just found this AI trading platform with 7 specialized agents. Free to try! ${link}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return {
    referral,
    getReferralLink,
    copyReferralLink,
    shareWhatsApp,
    shareTwitter,
  };
}

// Referral dashboard component
export function ReferralDashboard() {
  const { referral, copyReferralLink, shareWhatsApp, shareTwitter, getReferralLink } = useReferral();

  if (!referral) return null;

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <span className="text-xl">🎁</span> Refer & Earn
      </h3>
      
      <p className="text-sm text-muted">
        Get <span className="text-profit font-semibold">1 month free Pro</span> for every friend who upgrades.
      </p>

      <div className="p-3 rounded-lg bg-navy/50 border border-white/5">
        <p className="text-xs text-muted mb-1">Your referral link</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-electric flex-1 truncate">
            {getReferralLink()}
          </code>
          <button
            onClick={copyReferralLink}
            className="px-3 py-1 rounded bg-electric/10 text-electric text-xs hover:bg-electric/20 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-navy/50 text-center">
          <p className="text-2xl font-bold font-mono">{referral.referrals}</p>
          <p className="text-xs text-muted">Referrals</p>
        </div>
        <div className="p-3 rounded-lg bg-profit/5 border border-profit/10 text-center">
          <p className="text-2xl font-bold font-mono text-profit">{referral.credits}</p>
          <p className="text-xs text-muted">Free Months</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={shareWhatsApp}
          className="flex-1 py-2 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
        >
          Share on WhatsApp
        </button>
        <button
          onClick={shareTwitter}
          className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
        >
          Share on Twitter
        </button>
      </div>
    </div>
  );
}
