import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ClientProviders } from '@/components/ClientProviders';
import { ThemeProvider } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'StarkTrade AI — Daily Gold Signals for SA Traders',
  description: 'AI-assisted XAU/USD trade signals delivered daily to Discord. Backtested on 504 days. R299/month. Signal-only — you execute.',
  keywords: ['AI signals', 'gold signals', 'XAUUSD', 'South Africa trading', 'daily signals', 'Discord signals'],
  authors: [{ name: 'StarkTrade AI' }],
  openGraph: {
    title: 'StarkTrade AI — Daily Gold Signals for SA Traders',
    description: 'AI-assisted XAU/USD trade signals delivered daily to Discord. R299/month.',
    type: 'website',
    locale: 'en_US',
    siteName: 'StarkTrade AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StarkTrade AI — Daily Gold Signals for SA Traders',
    description: 'AI-assisted XAU/USD trade signals delivered daily to Discord. R299/month.',
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
          <ClientProviders>
            {children}
          </ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
