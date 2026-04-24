'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Shield, Zap, ArrowRight, ArrowLeft, Check, Eye, EyeOff,
  Sparkles, Target, Brain, TrendingUp, Lock, Mail, User, RefreshCw,
  Crown
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

const STRATEGIES: Record<string, { name: string; desc: string; emoji: string; gradient: string }> = {
  conservative: { name: 'Conservative', desc: 'Capital preservation first. Steady, low-risk returns.', emoji: '\u{1F6E1}\uFE0F', gradient: 'text-gradient-blue' },
  'all-weather': { name: 'All-Weather', desc: 'Balanced approach. Performs well in any market.', emoji: '\u26C5\uFE0F', gradient: 'text-gradient-green' },
  value: { name: 'Value', desc: 'Munger-style. Deep value, margin of safety.', emoji: '\u{1F9E0}', gradient: 'text-gradient-gold' },
  aggressive: { name: 'Aggressive', desc: 'Maximum growth. Higher risk, higher reward.', emoji: '\u{1F680}', gradient: 'text-gradient-silver' },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if already logged in — skip quiz, go straight to dashboard
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      // Verify token is still valid
      apiFetch('/auth/me')
        .then(res => {
          if (res.ok) {
            router.push('/dashboard');
          } else {
            setCheckingAuth(false);
          }
        })
        .catch(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, [router]);
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
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName || undefined,
          risk_tolerance: Math.round(answers.reduce((a, b) => a + b, 0) / answers.length) * 2.5 + 1,
          strategy: getStrategy(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || 'Could not create account. Please try a different email or check your connection.');
        setLoading(false);
        return;
      }

      const tokenData = await res.json();
      setAuthToken(tokenData.access_token);

      const meRes = await apiFetch('/auth/me');
      const me = await meRes.json();
      if (me.role === 'admin') {
        setIsAdmin(true);
      }

      setStep(0);
    } catch (err) {
      setError('Trading system is starting up. Please wait 30 seconds and try again, or check your internet connection.');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/auth/login', {
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

      // GO STRAIGHT TO DASHBOARD — NO QUIZ FOR RETURNING USERS
      router.push('/dashboard');
    } catch (err) {
      setError('Trading system is starting up. Please wait 30 seconds and try again, or check your internet connection.');
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

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="text-center relative z-10">
          <Zap className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-white/60 font-mono text-sm tracking-wider">VERIFYING SESSION</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient light orbs — Antigravity signature */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] animate-float-slow-delay pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* Hero grid */}
      <div className="absolute inset-0 hero-grid pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        {/* ======================== STEP -1: Register / Login ======================== */}
        <AnimatePresence mode="wait">
          {step === -1 && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="glass-panel p-8"
            >
              {/* Logo */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/6 flex items-center justify-center mx-auto mb-4"
                >
                  <Zap className="w-8 h-8 text-blue-500" />
                </motion.div>
                <h2 className="text-2xl font-display font-bold text-gradient-blue">
                  StarkTrade AI
                </h2>
                <p className="text-sm text-white/60 mt-2 font-sans">
                  Create your account. Get $100K in paper trading balance.
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/30 font-mono tracking-wider mb-2 block uppercase">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tony Stark"
                      className="input-void pl-11 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/30 font-mono tracking-wider mb-2 block uppercase">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tony@starkindustries.com"
                      className="input-void pl-11 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/30 font-mono tracking-wider mb-2 block uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="input-void pl-11 pr-12 font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && password.length < 8 && (
                    <p className="text-xs text-red-400 mt-2 font-mono">Password must be at least 8 characters</p>
                  )}
                </div>

                {/* Terms checkbox */}
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl hover:bg-white/[0.02] transition-colors group" onClick={() => setAgreeTerms(!agreeTerms)}>
                  <div className="relative mt-0.5">
                    <div className="w-5 h-5 rounded-md border border-white/10 bg-white/[0.02] transition-all flex items-center justify-center" style={{borderColor: agreeTerms ? '#3b82f6' : undefined, backgroundColor: agreeTerms ? 'rgba(59,130,246,0.2)' : undefined}}>
                      {agreeTerms && <Check className="w-3 h-3 text-blue-500" />}
                    </div>
                  </div>
                  <span className="text-xs text-white/60 leading-relaxed font-sans">
                    I agree to the{' '}
                    <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Terms of Service</a>
                    ,{' '}
                    <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</a>
                    , and{' '}
                    <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">Risk Disclosure</a>
                    . I understand that trading involves risk of loss.
                  </span>
                </label>
              </div>

              {/* Primary actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleRegister}
                  disabled={loading || !email || !password || !agreeTerms}
                  className="cta-button w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none font-sans"
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
                  className="ghost-button w-full disabled:opacity-40 disabled:cursor-not-allowed font-sans text-sm py-3"
                >
                  {loading ? 'Signing In...' : 'Already have an account? Sign In'}
                </button>
              </div>

              {/* Divider */}
              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 section-divider" />
                <span className="text-xs text-white/30 font-mono tracking-wider">OR CONTINUE WITH</span>
                <div className="flex-1 section-divider" />
              </div>

              {/* OAuth buttons */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="ghost-button text-sm py-3 font-sans">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>
                <button className="ghost-button text-sm py-3 font-sans">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>

              {/* Admin hint */}
              <p className="text-xs text-white/30 text-center mt-6 font-mono tracking-wide">
                First user gets full admin access automatically
              </p>
            </motion.div>
          )}

          {/* ======================== STEP 0 to N: Quiz ======================== */}
          {step >= 0 && step < QUIZ_QUESTIONS.length && (
            <motion.div
              key={`quiz-${step}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="glass-panel p-8"
            >
              {/* Admin badge */}
              {isAdmin && (
                <div className="mb-6 p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
                  <Crown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400 font-sans">Admin access granted — you&apos;re the founder</span>
                </div>
              )}

              {/* Progress */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-white/30 stat-mono">{step + 1}/{QUIZ_QUESTIONS.length}</span>
              </div>

              {/* Question */}
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5"
                >
                  {QUIZ_QUESTIONS[step].icon}
                </motion.div>
                <h2 className="text-xl font-display font-semibold text-white mb-2">
                  {QUIZ_QUESTIONS[step].question}
                </h2>
                <p className="text-sm text-white/60 font-sans">
                  {QUIZ_QUESTIONS[step].subtitle}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {QUIZ_QUESTIONS[step].options.map((option, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    onClick={() => handleAnswer(option.value)}
                    className="w-full text-left px-6 py-4 rounded-xl border border-white/6 bg-white/[0.01]
                               hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-sm font-sans
                               group flex items-center justify-between"
                  >
                    <span className="text-white/80 group-hover:text-white transition-colors">{option.text}</span>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </motion.button>
                ))}
              </div>

              {/* Back */}
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="mt-6 text-sm text-white/30 hover:text-white/60 flex items-center gap-2 transition-colors font-sans"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              )}
            </motion.div>
          )}

          {/* ======================== FINAL: Strategy Result ======================== */}
          {step >= QUIZ_QUESTIONS.length && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 18, stiffness: 120 }}
              className="glass-panel p-8 text-center"
            >
              {/* Admin badge */}
              {isAdmin && (
                <div className="mb-6 p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-center gap-3">
                  <Crown className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400 font-sans">Admin mode active</span>
                  <a
                    href="/admin"
                    onClick={(e) => { e.preventDefault(); router.push('/admin'); }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline ml-2"
                  >
                    Go to Admin Panel
                  </a>
                </div>
              )}

              {/* Strategy emoji */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                className="text-6xl mb-6"
              >
                {STRATEGIES[getStrategy()]?.emoji || '\u{1F680}'}
              </motion.div>

              <h2 className="text-2xl font-display font-bold text-white mb-2">
                Your Autopilot Is Ready
              </h2>
              <p className="text-white/60 mb-6 font-sans">
                Based on your profile, we recommend:
              </p>

              {/* Strategy card */}
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/6 mb-6">
                <p className={`text-3xl font-display font-bold mb-2 ${STRATEGIES[getStrategy()]?.gradient || 'text-gradient-blue'}`}>
                  {STRATEGIES[getStrategy()]?.name || 'All-Weather'} Strategy
                </p>
                <p className="text-sm text-white/60 font-sans">
                  {STRATEGIES[getStrategy()]?.desc || 'Balanced approach for any market.'}
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-8 text-center">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-xl font-bold stat-mono text-emerald-400">$100K</p>
                  <p className="text-xs text-white/30 mt-1 font-sans">Paper Balance</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="text-xl font-bold stat-mono text-blue-400">7</p>
                  <p className="text-xs text-white/30 mt-1 font-sans">AI Agents</p>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-xl font-bold stat-mono text-amber-400">24/7</p>
                  <p className="text-xs text-white/30 mt-1 font-sans">Monitoring</p>
                </div>
              </div>

              {/* Divider */}
              <div className="section-divider mb-6" />

              {/* CTA buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="cta-button font-sans"
                >
                  Launch Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="ghost-button font-sans text-sm py-3 border-red-500/30 text-red-400 hover:bg-red-500/5"
                  >
                    Admin Panel
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
