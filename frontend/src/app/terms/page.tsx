'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-white/5 glass-dark">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-lg">
            Last updated: April 3, 2026
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            Please read these terms carefully before using StarkTrade AI.
          </p>
        </div>

        <div className="space-y-12">
          {/* 1. Service Description */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              1. Service Description
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                StarkTrade AI (&quot;the Service&quot;) is a <strong className="text-[var(--text-primary)]">daily trade signal delivery service</strong> operated via Telegram. We provide analysis, insights, and trade signal notifications to subscribers. We do <strong className="text-[var(--loss)]">NOT</strong> provide automated trading, account management, or trade execution on your behalf.
              </p>
              <p>
                All signals are delivered as Telegram messages. You are solely responsible for executing any trades on your own broker account.
              </p>
            </div>
          </section>

          {/* 2. No Guaranteed Returns */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              2. No Guaranteed Returns
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <div className="glass p-5 border-l-4 border-[var(--loss)] bg-[var(--loss-bg)]">
                <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[var(--loss)]" />
                  Important Disclaimer
                </p>
                <p className="mt-2">
                  StarkTrade AI makes <strong className="text-[var(--text-primary)]">no guarantees whatsoever</strong> regarding profitability, win rate, or financial returns. Trading involves substantial risk of loss. Past signal performance does not indicate future results.
                </p>
              </div>
              <p>
                Any performance statistics, win rates, or historical results shared by StarkTrade AI are provided for informational purposes only and should not be interpreted as promises or guarantees of future performance.
              </p>
            </div>
          </section>

          {/* 3. User Responsibility */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              3. User Responsibility
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                You acknowledge and agree that:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>All trades are executed on <strong className="text-[var(--text-primary)]">your own broker account</strong> at your own discretion and risk</li>
                <li>You are solely responsible for your trading decisions, position sizing, and risk management</li>
                <li>StarkTrade AI does not have access to, control over, or liability for your trading account</li>
                <li>You should only trade with funds you can afford to lose</li>
              </ul>
            </div>
          </section>

          {/* 4. Subscription & Billing */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              4. Subscription & Billing
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                The Service is offered at <strong className="text-[var(--text-primary)]">R299 per month</strong> (South African Rand), billed on a recurring monthly basis via PayFast or other approved payment processors.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Cancellation:</strong> You may cancel your subscription at any time before your next billing cycle. Cancellation takes effect at the end of your current billing period. No partial-month refunds are provided for mid-cycle cancellations.
              </p>
            </div>
          </section>

          {/* 5. Refund Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              5. Refund Policy
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                Refunds are considered at our <strong className="text-[var(--text-primary)]">sole discretion</strong> under the following condition:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>If <strong className="text-[var(--text-primary)]">zero signals</strong> were delivered during a billing period, you may request a refund within <strong className="text-[var(--text-primary)]">48 hours</strong> of the billing date</li>
              </ul>
              <p>
                All other refund requests will be evaluated on a case-by-case basis. Refund approval is not guaranteed.
              </p>
            </div>
          </section>

          {/* 6. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              6. Limitation of Liability
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <div className="glass p-5 border-l-4 border-[var(--gold)] bg-[var(--gold-bg)]">
                <p>
                  To the maximum extent permitted by law, StarkTrade AI, its operators, employees, and affiliates shall <strong className="text-[var(--text-primary)]">not be liable</strong> for any direct, indirect, incidental, consequential, or special damages arising from:
                </p>
                <ul className="space-y-1 list-disc list-inside mt-3">
                  <li>Trading losses incurred by following or not following signals</li>
                  <li>Delays, errors, or interruptions in signal delivery</li>
                  <li>Broker-related losses, slippage, or execution issues</li>
                  <li>Any decisions made based on information provided by the Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Governing Law */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              7. Governing Law
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                These Terms are governed by and construed in accordance with the <strong className="text-[var(--text-primary)]">laws of the Republic of South Africa</strong>. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the South African courts.
              </p>
            </div>
          </section>

          {/* 8. Not Financial Advice */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              8. Not Financial Advice
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                StarkTrade AI is <strong className="text-[var(--loss)]">NOT</strong> a registered Financial Services Provider (FSP) and is <strong className="text-[var(--loss)]">NOT</strong> registered with the Financial Sector Conduct Authority (FSCA). Nothing contained in the Service constitutes financial advice, investment advice, or a recommendation to buy or sell any financial instrument.
              </p>
            </div>
          </section>

          {/* 9. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              9. Changes to These Terms
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="glass p-8 mt-12">
            <h3 className="text-xl font-bold mb-3">Contact</h3>
            <p className="text-[var(--text-secondary)]">
              For questions about these Terms, contact us at{' '}
              <a href="mailto:support@starktrade.ai" className="text-[var(--accent)] hover:underline">
                support@starktrade.ai
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <p>StarkTrade AI is a signal service by ELEV8 DIGITAL (Pty) Ltd.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
