'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, Shield, Brain, TrendingUp, Zap, BarChart3, Bot,
  ChevronDown, Star, Check, Clock, Lock, Globe, Sparkles,
  Users, DollarSign, Target, Activity, Award, Play, Eye,
  Binary, Layers, Network, Cpu, MessageCircle, Bell
} from 'lucide-react';
import { CountdownTimer, InlineCountdown } from '@/components/CountdownTimer';

// ============================================================
// ANIMATED COUNTER COMPONENT
// ============================================================
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2 }: {
  value: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView && ref.current) {
      const controls = animate(0, value, {
        duration,
        ease: 'easeOut',
        onUpdate(v) {
          if (ref.current) {
            ref.current.textContent = `${prefix}${v.toLocaleString(undefined, {
              maximumFractionDigits: value < 100 ? 1 : 0,
            })}${suffix}`;
          }
        },
      });
      return () => controls.stop();
    }
  }, [inView, value, prefix, suffix, duration]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'glass-dark border-b border-white/5' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <Zap className="w-8 h-8 text-electric group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 w-8 h-8 bg-electric/20 rounded-full blur-lg" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">
              Stark<span className="text-electric">Trade</span> AI
            </span>
            <span className="hidden sm:block text-[10px] text-muted -mt-1">by ELEV8 DIGITAL</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted hover:text-white transition-colors">How It Works</a>
          <a href="#performance" className="text-sm text-muted hover:text-white transition-colors">Backtest</a>
          <a href="#pricing" className="text-sm text-muted hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-muted hover:text-white transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:block text-sm text-muted hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/onboarding"
            className="hidden sm:inline-flex px-5 py-2.5 bg-electric text-navy font-semibold text-sm rounded-lg
                       hover:bg-electric/90 transition-all shadow-glow-electric hover:shadow-lg"
          >
            Get Started
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/5 transition-all"
            aria-label="Toggle menu"
          >
            <div className={`flex flex-col gap-1.5 transition-all ${mobileMenuOpen ? 'hamburger-active' : ''}`}>
              <span className={`hamburger-line transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`hamburger-line transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`hamburger-line transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden absolute top-full left-0 right-0 glass-dark border-t border-white/5 z-50 p-4 space-y-3"
            >
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-sm text-muted hover:text-white transition-colors rounded-xl hover:bg-white/5"
              >
                How It Works
              </a>
              <a
                href="#performance"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-sm text-muted hover:text-white transition-colors rounded-xl hover:bg-white/5"
              >
                Backtest
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-sm text-muted hover:text-white transition-colors rounded-xl hover:bg-white/5"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-3 px-4 text-sm text-muted hover:text-white transition-colors rounded-xl hover:bg-white/5"
              >
                FAQ
              </a>
              <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-4 text-sm text-center text-muted hover:text-white transition-colors rounded-xl hover:bg-white/5"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 px-4 bg-electric text-navy font-semibold text-sm rounded-xl text-center hover:bg-electric/90 transition-all"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ============================================================
// HERO SECTION
// ============================================================
function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-6 hero-glow overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-electric/30 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Signal-only badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-profit/10 border border-profit/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
            <span className="text-sm text-profit font-medium">
              Signal-only — Autopilot coming later
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1]">
            AI-assisted trade signals
            <br />
            <span className="text-gradient-accent">for SA traders.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted max-w-3xl mx-auto mb-10 leading-relaxed">
            Daily gold setups with clear entries, stops, targets, and risk notes.
            Backtested on 504 days of real data.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/onboarding"
              className="group px-8 py-4 bg-electric text-navy font-bold text-lg rounded-xl
                         hover:bg-electric/90 transition-all shadow-glow-electric
                         hover:shadow-xl flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              Get Daily Signals
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#performance"
              className="px-8 py-4 glass glass-hover text-white font-semibold text-lg rounded-xl
                         flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <BarChart3 className="w-5 h-5" />
              View Backtest
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-profit" /> R299/month
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-profit" /> Signals via Telegram
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-profit" /> Cancel anytime
            </span>
          </div>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 rounded-2xl glass-card p-1 max-w-6xl mx-auto"
        >
          <div className="rounded-xl bg-navy-100/50 p-6 md:p-8">
            {/* Stats Row - Real Backtest Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Win Rate" value="75%" change="12W / 4L" positive icon={<Target className="w-4 h-4" />} />
              <StatCard label="Return" value="+14.0%" change="vs +13.1% B&H" positive icon={<TrendingUp className="w-4 h-4" />} />
              <StatCard label="Max Drawdown" value="8.7%" change="Controlled" positive={false} icon={<Shield className="w-4 h-4" />} />
              <StatCard label="Sharpe Ratio" value="1.69" change="Strong" positive icon={<BarChart3 className="w-4 h-4" />} />
            </div>
            {/* Chart placeholder */}
            <div className="h-48 md:h-64 rounded-xl bg-navy/50 flex items-center justify-center border border-white/5">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-electric/30 mx-auto mb-2" />
                <p className="text-sm text-muted">504-Day Backtest — XAU/USD Gold Signals</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatCard({ label, value, change, positive, icon }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="glass p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted">{icon}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-lg md:text-xl font-bold font-mono counter-value">{value}</p>
      <p className={`text-xs font-mono ${positive ? 'text-profit' : 'text-muted'}`}>{change}</p>
    </div>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================
function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Pay R299/mo',
      desc: 'Simple monthly subscription. No hidden fees. Cancel anytime from your dashboard.',
      icon: <DollarSign className="w-6 h-6" />,
    },
    {
      step: '02',
      title: 'Join Telegram',
      desc: 'Get added to our private Telegram channel where all signals are delivered.',
      icon: <MessageCircle className="w-6 h-6" />,
    },
    {
      step: '03',
      title: 'Receive daily signals at 07:00 SAST',
      desc: 'Every trading day, get XAU/USD setups with clear entries, stops, targets, and risk notes.',
      icon: <Bell className="w-6 h-6" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-electric mb-4">HOW IT WORKS</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Three Steps to{' '}
            <span className="text-gradient-accent">Daily Signals</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            No complex setup. No bots to configure. Just pay, join, and receive.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {i < 2 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-electric/30 to-transparent" />
              )}
              <div className="glass-card p-6 text-center relative z-10">
                <div className="text-5xl font-bold text-electric/10 mb-4">{step.step}</div>
                <div className="w-12 h-12 rounded-xl bg-electric/10 text-electric flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PERFORMANCE / BACKTEST RESULTS
// ============================================================
function PerformanceSection() {
  return (
    <section id="performance" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-gold mb-4">BACKTEST RESULTS</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Real Numbers from{' '}
            <span className="text-gradient-gold">504 Days of Data</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Walk-forward tested on XAU/USD. Not live results — this is what the strategy would have done.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <BacktestCard
            metric="75%"
            label="Win Rate"
            detail="12W / 4L"
            icon={<Target className="w-5 h-5" />}
            highlight
          />
          <BacktestCard
            metric="+14.0%"
            label="Return"
            detail="vs +13.1% B&H"
            icon={<TrendingUp className="w-5 h-5" />}
            highlight
          />
          <BacktestCard
            metric="8.7%"
            label="Max Drawdown"
            detail="Controlled"
            icon={<Shield className="w-5 h-5" />}
          />
          <BacktestCard
            metric="1.69"
            label="Sharpe Ratio"
            detail="Risk-adjusted"
            icon={<BarChart3 className="w-5 h-5" />}
            highlight
          />
          <BacktestCard
            metric="2.01"
            label="Profit Factor"
            detail="Gross profit / loss"
            icon={<Award className="w-5 h-5" />}
            highlight
          />
          <BacktestCard
            metric="504"
            label="Days Tested"
            detail="Walk-forward"
            icon={<Clock className="w-5 h-5" />}
          />
        </div>

        {/* Disclaimer */}
        <div className="glass border-loss/20 p-6 text-center max-w-3xl mx-auto">
          <Shield className="w-5 h-5 text-loss mx-auto mb-2" />
          <p className="text-sm text-muted leading-relaxed">
            <strong className="text-white">These are BACKTESTED results.</strong> Past performance does not guarantee future results. Trading carries risk.
          </p>
        </div>
      </div>
    </section>
  );
}

function BacktestCard({ metric, label, detail, icon, highlight }: {
  metric: string; label: string; detail: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6 text-center"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
        highlight ? 'bg-electric/10 text-electric' : 'bg-white/5 text-muted'
      }`}>
        {icon}
      </div>
      <p className={`text-3xl md:text-4xl font-bold font-mono mb-1 ${
        highlight ? 'text-gradient-accent' : ''
      }`}>
        {metric}
      </p>
      <p className="text-sm font-semibold mb-0.5">{label}</p>
      <p className="text-xs text-muted">{detail}</p>
    </motion.div>
  );
}

