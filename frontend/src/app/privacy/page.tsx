'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Database, UserCheck, Trash2, Clock } from 'lucide-react';

export default function PrivacyPage() {
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
            <ShieldCheck className="w-8 h-8 text-[var(--profit)]" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-lg">
            Last updated: April 3, 2026
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            StarkTrade AI respects your privacy and is committed to protecting your personal information in compliance with the Protection of Personal Information Act (POPIA), South Africa.
          </p>
        </div>

        <div className="space-y-12">
          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-3">
              <Database className="w-6 h-6 text-[var(--accent)]" />
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>We collect the following personal information when you subscribe to StarkTrade AI:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="glass p-4">
                  <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-1">Identity Data</h4>
                  <p className="text-sm text-[var(--text-muted)]">Full name, email address</p>
                </div>
                <div className="glass p-4">
                  <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-1">Contact Data</h4>
                  <p className="text-sm text-[var(--text-muted)]">Phone number, Telegram handle</p>
                </div>
                <div className="glass p-4">
                  <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-1">Billing Data</h4>
                  <p className="text-sm text-[var(--text-muted)]">Payment reference (processed by PayFast — we do not store card or bank details)</p>
                </div>
                <div className="glass p-4">
                  <h4 className="font-semibold text-[var(--text-primary)] text-sm mb-1">Usage Data</h4>
                  <p className="text-sm text-[var(--text-muted)]">Subscription status, signal delivery confirmation</p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              2. How We Use Your Information
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>Your personal information is used solely for:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Creating and managing your StarkTrade AI subscription</li>
                <li>Delivering trade signals to you via Telegram</li>
                <li>Processing payments through our payment provider (PayFast)</li>
                <li>Sending service-related notifications (billing, service changes, outages)</li>
                <li>Complying with legal obligations under South African law</li>
              </ul>
            </div>
          </section>

          {/* 3. Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              3. Third-Party Services
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>We share your information with the following third parties, each of whom has their own privacy policies:</p>
              <div className="space-y-3 mt-4">
                <div className="glass p-5 border-l-4 border-[var(--accent)]">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">PayFast (Payment Processor)</h4>
                  <p className="text-sm">
                    All payment processing is handled by{' '}
                    <a href="https://www.payfast.co.za" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                      PayFast
                    </a>
                    . We do not store your credit card or bank account details. PayFast&apos;s privacy policy applies to your payment data.
                  </p>
                </div>
                <div className="glass p-5 border-l-4 border-[var(--accent)]">
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">Telegram (Signal Delivery)</h4>
                  <p className="text-sm">
                    Trade signals are delivered via{' '}
                    <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                      Telegram
                    </a>
                    . Your Telegram handle and message interactions are subject to Telegram&apos;s privacy policy.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. POPIA Compliance */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              4. POPIA Compliance
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                StarkTrade AI complies with the <strong className="text-[var(--text-primary)]">Protection of Personal Information Act 4 of 2013 (POPIA)</strong>, South Africa&apos;s data protection legislation. As the &quot;responsible party&quot; under POPIA, we ensure that your personal information is:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Collected lawfully and with your consent</li>
                <li>Used only for the specific purposes described in this policy</li>
                <li>Kept accurate, complete, and up to date</li>
                <li>Protected by reasonable security measures against unauthorised access, loss, or damage</li>
                <li>Not retained longer than necessary for the stated purpose</li>
              </ul>
            </div>
          </section>

          {/* 5. Your Rights */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-[var(--profit)]" />
              5. Your Rights Under POPIA
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>You have the following rights regarding your personal information:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="glass p-5 text-center">
                  <Database className="w-8 h-8 text-[var(--accent)] mx-auto mb-3" />
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">Right of Access</h4>
                  <p className="text-sm text-[var(--text-muted)]">Request a copy of all personal information we hold about you</p>
                </div>
                <div className="glass p-5 text-center">
                  <UserCheck className="w-8 h-8 text-[var(--profit)] mx-auto mb-3" />
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">Right to Correction</h4>
                  <p className="text-sm text-[var(--text-muted)]">Request correction of inaccurate or outdated information</p>
                </div>
                <div className="glass p-5 text-center">
                  <Trash2 className="w-8 h-8 text-[var(--loss)] mx-auto mb-3" />
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">Right to Deletion</h4>
                  <p className="text-sm text-[var(--text-muted)]">Request deletion of your personal information, subject to legal retention obligations</p>
                </div>
              </div>
              <p className="mt-4">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:privacy@starktrade.ai" className="text-[var(--accent)] hover:underline">
                  privacy@starktrade.ai
                </a>
                . We will respond within 30 business days as required by POPIA.
              </p>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-3">
              <Clock className="w-6 h-6 text-[var(--gold)]" />
              6. Data Retention
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>We retain your personal information for the following periods:</p>
              <div className="space-y-3 mt-4">
                <div className="glass p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[var(--text-primary)]">Active subscription data</h4>
                    <span className="badge badge-accent">Duration + 12 months</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Name, email, Telegram handle, and subscription status are retained for the duration of your active subscription plus 12 months after cancellation.
                  </p>
                </div>
                <div className="glass p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[var(--text-primary)]">Billing and payment records</h4>
                    <span className="badge badge-gold">5 years (POPIA & tax law)</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Payment references and billing records are retained for 5 years as required by South African tax legislation and POPIA.
                  </p>
                </div>
                <div className="glass p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[var(--text-primary)]">Deleted account data</h4>
                    <span className="badge badge-loss">30 days to purge</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Upon a valid deletion request, personal data is permanently removed within 30 business days, except where retention is required by law.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 7. Data Security */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              7. Data Security
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                We implement reasonable technical and organisational security measures to protect your personal information, including:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Access controls limiting who can view personal data</li>
                <li>Regular security reviews of our infrastructure</li>
                <li>No storage of sensitive payment data on our servers</li>
              </ul>
              <p>
                While we strive to protect your information, no electronic transmission or storage method is 100% secure. We cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* 8. Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">
              8. Changes to This Policy
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time. Material changes will be communicated to subscribers via email or Telegram. Continued use of the Service after changes constitutes acceptance.
              </p>
            </div>
          </section>

          {/* Contact / Information Officer */}
          <section className="glass p-8 mt-12">
            <h3 className="text-xl font-bold mb-3">Contact / Information Officer</h3>
            <p className="text-[var(--text-secondary)] mb-2">
              Under POPIA, you may contact our Information Officer at:{' '}
              <a href="mailto:privacy@starktrade.ai" className="text-[var(--accent)] hover:underline">
                privacy@starktrade.ai
              </a>
            </p>
            <p className="text-[var(--text-secondary)]">
              You also have the right to lodge a complaint with the{' '}
              <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                Information Regulator (South Africa)
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
          <p>StarkTrade AI is a signal service by ELEV8 DIGITAL (Pty) Ltd.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
