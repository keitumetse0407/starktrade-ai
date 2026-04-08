'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
    setLoading(false);
  }

  async function handleSignup() {
    setError('');
    setLoading(true);
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: email.split('@')[0]
      });
      await pb.collection('users').authWithPassword(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ backgroundColor: 'rgba(30,30,30,0.8)', border: '1px solid #333', borderRadius: '1rem', padding: '2rem' }}>
          <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '2rem' }}>StarkTrade AI</h1>
          
          {error && <div style={{ backgroundColor: 'rgba(255,0,0,0.1)', color: '#f87171', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
          
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#111', border: '1px solid #444', borderRadius: '0.5rem', color: 'white', marginBottom: '1rem' }}
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ width: '100%', padding: '0.75rem', backgroundColor: '#111', border: '1px solid #444', borderRadius: '0.5rem', color: 'white', marginBottom: '1rem' }}
          />
          
          <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
            {loading ? '...' : 'Login'}
          </button>
          
          <button onClick={handleSignup} disabled={loading} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '0.5rem' }}>
            {loading ? '...' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
