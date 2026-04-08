'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, Eye, EyeOff, Brain, Shield, Target, TrendingUp, ArrowRight, ArrowLeft } from 'lucide-react';
import { pb } from '@/lib/api';

const QUIZ_QUESTIONS = [
  { question: 'How would you describe your trading experience?', subtitle: 'This helps us calibrate agent aggression levels', icon: <Brain className="w-6 h-6" />, options: [{ text: 'Beginner (< 1 year)', value: 0 }, { text: 'Intermediate (1-3 years)', value: 1 }, { text: 'Advanced (3-5 years)', value: 2 }, { text: 'Expert (5+ years)', value: 3 }] },
  { question: 'What is your risk tolerance?', subtitle: 'Be honest — the Risk Manager needs accurate data', icon: <Shield className="w-6 h-6" />, options: [{ text: 'Very Low', value: 0 }, { text: 'Low', value: 1 }, { text: 'Medium', value: 2 }, { text: 'High', value: 3 }] },
  { question: 'What is your primary investment goal?', subtitle: 'Different goals activate different agent strategies', icon: <Target className="w-6 h-6" />, options: [{ text: 'Capital preservation', value: 0 }, { text: 'Steady income', value: 1 }, { text: 'Long-term growth', value: 2 }, { text: 'Aggressive growth', value: 3 }] },
  { question: 'How much capital are you starting with?', subtitle: 'This determines position sizing algorithms', icon: <TrendingUp className="w-6 h-6" />, options: [{ text: '< $10K', value: 0 }, { text: '$10K - $50K', value: 1 }, { text: '$50K - $200K', value: 2 }, { text: '$200K+', value: 3 }] },
  { question: 'What is your investment time horizon?', subtitle: 'Affects agent hold times and strategy selection', icon: <Brain className="w-6 h-6" />, options: [{ text: '< 6 months', value: 0 }, { text: '6 months - 2 years', value: 1 }, { text: '2-10 years', value: 2 }, { text: '10+ years', value: 3 }] },
];

const STRATEGIES: Record<string, { name: string; desc: string; emoji: string }> = {
  conservative: { name: 'Conservative', desc: 'Capital preservation first.', emoji: '🛡️' },
  'all-weather': { name: 'All-Weather', desc: 'Balanced approach.', emoji: '⛅' },
  value: { name: 'Value', desc: 'Deep value investing.', emoji: '🧠' },
  aggressive: { name: 'Aggressive', desc: 'Maximum growth.', emoji: '🚀' },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    setDebugInfo(`PocketBase URL: ${process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://113.30.188.215:8090'}`);
    if (pb.authStore.isValid) {
      router.push('/dashboard');
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleRegister = async () => {
    setError('');
    setDebugInfo('Starting registration...');
    
    if (!agreeTerms) {
      setError('Please accept the Terms');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setDebugInfo('Creating user...');

    try {
      setDebugInfo(`Connecting to: ${pb.baseUrl}`);
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: fullName || email,
        emailVisibility: true
      });
      setDebugInfo('User created, logging in...');
      await pb.collection('users').authWithPassword(email, password);
      setDebugInfo('Login successful!');
      setStep(0);
    } catch (err: any) {
      setDebugInfo(`Error: ${JSON.stringify(err)}`);
      setError(err?.message || err?.response?.data?.message || 'Registration failed. Check console.');
      console.error('Registration error:', err);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
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

  if (checkingAuth) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Zap className="w-12 h-12 text-blue-500 animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === -1 && (
            <motion.div className="glass-panel p-8">
              <div className="text-center mb-8">
                <Zap className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white">StarkTrade AI</h2>
                <p className="text-sm text-white/60 mt-2">Create your account. Get $100K in paper trading balance.</p>
              </div>

              {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}
              
              {debugInfo && <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-mono">{debugInfo}</div>}

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-2 block">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your Name" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-2 block">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-2 block">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" />
                  <span className="text-xs text-white/60">I agree to the Terms of Service, Privacy Policy, and Risk Disclosure.</span>
                </label>
              </div>

              <div className="mt-6 space-y-3">
                <button onClick={handleRegister} disabled={loading || !email || !password || !agreeTerms} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg">{loading ? 'Creating Account...' : 'Create Free Account'}</button>
                <button onClick={handleLogin} disabled={loading || !email || !password} className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg">{loading ? 'Signing In...' : 'Already have an account? Sign In'}</button>
              </div>
            </motion.div>
          )}

          {step >= 0 && step < QUIZ_QUESTIONS.length && (
            <motion.div className="glass-panel p-8">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-2">{QUIZ_QUESTIONS[step].question}</h2>
                <p className="text-sm text-white/60">{QUIZ_QUESTIONS[step].subtitle}</p>
              </div>
              <div className="space-y-3">
                {QUIZ_QUESTIONS[step].options.map((option, i) => (
                  <button key={i} onClick={() => handleAnswer(option.value)} className="w-full text-left px-6 py-4 rounded-xl border border-white/10 bg-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 text-white">{option.text}</button>
                ))}
              </div>
            </motion.div>
          )}

          {step >= QUIZ_QUESTIONS.length && (
            <motion.div className="glass-panel p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Your Autopilot Is Ready</h2>
              <p className="text-white/60 mb-6">Based on your profile: {STRATEGIES[getStrategy()]?.name}</p>
              <button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">Launch Dashboard</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
