'use client';

import { useEffect, useRef } from 'react';

interface AdSenseAdProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  className?: string;
}

export function AdSenseAd({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}: AdSenseAdProps) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Only push ad if AdSense is loaded
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // Don't render in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={`bg-navy/50 border border-white/5 rounded-lg flex items-center justify-center p-8 ${className}`}>
        <p className="text-xs text-muted">AdSense Ad ({format})</p>
      </div>
    );
  }

  return (
    <div ref={adRef} className={className}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          textAlign: 'center',
        }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

// Banner ad for landing page
export function AdBanner({ slot, className = '' }: { slot: string; className?: string }) {
  return (
    <AdSenseAd
      slot={slot}
      format="horizontal"
      responsive={true}
      className={className}
    />
  );
}

// Sidebar ad for dashboard
export function AdSidebar({ slot, className = '' }: { slot: string; className?: string }) {
  return (
    <AdSenseAd
      slot={slot}
      format="vertical"
      responsive={true}
      className={className}
    />
  );
}

// In-content ad
export function AdInContent({ slot, className = '' }: { slot: string; className?: string }) {
  return (
    <AdSenseAd
      slot={slot}
      format="rectangle"
      responsive={true}
      className={className}
    />
  );
}
