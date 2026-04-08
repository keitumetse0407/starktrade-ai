'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { pb } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // This effect runs only once on page load
    if (pb.authStore.isValid) {
      router.push('/dashboard');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  const handleAuth = async (action: 'login' | 'signup') => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      if (action === 'signup') {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name: email.split('@')[0]
        });
      }
      await pb.collection('users').authWithPassword(email, password);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.message || 'Failed. Try a different email or password.');
    }
    setLoading(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Zap className="w-12 h-12 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-8">
          <div className="text-center mb-8">
            <Zap className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">StarkTrade AI</h2>
          </div>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{error}</div>}
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ chars)"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <button onClick={() => handleAuth('login')} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg">
              {loading ? '...' : 'Login'}
            </button>
            <button onClick={() => handleAuth('signup')} disabled={loading} className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-600 text-white py-3 rounded-lg">
              {loading ? '...' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
