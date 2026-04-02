'use client';

import { useEffect, useState } from 'react';

interface AdSenseConfig {
  adsense_client_id: string;
  adsense_slot_landing: string;
  adsense_slot_dashboard: string;
  adsense_slot_predictions: string;
}

/**
 * Google AdSense ad unit component.
 * Only renders for free-tier users when AdSense is configured.
 * Pro/Enterprise users and admins see nothing.
 */
export function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}: {
  slot: string;
  format?: string;
  responsive?: boolean;
  className?: string;
}) {
  const [config, setConfig] = useState<AdSenseConfig | null>(null);
  const [userRole, setUserRole] = useState<string>('free');

  useEffect(() => {
    // Load AdSense config from public endpoint
    fetch('/api/v1/admin/public/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});

    // Check user role from stored token
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setUserRole(data.role || 'free'))
        .catch(() => {});
    }
  }, []);

  // Don't show ads to pro/enterprise/admin users
  if (userRole !== 'free') return null;

  // Don't show if AdSense isn't configured
  if (!config?.adsense_client_id || !slot) return null;

  useEffect(() => {
    // Load AdSense script once
    if (!document.querySelector('script[src*="adsbygoogle"]') && config?.adsense_client_id) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adsense_client_id}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Push ad
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch {}
  }, [config]);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: responsive ? 'block' : 'inline-block', width: '100%' }}
        data-ad-client={config.adsense_client_id}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
      <p className="text-xs text-muted text-center mt-1">Advertisement</p>
    </div>
  );
}
