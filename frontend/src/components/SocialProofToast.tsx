'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Fake social proof events — replace with real data from API
const EVENTS = [
  { name: 'Marcus', location: 'Johannesburg', action: 'just signed up' },
  { name: 'Sarah', location: 'Cape Town', action: 'upgraded to Pro' },
  { name: 'David', location: 'Nairobi', action: 'started live trading' },
  { name: 'Thabo', location: 'Pretoria', action: 'made +2.3% profit' },
  { name: 'Priya', location: 'Mumbai', action: 'joined the waitlist' },
  { name: 'Johan', location: 'Dubai', action: 'referred a friend' },
  { name: 'Aisha', location: 'Lagos', action: 'unlocked all 7 agents' },
  { name: 'Mike', location: 'London', action: 'completed risk quiz' },
];

export function SocialProofToast() {
  useEffect(() => {
    // Show first notification after 8 seconds
    const initialTimeout = setTimeout(() => {
      showRandomEvent();
    }, 8000);

    // Then every 20-40 seconds
    const interval = setInterval(() => {
      showRandomEvent();
    }, 20000 + Math.random() * 20000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  function showRandomEvent() {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const timeAgo = Math.floor(Math.random() * 10) + 1;

    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-electric/20 flex items-center justify-center text-electric text-xs font-bold">
            {event.name[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {event.name} from {event.location}
            </p>
            <p className="text-xs text-muted">
              {event.action} · {timeAgo}m ago
            </p>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: 'bottom-left',
        style: {
          background: 'rgba(10, 14, 39, 0.95)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '12px',
          color: '#E6F1FF',
        },
      }
    );
  }

  return null;
}
