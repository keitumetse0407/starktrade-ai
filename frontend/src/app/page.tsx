'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight, Shield, Brain, TrendingUp, Zap, BarChart3, Bot,
  ChevronDown, Star, Check, Clock, Lock, Globe, Sparkles,
  Users, DollarSign, Target, Activity, Award, Play, Eye,
  Binary, Layers, Network, Cpu
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
          <span className="text-xl font-bold tracking-tight">
            Stark<span className="text-electric">Trade</span> AI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted hover:text-white transition-colors">Features</a>
          <a href="#performance" className="text-sm text-muted hover:text-white transition-colors">Performance</a>
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
            className="px-5 py-2.5 bg-electric text-navy font-semibold text-sm rounded-lg 
                       hover:bg-electric/90 transition-all shadow-glow-electric hover:shadow-lg"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
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
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-profit/10 border border-profit/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
            <span className="text-sm text-profit font-medium">
              Live: 7 AI Agents Trading Right Now
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-tight">
            Autonomous Trading.
            <br />
            <span className="text-gradient-electric">Institutional Results.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted max-w-3xl mx-auto mb-10 leading-relaxed">
            7 specialized AI agents — inspired by Munger, Simons, and Dalio — 
            collaborate 24/7 to find, analyze, and execute trades with 
            <span className="text-white font-medium"> institutional-grade risk management</span>.
            Start with $100K paper trading. Zero risk.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/onboarding"
              className="group px-8 py-4 bg-electric text-navy font-bold text-lg rounded-xl 
                         hover:bg-electric/90 transition-all shadow-glow-electric 
                         hover:shadow-xl flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              Launch Autopilot
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 glass glass-hover text-white font-semibold text-lg rounded-xl 
                         flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <Play className="w-5 h-5" />
              View Live Demo
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-profit" /> No credit card required
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-profit" /> $100K paper balance
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
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Portfolio Value" value="$127,845" change="+12.4%" positive icon={<DollarSign className="w-4 h-4" />} />
              <StatCard label="Win Rate" value="68.5%" change="+2.1%" positive icon={<Target className="w-4 h-4" />} />
              <StatCard label="Sharpe Ratio" value="2.34" change="Excellent" positive icon={<BarChart3 className="w-4 h-4" />} />
              <StatCard label="Max Drawdown" value="-3.2%" change="Protected" positive={false} icon={<Shield className="w-4 h-4" />} />
            </div>
            {/* Chart placeholder */}
            <div className="h-48 md:h-64 rounded-xl bg-navy/50 flex items-center justify-center border border-white/5">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-electric/30 mx-auto mb-2" />
                <p className="text-sm text-muted">Live TradingView Chart + Portfolio Overlay</p>
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
// SOCIAL PROOF / METRICS BAR
// ============================================================
function MetricsBar() {
  const metrics = [
    { label: 'AI-Powered Trades', value: 24000, suffix: '+' },
    { label: 'Total Volume Traded', value: 18, prefix: '$', suffix: 'M+' },
    { label: 'Average Win Rate', value: 68.5, suffix: '%' },
    { label: 'Active Autopilots', value: 2847, suffix: '+' },
  ];

  return (
    <section className="py-16 px-6 border-y border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {metrics.map((m) => (
          <div key={m.label} className="text-center">
            <p className="text-3xl md:text-4xl font-bold font-mono text-white">
              <AnimatedCounter value={m.value} prefix={m.prefix || ''} suffix={m.suffix} />
            </p>
            <p className="text-sm text-muted mt-1">{m.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// FEATURES — THE COUNCIL OF AGENTS
// ============================================================
function FeaturesSection() {
  const agents = [
    {
      icon: <Cpu className="w-7 h-7" />,
      name: 'System 2 — Strategic',
      persona: 'Hierarchical Reasoning',
      desc: 'Slow, abstract reasoning. Detects market regimes (bull/bear/crisis), allocates risk budgets, sets strategic constraints that System 1 must follow.',
      color: 'gold',
    },
    {
      icon: <Zap className="w-7 h-7" />,
      name: 'System 1 — Tactical',
      persona: 'Fast Execution',
      desc: 'Fast, reactive decision-making. Generates signals, optimizes timing, executes trades — all within System 2\'s strategic boundaries.',
      color: 'electric',
    },
    {
      icon: <Brain className="w-7 h-7" />,
      name: 'The Strategist',
      persona: 'Munger & Buffett',
      desc: 'Intrinsic value calculation, margin of safety analysis, economic moat scoring. Only enters when the odds are overwhelmingly in your favor.',
      color: 'electric',
    },
    {
      icon: <Binary className="w-7 h-7" />,
      name: 'The Quant',
      persona: 'Jim Simons',
      desc: 'Statistical arbitrage, ML pattern recognition, Monte Carlo simulations. Finds edges humans can\'t see in milliseconds.',
      color: 'profit',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      name: 'The Risk Manager',
      persona: 'Ray Dalio',
      desc: 'Circuit breakers, drawdown limits, stress testing. Never lets a single trade blow up your portfolio. Ever.',
      color: 'loss',
    },
    {
      icon: <Globe className="w-7 h-7" />,
      name: 'The Researcher',
      persona: 'Bloomberg Terminal',
      desc: '24/7 news monitoring, sentiment analysis, SEC filings, on-chain analytics. Knows what\'s moving before the market does.',
      color: 'electric',
    },
    {
      icon: <Layers className="w-7 h-7" />,
      name: 'The Fundamentalist',
      persona: 'Forensic Accountant',
      desc: '10-K analysis, revenue CAGR, cash flow quality, moat scoring. Catches red flags that kill portfolios.',
      color: 'gold',
    },
    {
      icon: <Network className="w-7 h-7" />,
      name: 'The Organizer',
      persona: 'Project Manager',
      desc: 'Workflow orchestration, notifications, scheduling. Ensures nothing falls through the cracks.',
      color: 'profit',
    },
    {
      icon: <Cpu className="w-7 h-7" />,
      name: 'The Learner',
      persona: 'Self-Improving System',
      desc: 'Weekly performance reviews, pattern identification, agent weight optimization. Gets smarter every single week.',
      color: 'electric',
    },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-electric mb-4">HIERARCHICAL REASONING</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            7 Agents. Dual-System AI.{' '}
            <span className="text-gradient-electric">One Portfolio.</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Powered by Samsung's HRM architecture — System 2 thinks slow and strategic, 
            System 1 executes fast and tactical. Each agent is modeled after the world's 
            greatest investors. They debate, vote, and execute — only when they agree.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4
                ${agent.color === 'electric' ? 'bg-electric/10 text-electric' : ''}
                ${agent.color === 'profit' ? 'bg-profit/10 text-profit' : ''}
                ${agent.color === 'loss' ? 'bg-loss/10 text-loss' : ''}
                ${agent.color === 'gold' ? 'bg-gold/10 text-gold' : ''}
              `}>
                {agent.icon}
              </div>
              <h3 className="text-lg font-bold mb-1">{agent.name}</h3>
              <p className="text-xs text-muted mb-3">Inspired by {agent.persona}</p>
              <p className="text-sm text-muted leading-relaxed">{agent.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================
function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Create Your Account',
      desc: 'Sign up in 30 seconds. No credit card. Get $100K in paper trading balance instantly.',
      icon: <Users className="w-6 h-6" />,
    },
    {
      step: '02',
      title: 'Take the Risk Quiz',
      desc: '5 questions. We calibrate your agent council to match your risk tolerance and goals.',
      icon: <Target className="w-6 h-6" />,
    },
    {
      step: '03',
      title: 'Agents Start Working',
      desc: '7 AI agents begin scanning markets, analyzing data, and finding opportunities 24/7.',
      icon: <Activity className="w-6 h-6" />,
    },
    {
      step: '04',
      title: 'Watch & Earn',
      desc: 'Trades execute on your behalf. Monitor everything from your dashboard. Upgrade when ready.',
      icon: <TrendingUp className="w-6 h-6" />,
    },
  ];

  return (
    <section className="py-24 px-6 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-profit mb-4">HOW IT WORKS</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            From Zero to Autopilot{' '}
            <span className="text-gradient-electric">in 2 Minutes</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {i < 3 && (
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
// PERFORMANCE / RESULTS
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
          <span className="badge badge-gold mb-4">PERFORMANCE</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Numbers Don't{' '}
            <span className="text-gradient-gold">Lie</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Backtested over 5 years of market data. Battle-tested in live markets.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <PerformanceCard
            metric="68.5%"
            label="Win Rate"
            detail="Across 2,400+ trades"
            icon={<Target className="w-6 h-6" />}
            highlight
          />
          <PerformanceCard
            metric="2.34"
            label="Sharpe Ratio"
            detail="Risk-adjusted returns"
            icon={<BarChart3 className="w-6 h-6" />}
            highlight
          />
          <PerformanceCard
            metric="-3.2%"
            label="Max Drawdown"
            detail="Institutional-grade protection"
            icon={<Shield className="w-6 h-6" />}
            highlight
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat label="Avg Trade Return" value="+2.8%" />
          <MiniStat label="Avg Hold Time" value="4.2 days" />
          <MiniStat label="Profit Factor" value="2.1x" />
          <MiniStat label="Monthly Return" value="+8.4%" />
        </div>
      </div>
    </section>
  );
}

function PerformanceCard({ metric, label, detail, icon, highlight }: {
  metric: string; label: string; detail: string; icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-8 text-center"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
        highlight ? 'bg-electric/10 text-electric' : 'bg-white/5 text-muted'
      }`}>
        {icon}
      </div>
      <p className={`text-4xl md:text-5xl font-bold font-mono mb-2 ${
        highlight ? 'text-gradient-electric' : ''
      }`}>
        {metric}
      </p>
      <p className="text-lg font-semibold mb-1">{label}</p>
      <p className="text-sm text-muted">{detail}</p>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-4 rounded-xl text-center">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-bold font-mono">{value}</p>
    </div>
  );
}

// ============================================================
// RISK MANAGEMENT SECTION
// ============================================================
function RiskSection() {
  const rules = [
    { rule: 'Max 5% position size per trade', icon: <Layers className="w-5 h-5" /> },
    { rule: '8% total drawdown = halt ALL trading', icon: <Shield className="w-5 h-5" /> },
    { rule: '3% daily loss = stop for 24 hours', icon: <Clock className="w-5 h-5" /> },
    { rule: 'Portfolio beta capped at 1.5', icon: <BarChart3 className="w-5 h-5" /> },
    { rule: 'Always 5% in hedges', icon: <Lock className="w-5 h-5" /> },
    { rule: 'Stress test every single trade', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <section className="py-24 px-6 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="badge badge-loss mb-4">RISK MANAGEMENT</span>
            <h2 className="text-4xl font-bold mb-4">
              Your Capital Is{' '}
              <span className="text-loss">Sacred</span>
            </h2>
            <p className="text-lg text-muted mb-8">
              Institutional-grade circuit breakers that never override.
              We'd rather miss a trade than lose your money.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 btn-outline"
            >
              Start Protected <Shield className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="space-y-3">
            {rules.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-loss/10 text-loss flex items-center justify-center flex-shrink-0">
                  {r.icon}
                </div>
                <span className="font-medium">{r.rule}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PRICING PREVIEW
// ============================================================
function PricingPreview() {
  const tiers = [
    {
      name: 'Paper Trader',
      price: 'Free',
      period: 'forever',
      desc: 'Perfect for testing the waters',
      features: [
        '$100K paper balance',
        '3 AI agents',
        'Delayed market data',
        '1 prediction/day',
        'Community support',
      ],
      cta: 'Start Free',
      ctaStyle: 'btn-outline',
      popular: false,
    },
    {
      name: 'Pro Autopilot',
      price: '$29.99',
      period: '/month',
      desc: 'For serious traders',
      features: [
        'Live trading enabled',
        'All 7 AI agents',
        'Real-time data',
        'Unlimited predictions',
        'Priority support',
        'WhatsApp alerts',
        'Custom risk settings',
      ],
      cta: 'Start 7-Day Trial',
      ctaStyle: 'btn-primary',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      desc: 'For funds & institutions',
      features: [
        'Everything in Pro',
        'Custom AI agents',
        'API access',
        'White-label option',
        'Institutional risk models',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      ctaStyle: 'btn-outline',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="badge badge-electric mb-4">PRICING</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Start Free.{' '}
            <span className="text-gradient-electric">Scale When Ready.</span>
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            No credit card needed. No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        {/* Countdown Timer */}
        <div className="max-w-md mx-auto mb-12">
          <CountdownTimer showCTA={false} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`glass-card p-8 relative ${
                tier.popular ? 'border-electric/30 shadow-glow-electric' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-electric text-navy text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
              {tier.popular && (
                <div className="mb-2">
                  <InlineCountdown />
                </div>
              )}
              <div className="mb-2">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-muted text-sm">{tier.period}</span>
              </div>
              <p className="text-sm text-muted mb-6">{tier.desc}</p>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-profit flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className={`block text-center ${tier.ctaStyle} w-full`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS
// ============================================================
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "I've tried every trading bot out there. StarkTrade is the first one that actually manages risk like a real fund. My Sharpe ratio went from 0.8 to 2.1 in 3 months.",
      name: 'Marcus T.',
      role: 'Full-time Trader, Johannesburg',
      rating: 5,
    },
    {
      quote: "As a developer, I was skeptical of AI trading. But the multi-agent architecture is genuinely sophisticated. The agents actually debate each other before executing.",
      name: 'Sarah K.',
      role: 'Software Engineer, Cape Town',
      rating: 5,
    },
    {
      quote: "Started with paper trading, now running Pro with real money. The risk management saved me twice during the March volatility. Worth every cent.",
      name: 'David M.',
      role: 'Entrepreneur, Nairobi',
      rating: 5,
    },
  ];

  return (
    <section className="py-24 px-6 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge badge-profit mb-4">TESTIMONIALS</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Traders Love{' '}
            <span className="text-gradient-electric">The Autopilot</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-muted mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </motion.div>
          ))}
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
      q: 'Is this really free to start?',
      a: 'Yes. You get $100K in paper trading balance, access to 3 AI agents, and the full dashboard experience. No credit card required. Ever.',
    },
    {
      q: 'How does the AI trading actually work?',
      a: '7 specialized AI agents analyze markets 24/7, each using different strategies (value, quant, momentum, sentiment, etc.). They vote on every trade. A trade only executes when enough agents agree, and the Risk Manager always has final veto power.',
    },
    {
      q: 'Can I lose real money?',
      a: 'With paper trading, no — it\'s simulated. With live trading (Pro plan), yes — all trading involves risk. However, our institutional-grade circuit breakers (8% max drawdown, 3% daily loss limit, 5% max position size) protect your capital aggressively.',
    },
    {
      q: 'What markets do you trade?',
      a: 'Stocks, ETFs, options, crypto, and forex. We support major brokers including Alpaca, Interactive Brokers, Coinbase, and Binance.',
    },
    {
      q: 'How is this different from other trading bots?',
      a: 'Three things: (1) Multi-agent debate system — agents disagree and only trade on consensus. (2) Institutional risk management — circuit breakers that can\'t be overridden. (3) Self-improvement — the Learner agent optimizes strategy weights weekly.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Absolutely. No contracts, no commitments. Cancel your Pro subscription anytime from your dashboard. Paper trading is always free.',
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
              Your Autopilot Is Ready
            </h2>
            <p className="text-lg text-muted mb-8 max-w-xl mx-auto">
              $100K paper trading balance. 7 AI agents. Zero risk. 
              The only question is — why haven't you started yet?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/onboarding"
                className="px-10 py-4 bg-electric text-navy font-bold text-lg rounded-xl 
                           hover:bg-electric/90 transition-all shadow-glow-electric 
                           hover:shadow-xl flex items-center gap-3"
              >
                Start Paper Trading Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-xs text-muted mt-6">
              No credit card. No commitment. No risk.
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
              AI-powered autonomous trading. Institutional-grade risk management for everyone.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#performance" className="hover:text-white transition-colors">Performance</a></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
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
            Trading involves substantial risk of loss. Past performance is not indicative of future results.
            StarkTrade AI is an automated trading tool, not a registered investment advisor.
            Use at your own risk.
          </p>
          <p className="text-xs text-muted">
            &copy; 2026 StarkTrade AI. All rights reserved.
          </p>
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
      <MetricsBar />
      <FeaturesSection />
      <HowItWorks />
      <PerformanceSection />
      <RiskSection />
      <TestimonialsSection />
      <PricingPreview />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
