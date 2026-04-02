'use client';

import { Toaster } from 'react-hot-toast';
import { SocialProofToast } from '@/components/SocialProofToast';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster
        toastOptions={{
          style: {
            background: 'rgba(10, 14, 39, 0.95)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderRadius: '12px',
            color: '#E6F1FF',
          },
        }}
      />
      {children}
      <SocialProofToast />
      <ExitIntentPopup />
    </>
  );
}
