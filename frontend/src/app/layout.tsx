import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'StarkTrade AI — Autonomous Trading. Institutional Results.',
  description: '7 specialized AI agents trade for you 24/7 with institutional-grade risk management. Start with $100K paper trading. No credit card required.',
  keywords: ['AI trading', 'autonomous trading', 'algorithmic trading', 'AI agents', 'quantitative trading', 'fintech'],
  authors: [{ name: 'StarkTrade AI' }],
  openGraph: {
    title: 'StarkTrade AI — Autonomous Trading. Institutional Results.',
    description: '7 specialized AI agents trade for you 24/7 with institutional-grade risk management.',
    type: 'website',
    locale: 'en_US',
    siteName: 'StarkTrade AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StarkTrade AI — Autonomous Trading. Institutional Results.',
    description: '7 specialized AI agents trade for you 24/7 with institutional-grade risk management.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
        {/* Google AdSense - MUST be a regular script tag for verification */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3282825134840555"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen gradient-bg antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
