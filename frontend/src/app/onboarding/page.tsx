'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Shield, Zap, ArrowRight, ArrowLeft, Check, Eye, EyeOff,
  Sparkles, Target, Brain, TrendingUp, Lock, Mail, User, RefreshCw
} from 'lucide-react';
import { apiFetch, setAuthToken } from '@/lib/api';

const QUIZ_QUESTIONS = [
  {
    question: 'How would you describe your trading experience?',
    subtitle: 'This helps us calibrate agent aggression levels',
    icon: <Brain className="w-6 h-6" />,
    options: [
      { text: 'Beginner (< 1 year)', value: 0 },
      { text: 'Intermediate (1-3 years)', value: 1 },
      { text: 'Advanced (3-5 years)', value: 2 },
      { text: 'Expert (5+ years)', value: 3 },
    ],
  },
  {
    question: 'What is your risk tolerance?',
    subtitle: 'Be honest — the Risk Manager needs accurate data',
    icon: <Shield className="w-6 h-6" />,
    options: [
      { text: 'Very Low — I can\'t handle any losses', value: 0 },
      { text: 'Low — Small losses are okay', value: 1 },
      { text: 'Medium — I accept moderate swings', value: 2 },
      { text: 'High — Bring on the volatility', value: 3 },
    ],
  },
  {
    question: 'What is your primary investment goal?',
    subtitle: 'Different goals activate different agent strategies',
    icon: <Target className="w-6 h-6" />,
    options: [
      { text: 'Capital preservation', value: 0 },
      { text: 'Steady income', value: 1 },
      { text: 'Long-term growth', value: 2 },
      { text: 'Aggressive growth', value: 3 },
    ],
  },
  {
    question: 'How much capital are you starting with?',
    subtitle: 'This determines position sizing algorithms',
    icon: <TrendingUp className="w-6 h-6" />,
    options: [
      { text: '< $10K', value: 0 },
      { text: '$10K - $50K', value: 1 },
      { text: '$50K - $200K', value: 2 },
      { text: '$200K+', value: 3 },
    ],
  },
  {
    question: 'What is your investment time horizon?',
    subtitle: 'Affects agent hold times and strategy selection',
    icon: <Sparkles className="w-6 h-6" />,
    options: [
      { text: '< 6 months', value: 0 },
      { text: '6 months - 2 years', value: 1 },
      { text: '2-10 years', value: 2 },
      { text: '10+ years', value: 3 },
    ],
  },
];

