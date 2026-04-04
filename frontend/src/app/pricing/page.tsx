'use client';

import { useState } from 'react';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  description: string;
  features: string[];
}

interface PaymentResponse {
  success: boolean;
  payment_url?: string;
  form_html?: string;
  payment_id?: string;
  amount?: number;
  plan_name?: string;
  error?: string;
}

// ─── PRICING DATA (fallback if API unavailable) ─────────────────────────────

const PLANS: Plan[] = [
  {
    id: 'pro',
    name: 'StarkTrade AI Pro',
    amount: 99,
    currency: 'ZAR',
    description: 'Lifetime access - One-time payment (Normally R499/mo)',
    features: ['Unlimited signals', 'Advanced AI analysis', 'Priority support', 'WhatsApp alerts'],
  },
  {
    id: 'enterprise',
    name: 'StarkTrade AI Enterprise',
    amount: 499,
    currency: 'ZAR',
    description: 'Lifetime access - One-time payment (Normally R3,299/mo)',
    features: ['Everything in Pro', 'Custom strategies', 'API access', 'Dedicated support', 'White-label options'],
  },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    setError(null);

    try {
      // Get user info (adjust based on your auth system)
      const email = localStorage.getItem('user_email') || '';
      const userId = localStorage.getItem('user_id') || '';

      if (!email) {
        setError('Please log in to subscribe');
        setLoading(null);
        return;
      }

      // Call backend to create payment
      const response = await fetch('/api/payfast/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          email: email,
          user_id: userId,
          first_name: localStorage.getItem('user_first_name') || '',
          last_name: localStorage.getItem('user_last_name') || '',
        }),
      });

      const data: PaymentResponse = await response.json();

      if (data.success && data.payment_url) {
        // Redirect to PayFast
        window.location.href = data.payment_url;
      } else {
        setError(data.error || 'Payment creation failed');
      }
    } catch (err) {
      setError('Failed to connect to payment server');
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-gray-400 text-lg">
            Powered by AI. Priced in ZAR. Cancel anytime.
          </p>
        </div>

        {/* Crisis Pricing Banner */}
        <div className="bg-red-900/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-red-400 font-bold text-lg">
            ⚡ CRISIS PRICING: Lifetime Licenses Limited to 100 Customers Only ⚡
          </p>
          <p className="text-sm text-red-300 mt-1">
            After 100 licenses sold, pricing returns to monthly subscriptions
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gray-800/50 border rounded-2xl p-8 transition-all hover:scale-105 ${
                plan.id === 'pro'
                  ? 'border-gold/50 shadow-lg shadow-gold/10'
                  : 'border-gray-700'
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-black px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
              <p className="text-gray-400 mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-white">R{plan.amount}</span>
                <span className="text-green-400">one-time</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-gray-300">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
                  loading === plan.id
                    ? 'bg-gray-600 cursor-wait'
                    : plan.id === 'pro'
                    ? 'bg-gold text-black hover:bg-gold/90'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >\n                {loading === plan.id ? 'Processing...' : `Get Lifetime Access - R${plan.amount}`}\n              </button>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Secure one-time payments via PayFast. Supports card, bank, EFT & mobile money.
          </p>
        </div>

        {/* License Counter */}
        <div className="text-center text-sm text-opacity-70 mb-4">
          Licenses Sold: <span id="license-counter">87</span>/100
        </div>
        <div className="w-full bg-gray-800/50 rounded-full h-2.5 mb-4">
          <div 
            id="license-progress" 
            className="bg-gradient-to-r from-green-400 to-emerald-400 h-2.5 rounded-full transition-width duration-1000"
            style={{ width: '87%' }}
          ></div>
        </div>
      </div>
    </div>
  );
}
