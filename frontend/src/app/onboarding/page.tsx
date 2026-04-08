'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, EyeOff, Brain, Shield, Target, TrendingUp, ArrowRight } from 'lucide-react';
import { pb } from '@/lib/api';

const QUIZ_QUESTIONS = [
  { question: 'Trading experience?', options: [{ text: 'Beginner', value: 0 }, { text: 'Intermediate', value: 1 }, { text: 'Advanced', value: 2 }, { text: 'Expert', value: 3 }] },
  { question: 'Risk tolerance?', options: [{ text: 'Very Low', value: 0 }, { text: 'Low', value: 1 }, { text: 'Medium', value: 2 }, { text: 'High', value: 3 }] },
  { question: 'Investment goal?', options: [{ text: 'Capital preservation', value: 0 }, { text: 'Steady income', value: 1 }, { text: 'Long-term growth', value: 2 }, { text: 'Aggressive growth', value: 3 }] },
  { question: 'Starting capital?', options: [{ text: '< $10K', value: 0 }, { text: '$10K - $50K', value: 1 }, { text: '$50K - $200K', value: 2 }, { text: '$200K+', value: 3 }] },
  { question: 'Time horizon?', options: [{ text: '< 6 months', value: 0 }, { text: '6 months - 2 years', value: 1 }, { text: '2-10 years', value: 2 }, { text: '10+ years', value: 3 }] },
];

const STRATEGIES = ['Conservative', 'All-Weather', 'Value', 'Aggressive'];

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
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (pb.authStore.isValid) {
        router.push('/dashboard');
      } else {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleRegister = async () => {
    setError('');
    if (!agreeTerms) { setError('Accept terms'); return; }
    if (password.length < 8) { setError('Password needs 8+ chars'); return; }
    setLoading(true);
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password, name: fullName || email, emailVisibility: true });
      await pb.collection('users').authWithPassword(email, password);
      setStep(0);
    } catch (e: any) { setError(e.message || 'Failed'); }
    setLoading(false);
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      router.push('/dashboard');
    } catch (e: any) { setError(e.message || 'Invalid credentials'); }
    setLoading(false);
  };

  const handleAnswer = (value: number) => {
    setAnswers([...answers, value]);
    if (step < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 100);
    } else {
      setTimeout(() => setStep(QUIZ_QUESTIONS.length), 100);
    }
  };

  if (isChecking) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Zap className="w-12 h-12 text-blue-500 animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {step === -1 && (
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8">
            <div className="text-center mb-8">
              <Zap className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">StarkTrade AI</h2>
              <p className="text-sm text-gray-400 mt-2">Create account. Get $100K paper trading.</p>
            </div>
            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white" />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1" />
                <span className="text-xs text-gray-400">I agree to Terms, Privacy Policy, and Risk Disclosure</span>
              </label>
            </div>
            <div className="mt-6 space-y-3">
              <button onClick={handleRegister} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg">{loading ? 'Creating...' : 'Create Free Account'}</button>
              <button onClick={handleLogin} disabled={loading} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg">{loading ? 'Signing In...' : 'Already have an account? Sign In'}</button>
            </div>
          </div>
        )}

        {step >= 0 && step < QUIZ_QUESTIONS.length && (
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-2">{QUIZ_QUESTIONS[step].question}</h2>
            <div className="space-y-3 mt-6">
              {QUIZ_QUESTIONS[step].options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt.value)} className="w-full text-left px-6 py-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-500/10 text-white transition">{opt.text}</button>
              ))}
            </div>
          </div>
        )}

        {step >= QUIZ_QUESTIONS.length && (
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">You're Ready!</h2>
            <p className="text-gray-400 mb-6">Strategy: {STRATEGIES[Math.min(Math.floor(answers.reduce((a,b)=>a+b,0)/answers.length), 3)]}</p>
            <button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg inline-flex items-center gap-2">Launch Dashboard <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
