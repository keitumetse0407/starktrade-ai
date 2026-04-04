'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Shield, AlertOctagon, Info, Percent, TrendingDown } from 'lucide-react';

export default function DisclaimerPage() {
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
        {/* Critical Warning Banner */}
        <div className="mb-12 p-6 rounded-2xl border-2 border-[var(--gold)] bg-[var(--gold-bg)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <AlertOctagon className="w-10 h-10 text-[var(--gold)]" />
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                Risk Disclaimer
              </h1>
            </div>
            <p className="text-lg text-[var(--text-primary)] leading-relaxed">
              <strong className="text-[var(--gold)]">READ THIS CAREFULLY BEFORE USING STARKTRADE AI.</strong>
              <br />
              By subscribing to or using our service, you acknowledge and accept all risks described below.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Warning 1: High Risk */}
          <div className="glass p-6 border-l-4 border-[var(--gold)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--gold-bg)] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--gold)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Trading Carries a HIGH LEVEL OF RISK
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Trading forex, cryptocurrencies, commodities, and other financial instruments carries a <strong className="text-[var(--text-primary)]">high level of risk</strong> and may not be suitable for all investors. The leveraged nature of forex and CFD trading can result in losses that exceed your initial deposit. You should carefully consider your financial situation and risk tolerance before trading.
                </p>
              </div>
            </div>
          </div>

          {/* Warning 2: Not FSCA Registered */}
          <div className="glass p-6 border-l-4 border-[var(--loss)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--loss-bg)] flex items-center justify-center">
                <Shield className="w-6 h-6 text-[var(--loss)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  NOT Registered with the FSCA
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  StarkTrade AI is <strong className="text-[var(--loss)]">NOT</strong> registered with the Financial Sector Conduct Authority (FSCA) as a financial advisor or Financial Services Provider (FSP). We are a <strong className="text-[var(--text-primary)]">signal delivery service only</strong>. We do not provide financial advice, manage portfolios, or execute trades on behalf of subscribers.
                </p>
              </div>
            </div>
          </div>

          {/* Warning 3: Educational Purposes Only */}
          <div className="glass p-6 border-l-4 border-[var(--gold)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--gold-bg)] flex items-center justify-center">
                <Info className="w-6 h-6 text-[var(--gold)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  EDUCATIONAL AND INFORMATIONAL PURPOSES ONLY
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  All signals, analysis, commentary, and content provided by StarkTrade AI are for <strong className="text-[var(--text-primary)]">educational and informational purposes only</strong>. They do not constitute financial advice, investment recommendations, or solicitation to buy or sell any financial instrument. You are solely responsible for your own trading decisions.
                </p>
              </div>
            </div>
          </div>

          {/* Warning 4: Past Performance */}
          <div className="glass p-6 border-l-4 border-[var(--accent)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                <TrendingDown className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Past Performance Does NOT Guarantee Future Results
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Any historical performance data, win rates, signal accuracy statistics, or trading results shared by StarkTrade AI are <strong className="text-[var(--text-primary)]">historical only</strong> and do not guarantee, promise, or imply similar future results. Market conditions change constantly, and past success does not predict future outcomes.
                </p>
              </div>
            </div>
          </div>

          {/* Warning 5: Never Risk More Than You Can Afford */}
          <div className="glass p-6 border-l-4 border-[var(--loss)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--loss-bg)] flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 text-[var(--loss)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Never Risk Money You Cannot Afford to Lose
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  You should <strong className="text-[var(--loss)]">never trade with money you cannot afford to lose</strong>. Trading with essential funds — rent, groceries, savings, emergency funds — is reckless and we strongly advise against it. Only trade with disposable capital that would not impact your livelihood if lost entirely.
                </p>
              </div>
            </div>
          </div>

          {/* Warning 6: Risk Per Trade */}
          <div className="glass p-6 border-l-4 border-[var(--gold)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--gold-bg)] flex items-center justify-center">
                <Percent className="w-6 h-6 text-[var(--gold)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  Recommended: Maximum 1-2% Risk Per Trade
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  We recommend risking a <strong className="text-[var(--text-primary)]">maximum of 1-2% of your total trading capital per trade</strong>. This is a widely accepted risk management principle designed to protect your account from catastrophic drawdowns. Exceeding this significantly increases the probability of wiping out your trading account.
                </p>
              </div>
            </div>
          </div>

          {/* Warning 7: No Liability for Losses */}
          <div className="glass p-6 border-l-4 border-[var(--loss)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--loss-bg)] flex items-center justify-center">
                <Shield className="w-6 h-6 text-[var(--loss)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                  No Liability for Trading Losses
                </h2>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  StarkTrade AI, its operators, employees, and affiliates <strong className="text-[var(--text-primary)]">accept no liability</strong> for any trading losses, whether direct, indirect, consequential, or incidental, that may arise from the use of our signals or information. You trade at your own risk and are solely responsible for all outcomes.
                </p>
              </div>
            </div>
          </div>

          {/* Final Acknowledgement */}
          <div className="mt-12 p-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Your Acknowledgement</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
              By subscribing to StarkTrade AI, you confirm that:
            </p>
            <ul className="space-y-3 text-[var(--text-secondary)]">
              <li className="flex items-start gap-3">
                <span className="text-[var(--profit)] mt-1 flex-shrink-0">&#10003;</span>
                <span>You have read and understood this Risk Disclaimer in full</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--profit)] mt-1 flex-shrink-0">&#10003;</span>
                <span>You understand that trading can result in total loss of your capital</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--profit)] mt-1 flex-shrink-0">&#10003;</span>
                <span>You acknowledge that StarkTrade AI is NOT a registered FSP or financial advisor</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--profit)] mt-1 flex-shrink-0">&#10003;</span>
                <span>You accept full responsibility for your own trading decisions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--profit)] mt-1 flex-shrink-0">&#10003;</span>
                <span>You will not hold StarkTrade AI liable for any trading losses</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <p>StarkTrade AI is a signal service by ELEV8 DIGITAL (Pty) Ltd.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