// ============================================================
// PRICING
// ============================================================
function PricingPreview() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-electric mb-4">PRICING</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple{' '}
            <span className="text-gradient-accent">R299/month</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            One plan. Daily XAU/USD signals delivered to Telegram. Cancel anytime.
          </p>
        </motion.div>

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 border-electric/30 shadow-glow-electric relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-electric text-navy text-xs font-bold rounded-full">
              SIGNAL-ONLY
            </div>
            <h3 className="text-xl font-bold mb-2">Daily Gold Signals</h3>
            <div className="mb-2">
              <span className="text-4xl font-bold">R299</span>
              <span className="text-muted text-sm">/month</span>
            </div>
            <p className="text-sm text-muted mb-6">XAU/USD setups delivered daily at 07:00 SAST</p>
            <ul className="space-y-3 mb-8">
              {[
                'Daily XAU/USD signal',
                'Clear entry, stop, target',
                'Risk notes with each signal',
                'Telegram delivery',
                'Walk-forward tested strategy',
                'Cancel anytime',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-profit flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="block text-center btn-primary w-full"
            >
              Get Started
            </Link>
            <p className="text-xs text-muted text-center mt-4">
              These are BACKTESTED results. Past performance does not guarantee future results. Trading carries risk.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FAQ
// ============================================================
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What signals do I receive?',
      a: 'Daily XAU/USD (gold) trade setups with clear entry price, stop loss, take profit targets, and risk notes. Delivered every trading day at 07:00 SAST via Telegram.',
    },
    {
      q: 'Is this live trading or backtested?',
      a: 'The performance numbers shown are from walk-forward backtesting on 504 days of historical data. These are not live trading results. Past performance does not guarantee future results.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. No contracts, no commitments. Cancel your subscription anytime from your dashboard.',
    },
    {
      q: 'Do I need to execute trades manually?',
      a: 'Yes. This is a signal-only service — you receive the setups and execute them on your own broker account. Autopilot (automated execution) is planned for a future release.',
    },
    {
      q: 'How do I pay?',
      a: 'R299/month via EFT or card. We support local South African payment methods for your convenience.',
    },
    {
      q: 'Is this financial advice?',
      a: 'No. StarkTrade AI provides informational trade signals only. We are not a registered financial advisor. Trading carries risk — you could lose money. Always do your own research.',
    },
  ];

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted flex-shrink-0 transition-transform ${
                  open === i ? 'rotate-180' : ''
                }`} />
              </button>
              {open === i && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FINAL CTA
// ============================================================
function FinalCTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-12 md:p-16 relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-electric/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <Sparkles className="w-12 h-12 text-electric mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Start Receiving Gold Signals Today
            </h2>
            <p className="text-lg text-muted mb-8 max-w-xl mx-auto">
              R299/month. Daily XAU/USD setups at 07:00 SAST. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/onboarding"
                className="px-10 py-4 bg-electric text-navy font-bold text-lg rounded-xl
                           hover:bg-electric/90 transition-all shadow-glow-electric
                           hover:shadow-xl flex items-center gap-3"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-xs text-muted mt-6">
              Signal-only service. Autopilot coming later.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-electric" />
              <span className="font-bold">StarkTrade AI</span>
            </div>
            <p className="text-sm text-muted">
              AI-assisted gold trade signals for South African traders.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#performance" className="hover:text-white transition-colors">Backtest</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Risk Disclosure</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted text-center md:text-left">
            These are BACKTESTED results. Past performance does not guarantee future results. Trading carries risk.
            StarkTrade AI provides informational signals only, not financial advice.
          </p>
          <div className="text-xs text-muted text-center md:text-right">
            <p>&copy; 2026 <span className="text-electric font-medium">ELEV8 DIGITAL</span>. All rights reserved.</p>
            <p className="mt-1">Dennilton, Limpopo, South Africa</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-mesh grid-bg">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <PerformanceSection />
      <PricingPreview />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