const STRATEGIES: Record<string, { name: string; desc: string; emoji: string }> = {
  conservative: { name: 'Conservative', desc: 'Capital preservation first. Steady, low-risk returns.', emoji: '🛡️' },
  'all-weather': { name: 'All-Weather', desc: 'Balanced approach. Performs well in any market.', emoji: '🌤️' },
  value: { name: 'Value', desc: 'Munger-style. Deep value, margin of safety.', emoji: '🧠' },
  aggressive: { name: 'Aggressive', desc: 'Maximum growth. Higher risk, higher reward.', emoji: '🚀' },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!agreeTerms) {
      setError('Please accept the Terms of Service and Risk Disclosure');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);

    try {
      const res = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Registration failed');
        setLoading(false);
        return;
      }

      const tokenData = await res.json();
      setAuthToken(tokenData.access_token);

      const meRes = await apiFetch('/api/v1/auth/me');
      const me = await meRes.json();
      if (me.role === 'admin') {
        setIsAdmin(true);
      }

      setStep(0);
    } catch (err) {
      setError('Connection error. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Login failed');
        setLoading(false);
        return;
      }

      const tokenData = await res.json();
      setAuthToken(tokenData.access_token);

      const meRes = await apiFetch('/api/v1/auth/me');
      const me = await meRes.json();
      if (me.role === 'admin') {
        setIsAdmin(true);
      }

      setStep(0);
    } catch (err) {
      setError('Connection error. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (step < QUIZ_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUIZ_QUESTIONS.length);
    }
  };

  const getStrategy = () => {
    const avg = answers.reduce((a, b) => a + b, 0) / Math.max(answers.length, 1);
    if (avg < 1) return 'conservative';
    if (avg < 2) return 'all-weather';
    if (avg < 3) return 'value';
    return 'aggressive';
  };

  const progress = step >= 0 ? ((step + 1) / QUIZ_QUESTIONS.length) * 100 : 0;

  return (
    <div className="min-h-screen gradient-mesh grid-bg flex items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-electric/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* STEP -1: Registration / Login */}
        {step === -1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-electric" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to StarkTrade AI</h2>
              <p className="text-sm text-muted mt-2">
                Create your account and get $100K in paper trading balance
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tony Stark"
                    className="input-stark pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tony@starkindustries.com"
                    className="input-stark pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="input-stark pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-loss mt-1">Password must be at least 8 characters</p>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="accent-electric w-4 h-4 mt-0.5"
                />
                <span className="text-xs text-muted leading-relaxed">
                  I agree to the <a href="#" className="text-electric hover:underline">Terms of Service</a>,{' '}
                  <a href="#" className="text-electric hover:underline">Privacy Policy</a>, and{' '}
                  <a href="#" className="text-electric hover:underline">Risk Disclosure</a>.
                  I understand that trading involves risk of loss.
                </span>
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRegister}
                disabled={loading || !email || !password || !agreeTerms}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Creating Account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Create Free Account <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>

              <button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="btn-outline w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Already have an account? Sign In'}
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-muted">or continue with</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn-outline text-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button className="btn-outline text-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
            </div>

            <p className="text-xs text-muted text-center mt-4">
              First user gets full admin access automatically
            </p>
          </motion.div>
        )}

        {/* STEP 0 to N: Quiz */}
        {step >= 0 && step < QUIZ_QUESTIONS.length && (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card p-8"
          >
            {isAdmin && (
              <div className="mb-6 p-3 rounded-lg bg-loss/10 border border-loss/20 flex items-center gap-2">
                <Shield className="w-4 h-4 text-loss" />
                <span className="text-sm text-loss">Admin access granted — you're the founder</span>
              </div>
            )}

            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-1.5 rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-electric"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-muted font-mono">{step + 1}/{QUIZ_QUESTIONS.length}</span>
            </div>

            {/* Question */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-xl bg-electric/10 text-electric flex items-center justify-center mb-4">
                {QUIZ_QUESTIONS[step].icon}
              </div>
              <h2 className="text-xl font-bold mb-2">{QUIZ_QUESTIONS[step].question}</h2>
              <p className="text-sm text-muted">{QUIZ_QUESTIONS[step].subtitle}</p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {QUIZ_QUESTIONS[step].options.map((option, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleAnswer(option.value)}
                  className="w-full text-left px-6 py-4 rounded-xl border border-white/10 
                             hover:border-electric/30 hover:bg-electric/5 transition-all text-sm
                             group flex items-center justify-between"
                >
                  <span>{option.text}</span>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-electric transition-colors" />
                </motion.button>
              ))}
            </div>

            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="mt-4 text-sm text-muted hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
          </motion.div>
        )}

        {/* FINAL: Strategy Result */}
        {step >= QUIZ_QUESTIONS.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="glass-card p-8 text-center"
          >
            {isAdmin && (
              <div className="mb-4 p-3 rounded-lg bg-loss/10 border border-loss/20 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-loss" />
                <span className="text-sm text-loss">Admin mode active</span>
              </div>
            )}

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, delay: 0.2 }}
              className="text-6xl mb-6"
            >
              {STRATEGIES[getStrategy()]?.emoji || '🚀'}
            </motion.div>

            <h2 className="text-2xl font-bold mb-2">Your Autopilot Is Ready</h2>
            <p className="text-muted mb-4">Based on your profile, we recommend:</p>

            <div className="glass p-6 rounded-xl mb-6">
              <p className="text-3xl font-bold text-electric mb-2">
                {STRATEGIES[getStrategy()]?.name || 'All-Weather'} Strategy
              </p>
              <p className="text-sm text-muted">
                {STRATEGIES[getStrategy()]?.desc || 'Balanced approach for any market.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <div className="p-3 rounded-lg bg-profit/5 border border-profit/10">
                <p className="text-lg font-bold font-mono text-profit">$100K</p>
                <p className="text-xs text-muted">Paper Balance</p>
              </div>
              <div className="p-3 rounded-lg bg-electric/5 border border-electric/10">
                <p className="text-lg font-bold font-mono text-electric">7</p>
                <p className="text-xs text-muted">AI Agents</p>
              </div>
              <div className="p-3 rounded-lg bg-gold/5 border border-gold/10">
                <p className="text-lg font-bold font-mono text-gold">24/7</p>
                <p className="text-xs text-muted">Monitoring</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-primary flex items-center gap-2"
              >
                Launch Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="btn-outline text-loss border-loss/30 hover:bg-loss/5"
                >
                  Admin Panel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
