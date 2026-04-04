'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, Zap, TrendingUp, Shield, BarChart3, Bell, Check,
  ChevronDown, Target, Clock, Activity, Award, DollarSign,
  MessageCircle, Play
} from 'lucide-react';

// ============================================================
// PARTICLES (Antigravity — floating dust in the void)
// ============================================================
function Particles() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.05,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -80, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// AMBIENT LIGHT ORBS
// ============================================================
function AmbientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="ambient-orb w-[600px] h-[600px] bg-blue-600/10 -top-48 -left-48 animate-pulse-glow" />
      <div className="ambient-orb w-[500px] h-[500px] bg-emerald-600/8 top-1/3 right-0 animate-pulse-glow" style={{ animationDelay: '-2s' }} />
      <div className="ambient-orb w-[400px] h-[400px] bg-amber-600/5 bottom-20 left-1/4 animate-pulse-glow" style={{ animationDelay: '-4s' }} />
    </div>
  );
}

// ============================================================
// NAVBAR (Antigravity — invisible until scroll)
// ============================================================
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/[0.04]'
          : ''
      }`}
      style={{
        background: scrolled ? 'rgba(0,0,0,0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(40px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(40px)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Zap className="w-7 h-7 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 w-7 h-7 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Stark<span className="text-blue-500">Trade</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          <a href="#how" className="text-sm text-white/50 hover:text-white transition-colors duration-300">How it works</a>
          <a href="#performance" className="text-sm text-white/50 hover:text-white transition-colors duration-300">Backtest</a>
          <a href="#pricing" className="text-sm text-white/50 hover:text-white transition-colors duration-300">Pricing</a>
          <a href="#faq" className="text-sm text-white/50 hover:text-white transition-colors duration-300">FAQ</a>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:-translate-y-0.5"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-white/50 hover:text-white transition-colors"
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.04] bg-black/90 backdrop-blur-xl"
          >
            <div className="px-6 py-4 space-y-3">
              <a href="#how" onClick={() => setMobileOpen(false)} className="block py-2 text-white/50 hover:text-white">How it works</a>
              <a href="#performance" onClick={() => setMobileOpen(false)} className="block py-2 text-white/50 hover:text-white">Backtest</a>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="block py-2 text-white/50 hover:text-white">Pricing</a>
              <a href="#faq" onClick={() => setMobileOpen(false)} className="block py-2 text-white/50 hover:text-white">FAQ</a>
              <div className="pt-3 border-t border-white/[0.04] space-y-2">
                <Link href="/dashboard" className="block py-2 text-center text-white/50 hover:text-white" onClick={() => setMobileOpen(false)}>Sign in</Link>
                <Link href="/onboarding" className="block py-2.5 bg-blue-600 text-white text-center text-sm font-medium rounded-xl" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ============================================================
// HERO (Antigravity — massive type, floating stats, void)
// ============================================================
function Hero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, 80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <Particles />
      <AmbientOrbs />
      <div className="absolute inset-0 hero-grid" />

      <motion.div
        style={{ y: y2, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-6 text-center"
      >
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.04] mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium tracking-wide uppercase">Generating signals daily</span>
        </motion.div>

        {/* Headline — massive */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          AI trade signals
          <br />
          <span className="text-gradient-blue">for SA traders.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Daily XAU/USD setups with entries, stops, targets, and risk notes.
          Backtested on 504 days. Signal-only — you execute.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href="/onboarding"
            className="group flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(59,130,246,0.2)] hover:shadow-[0_0_60px_rgba(59,130,246,0.3)] hover:-translate-y-0.5"
          >
            Start receiving signals
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <a
            href="#performance"
            className="flex items-center gap-2 px-8 py-4 border border-white/[0.08] hover:border-white/[0.15] text-white font-medium rounded-2xl transition-all duration-300 hover:bg-white/[0.02]"
          >
            <BarChart3 className="w-5 h-5" />
            View backtest
          </a>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40"
        >
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> R299/month</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Discord delivery</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cancel anytime</span>
        </motion.div>
      </motion.div>

      {/* Floating stat cards (parallax) */}
      <motion.div style={{ y: y1 }} className="absolute inset-0 pointer-events-none z-[5]">
        <div className="max-w-7xl mx-auto h-full relative">
          {/* Left card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="absolute left-4 md:left-12 top-[30%] glass-panel p-4 animate-float-slow hidden sm:block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold stat-mono">75%</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Win rate</p>
              </div>
            </div>
          </motion.div>

          {/* Right card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="absolute right-4 md:right-12 top-[40%] glass-panel p-4 animate-float-slow-delay hidden sm:block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold stat-mono">+14.0%</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Return</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5"
        >
          <motion.div className="w-1 h-1.5 rounded-full bg-white/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS (Antigravity — clean, numbered, connected)
// ============================================================
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const steps = [
    { num: '01', title: 'Subscribe', desc: 'R299/month. Card or EFT. Takes 30 seconds.', icon: <DollarSign className="w-5 h-5" /> },
    { num: '02', title: 'Join Discord', desc: 'Get added to the private signals channel.', icon: <MessageCircle className="w-5 h-5" /> },
    { num: '03', title: 'Receive daily setups', desc: 'Every trading day at 07:00 SAST. Entry, SL, TP, risk notes.', icon: <Bell className="w-5 h-5" /> },
  ];

  return (
    <section id="how" className="py-32 px-6 relative" ref={ref}>
      <div className="section-divider mb-16" />

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Three steps. <span className="text-gradient-blue">Zero friction.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-center"
            >
              {/* Number circle */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-blue-500/5 border border-white/[0.06]" />
                <div className="relative">
                  <p className="text-3xl font-bold stat-mono text-blue-500/60">{step.num}</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PERFORMANCE (Antigravity — stat grid, minimal)
// ============================================================
function Performance() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const stats = [
    { value: '75%', label: 'Win Rate', detail: '12W / 4L', icon: <Target className="w-4 h-4" />, color: 'text-emerald-500' },
    { value: '+14.0%', label: 'Return', detail: 'vs +13.1% B&H', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-500' },
    { value: '8.7%', label: 'Max Drawdown', detail: 'Controlled', icon: <Shield className="w-4 h-4" />, color: 'text-amber-500' },
    { value: '1.69', label: 'Sharpe Ratio', detail: 'Risk-adjusted', icon: <Activity className="w-4 h-4" />, color: 'text-emerald-500' },
    { value: '2.01', label: 'Profit Factor', detail: 'Gross P&L / Gross Loss', icon: <Award className="w-4 h-4" />, color: 'text-blue-500' },
    { value: '504', label: 'Days Tested', detail: 'Walk-forward', icon: <Clock className="w-4 h-4" />, color: 'text-white/40' },
  ];

  return (
    <section id="performance" className="py-32 px-6 relative" ref={ref}>
      <div className="section-divider mb-16" />

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">Backtest results</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            504 days. <span className="text-gradient-green">Real data.</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            Walk-forward tested on XAU/USD. Not live results — this is what the strategy would have done.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-panel p-5 text-center"
            >
              <div className={`flex items-center justify-center gap-1.5 mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-2xl md:text-3xl font-bold stat-mono mb-1">{stat.value}</p>
              <p className="text-xs font-medium text-white/60 mb-0.5">{stat.label}</p>
              <p className="text-[10px] text-white/30">{stat.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="border border-white/[0.04] rounded-2xl p-6 text-center max-w-2xl mx-auto"
        >
          <p className="text-sm text-white/40">
            <span className="text-white/60 font-medium">Backtested results.</span> Past performance does not guarantee future results. Trading carries risk of loss.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// PRICING (Antigravity — single card, clean, void)
// ============================================================
function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="py-32 px-6 relative" ref={ref}>
      <div className="section-divider mb-16" />

      <div className="max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Simple. <span className="text-gradient-blue">R299/month.</span>
          </h2>
          <p className="text-white/40">
            One plan. Daily signals. Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass-panel p-8 md:p-10 text-left relative overflow-hidden"
        >
          {/* Glow accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Daily Gold Signals</h3>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-xs font-semibold rounded-full uppercase tracking-wide">
                Signal-only
              </span>
            </div>

            <div className="mb-6">
              <span className="text-5xl font-bold stat-mono">R299</span>
              <span className="text-white/40 text-lg">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                'Daily XAU/USD signal at 07:00 SAST',
                'Clear entry price, stop loss, take profit',
                'Risk analysis with each signal',
                'Delivered via private Discord channel',
                'Walk-forward tested strategy (504 days)',
                'Cancel anytime, no commitment',
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/60">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/onboarding"
              className="block text-center cta-button w-full"
            >
              Get started
            </Link>

            <p className="text-xs text-white/30 text-center mt-4">
              Backtested results shown. Past performance does not guarantee future results.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// FAQ (Antigravity — clean accordion, no chrome)
// ============================================================
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    { q: 'What signals do I receive?', a: 'Daily XAU/USD (gold) trade setups with entry price, stop loss, take profit targets, and risk notes. Delivered every trading day at 07:00 SAST via Discord.' },
    { q: 'Is this live trading or backtested?', a: 'The performance numbers shown are from walk-forward backtesting on 504 days of historical data. These are not live trading results. Past performance does not guarantee future results.' },
    { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no commitments. Cancel your subscription anytime from your dashboard.' },
    { q: 'Do I need to execute trades manually?', a: 'Yes. This is a signal-only service — you receive the setups and execute them on your own broker account. Autopilot (automated execution) is planned for a future release.' },
    { q: 'How do I pay?', a: 'R299/month via EFT or card. We support local South African payment methods.' },
    { q: 'Is this financial advice?', a: 'No. StarkTrade AI provides informational trade signals only. We are not a registered financial advisor. Trading carries risk — you could lose money. Always do your own research.' },
  ];

  return (
    <section id="faq" className="py-32 px-6">
      <div className="section-divider mb-16" />

      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Questions?</h2>
        </motion.div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.01] rounded-xl transition-colors duration-200"
              >
                <span className="text-sm font-medium pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-white/40 leading-relaxed">{faq.a}</p>
                    <div className="gravity-line mx-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER (Antigravity — minimal)
// ============================================================
function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500/50" />
          <span className="text-sm text-white/30">
            © 2026 StarkTrade AI by ELEV8 DIGITAL
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-white/25">
          <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          <Link href="/disclaimer" className="hover:text-white/50 transition-colors">Disclaimer</Link>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function HomePage() {
  return (
    <div className="bg-black">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Performance />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );
}
