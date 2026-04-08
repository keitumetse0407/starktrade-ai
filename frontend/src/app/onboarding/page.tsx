'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { pb } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [page, setPage] = useState<'auth' | 'quiz' | 'done'>('auth');
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const questions = [
    { q: 'Trading experience?', opts: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
    { q: 'Risk tolerance?', opts: ['Very Low', 'Low', 'Medium', 'High'] },
    { q: 'Investment goal?', opts: ['Capital preservation', 'Steady income', 'Long-term growth', 'Aggressive'] },
    { q: 'Starting capital?', opts: ['< $10K', '$10K-$50K', '$50K-$200K', '$200K+'] },
    { q: 'Time horizon?', opts: ['< 6 months', '6mo-2yr', '2-10yr', '10+yr'] },
  ];

  useEffect(() => {
    if (pb.authStore.isValid) {
      router.push('/dashboard');
    }
  }, []);

  const handleRegister = useCallback(async () => {
    setError('');
    if (!agreeTerms) { setError('Please accept terms'); return; }
    if (password.length < 8) { setError('Password needs 8+ characters'); return; }
    setLoading(true);
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password, name: fullName || email, emailVisibility: true });
      await pb.collection('users').authWithPassword(email, password);
      setPage('quiz');
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    setLoading(false);
  }, [email, password, fullName, agreeTerms]);

  const handleLogin = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      router.push('/dashboard');
    } catch (e: any) { setError(e.message || 'Invalid credentials'); }
    setLoading(false);
  }, [email, password]);

  const handleAnswer = useCallback((value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);
    if (quizStep < questions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      setPage('done');
    }
  }, [quizStep, answers]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {page === 'auth' && (
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

        {page === 'quiz' && (
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8">
            <div className="mb-6">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${((quizStep + 1) / questions.length) * 100}%` }} />
              </div>
              <p className="text-sm text-gray-400 mt-2">{quizStep + 1} of {questions.length}</p>
            </div>
            <h2 className="text-xl font-bold text-white mb-6">{questions[quizStep].q}</h2>
            <div className="space-y-3">
              {questions[quizStep].opts.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(i)} className="w-full text-left px-6 py-4 rounded-xl border border-gray-700 bg-gray-800/50 hover:border-blue-500 hover:bg-blue-500/10 text-white transition">{opt}</button>
              ))}
            </div>
          </div>
        )}

        {page === 'done' && (
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">You're Ready!</h2>
            <p className="text-gray-400 mb-6">Your AI trading autopilot is configured.</p>
            <button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg inline-flex items-center gap-2">Launch Dashboard <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
