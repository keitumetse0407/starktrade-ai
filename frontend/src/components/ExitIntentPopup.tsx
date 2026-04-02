'use client';

import { useState, useEffect } from 'react';
import { X, Zap, ArrowRight } from 'lucide-react';

export function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('exit_popup_shown');
      if (shown) {
        setHasShown(true);
        return;
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (hasShown) return;
      // Only trigger when mouse goes to top of page
      if (e.clientY < 10) {
        setShow(true);
        setHasShown(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('exit_popup_shown', 'true');
        }
      }
    };

    // Also trigger after 45 seconds if they haven't signed up
    const timeout = setTimeout(() => {
      if (!hasShown && !submitted) {
        setShow(true);
        setHasShown(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('exit_popup_shown', 'true');
        }
      }
    }, 45000);

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timeout);
    };
  }, [hasShown, submitted]);

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return;
    
    // Save email (in production, send to your backend/email service)
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit_intent' }),
      }).catch(() => {}); // Silent fail
      
      setSubmitted(true);
      setTimeout(() => setShow(false), 3000);
    } catch {
      setSubmitted(true);
      setTimeout(() => setShow(false), 3000);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setShow(false)}
      />
      
      {/* Modal */}
      <div className="relative glass-card p-8 max-w-md w-full animate-fade-up">
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-electric" />
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-2">
              Wait! Don't Miss Out
            </h2>
            
            <p className="text-muted text-center mb-6">
              Get <span className="text-electric font-semibold">7 days free Pro</span> when you sign up now.
              No credit card required.
            </p>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="input-stark text-center"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              
              <button
                onClick={handleSubmit}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Claim Free Trial <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted text-center mt-4">
              Join 2,847+ traders using AI autopilot
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2">You're In!</h2>
            <p className="text-muted">
              Check your email for your 7-day free Pro trial link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
