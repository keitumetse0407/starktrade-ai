# STARKTRADE AI — FULL PROJECT STATE FOR CONTINUATION
# Paste everything below this line into OpenClaw.

---

## PROJECT OVERVIEW

**Name:** StarkTrade AI
**Repo:** https://github.com/keitumetse0407/starktrade-ai
**Branch:** main (latest commit pushed)
**Owner:** Elkai | ELEV8 DIGITAL | South Africa
**Product:** AI-assisted XAU/USD gold signal service for SA traders
**Pricing:** R299/month founding member (signal-only, NOT autopilot trading)
**Delivery:** Discord webhook (Telegram exists but Discord is primary now)
**Backtest:** 504 days XAUUSD walk-forward: 75% win rate, +14.0% return, 1.69 Sharpe, 2.01 profit factor, 8.7% max drawdown
**CRITICAL:** 200 EMA trend filter is non-negotiable — turns -19.5% into +14.0%

## CURRENT DEPLOYMENT STATUS

| Component | Status | URL / Location |
|---|---|---|
| Frontend (Next.js 14) | ✅ Live on Vercel | https://starktrade-ai.vercel.app |
| Backend API (FastAPI) | ❌ NOT DEPLOYED | Needs Railway/Render deploy |
| PostgreSQL | ❌ NOT PROVISIONED | Railway free tier planned |
| Redis | ❌ NOT PROVISIONED | Railway free tier planned |
| Celery Worker | ❌ NOT RUNNING | Runs after backend deploy |
| Celery Beat | ❌ NOT RUNNING | Runs after backend deploy |
| Discord Webhook | ⚠️ NOT CONFIGURED | User needs to create webhook |
| PayFast Payments | ❌ NOT CONFIGURED | Needs merchant account approval |
| Alpaca Paper Trading | ⚠️ Keys not set | Free paper account available |
| Signal Engine | ✅ Works locally | /root/starktrade-ai/engine/ |

## ARCHITECTURE

```
starktrade-ai/
├── frontend/                    # Next.js 14 + TypeScript + Tailwind + Framer Motion
│   ├── src/app/
│   │   ├── page.tsx            # Landing page — Antigravity redesign (DONE)
│   │   ├── dashboard/page.tsx  # Main dashboard — 7 AI agents visible (DONE)
│   │   ├── admin/page.tsx      # Admin panel — revenue, users, config (DONE)
│   │   ├── onboarding/page.tsx # Login/Register + risk quiz (DONE)
│   │   ├── pricing/page.tsx    # PayFast payment page (NEEDS UPDATE)
│   │   ├── terms/page.tsx      # Terms of Service
│   │   ├── privacy/page.tsx    # POPIA Privacy Policy
│   │   └── disclaimer/page.tsx # Risk Disclaimer
│   ├── src/components/         # Reusable components
│   ├── src/lib/                # API client, theme, query provider, toast, utils
│   ├── src/hooks/              # useWebSocket, useAgentFeed, useMarketFeed
│   └── next.config.js          # Proxies /api/* to backend
│
├── backend/                     # Python FastAPI + async SQLAlchemy + Pydantic v2
│   ├── app/
│   │   ├── main.py             # FastAPI app with lifespan, CORS, routers
│   │   ├── core/               # config.py, auth.py (JWT, bcrypt)
│   │   ├── db/                 # models.py (User, Portfolio, Trade, Signal, etc.), session.py, seed.py
│   │   ├── api/v1/             # Routes: auth, portfolio, trades, agents, predictions, ws, market_data, admin, signals, paystack, billing
│   │   └── services/           # celery_app.py, tasks.py, execution.py
│   ├── requirements.txt        # All Python deps installed
│   ├── railway.toml            # Railway deploy config
│   ├── Procfile                # Heroku/Render compatible
│   └── runtime.txt             # Python 3.11.8
│
├── engine/                      # Standalone signal engine (works without backend)
│   ├── __init__.py             # Exports: SignalOrchestrator, RegimeDetector, etc.
│   ├── orchestrator.py          # Main brain: 4-agent consensus engine, ≥3/4 agree → trade
│   ├── regime_detector.py       # ADX + BB width + ATR + EMA alignment → 4 regimes
│   ├── quant_agent.py           # ML models: RandomForest + GradientBoosting (gold_quant_rf.pkl, gold_quant_gb.pkl)
│   ├── sentiment_agent.py       # RSS news sentiment scoring (keyword + VADER heuristic)
│   ├── pattern_agent.py         # Technical pattern recognition with volume + trend confirmation
│   ├── risk_agent.py            # Circuit breakers, daily P&L tracking, position management
│   ├── context_memory.py        # Persistent memory: signal_log, agent_scoreboard, market_journal, concept_drift
│   ├── feedback_loop.py         # Auto-resolves signals against current prices, updates agent scores
│   ├── telegram.py              # Telegram notification utility
│   ├── discord_notifier.py      # Discord webhook — text, embed, and rich signal embed modes
│   └── memory/                  # 4 JSON files: signal_log.json, agent_scoreboard.json, market_journal.json, system_state.json
│
├── render.yaml                  # Render.com deploy config (API + Worker + Beat + DB + Redis)
├── .env.example                 # Template for environment variables
├── docker-compose.yml           # Docker setup (not used for deployment)
├── start.sh                     # Local dev start script
└── test_discord.py              # Discord webhook test script
```

## 7 AI AGENTS (User MUST see these in dashboard)

1. **Quant Agent** — ML price prediction (RandomForest + GradientBoosting trained on XAU/USD data). Models at `engine/models/gold_quant_rf.pkl` and `gold_quant_gb.pkl`
2. **Sentiment Agent** — RSS news feed sentiment scoring (VADER + keyword heuristic). Feeds are currently returning 0 articles — needs User-Agent header fix.
3. **Pattern Agent** — Technical pattern recognition (support/resistance, candlestick patterns, volume confirmation, trend context boost/penalty)
4. **Risk Agent** — Portfolio risk management with circuit breakers, daily P&L 24h auto-reset, position tracking (OpenPosition class)
5. **Regime Detector** — ADX + Bollinger Band width + ATR classification → 4 regimes: trending, breakout, range, rotational
6. **Orchestrator (SignalOrchestrator)** — Consensus engine: coordinates all 4 agents + regime detector, requires ≥3/4 agents agree for a trade, dynamic weight scoring (0.3 to 1.5 based on Bayesian-shrunk accuracy)
7. **Context Memory** — Persistent learning across runs: signal log, agent scoreboard with dynamic weights, market journal with concept drift detection. Saves to `engine/memory/` (4 JSON files)

## INTEGRATIONS

### Discord (PRIMARY — replaces Telegram)
- `engine/discord_notifier.py` — 3 modes: plain text, embed, rich signal embed
- `setup_discord_webhook.py` — Interactive setup script (paste webhook URL → test → auto-writes to .env)
- Backend API `/api/v1/signals/send` supports `channel: "discord"`
- Env var: `DISCORD_WEBHOOK_URL` (User needs to create this in Discord: Server → Channel Settings → Integrations → Webhooks → Create → Copy URL)

### Telegram (BACKUP — exists but not primary)
- `engine/telegram.py` — Async Telegram Bot API client with 4096-char limit handling
- Env vars: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- Can still be used via `channel: "telegram"` in signals API

### PayFast (SA Payment Gateway — NOT CONFIGURED)
- `backend/app/api/v1/billing.py` — Stripe webhook handler exists but NOT what we're using
- We want PayFast (South African gateway) for local card/EFT payments
- `frontend/src/app/pricing/page.tsx` has PayFast integration but needs env vars: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- NOTE: PayFast and Paystack are different — Paystack is Nigerian, PayFast is SA. We need PayFast but Paystack vars are in the codebase. Fix this.
- ITN handler activates subscriptions by updating `User.role` from `free` → `pro`

### Alpaca Markets (Paper Trading — NOT CONFIGURED)
- Keys NOT set. User can get free paper trading account at https://app.alpaca.markets/paper/dashboard/overview
- Env vars: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `ALPACA_BASE_URL=https://paper-api.alpaca.markets`
- `backend/app/services/execution.py` — queues trades via Celery to Alpaca
- Currently NOT used — signal-only service for now. Autopilot is a future feature.
- The `execute_trade_task` in `tasks.py` exists but needs Alpaca keys to work.

### Celery (Scheduled Tasks — configured, not running)
- `backend/app/services/celery_app.py` — Beat schedule with 5 tasks:
  1. `generate_daily_signal` — Runs at 06:00 UTC daily, generates signal via orchestrator, saves to DB, sends to Discord
  2. `run_agent_pipeline` — Every 5 min, runs multi-agent analysis on top symbols
  3. `update_portfolio_metrics` — Every 60 sec, recalculates portfolio metrics
  4. `generate_daily_digest` — Daily, sends performance digest to users
  5. `run_weekly_learning` — Weekly, reviews trades, adjusts agent weights
- Worker command: `celery -A app.services.celery_app worker --loglevel=info`
- Beat command: `celery -A app.services.celery_app beat --loglevel=info`

## DATABASE

### Models (backend/app/db/models.py)
- `User` — id, email, hashed_password, full_name, role (admin/free/pro/enterprise), is_active, is_verified, risk_tolerance, strategy, auto_trading_enabled
- `Portfolio` — id, user_id, name, total_value, cash_balance, daily_pnl, total_pnl, win_rate, is_paper
- `Trade` — id, portfolio_id, symbol, side, quantity, entry_price, exit_price, pnl, pnl_pct, status
- `Signal` — id, symbol, action, entry_price, stop_loss, take_profit, confidence, rationale, message_text, status (generated/sent/resolved), delivered_via (telegram/discord/api/email), telegram_message_id, sent_at, resolved_at, outcome
- `SignalPerformance` — id, signal_id, actual_entry, actual_exit, pnl_pct, was_profitable, notes
- `Notification` — id, user_id, type, title, message, is_read
- `SiteConfig` — id, key, value, description, updated_by, updated_at
- `Prediction` — id, question, description, yes_count, no_count, market_url, expires_at

### Admin Seed (backend/app/db/seed.py)
- Auto-creates admin user on first deploy if users table is empty
- **Admin credentials:**
  - Email: `keitumetse0407@gmail.com`
  - Password: `StarkTrade2026!_Admin`
  - Role: `admin` (full access)
  - ⚠️ User should change this after first login — it's in the repo

## ENVIRONMENT VARIABLES (REQUIRED)

```bash
# Core
SECRET_KEY=fc70f868987f17b846593b20480978e4c5addaf7a2c29473122de5eb972d5024
ENVIRONMENT=production
DEBUG=false

# Database (auto-injected by Railway)
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Redis (auto-injected by Railway)
REDIS_URL=redis://default:pass@host:6379
CELERY_BROKER_URL=redis://default:pass@host:6379/1
CELERY_RESULT_BACKEND=redis://default:pass@host:6379/2

# Discord — PRIMARY signal delivery
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE

# Telegram — BACKUP (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Alpaca — Paper trading (optional for now)
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# OpenAI — For AI agent intelligence
OPENAI_API_KEY=sk-your-openai-key-here

# Payments — PayFast (SA gateway)
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_RETURN_URL=https://starktrade-ai.vercel.app/dashboard
PAYFAST_CANCEL_URL=https://starktrade-ai.vercel.app/pricing
PAYFAST_NOTIFY_URL=https://your-backend-url.railway.app/api/v1/billing/payfast/notify

# Paystack — NOT NEEDED (remove or ignore, it's Nigerian not SA)
# PAYSTACK_SECRET_KEY=
# PAYSTACK_PUBLIC_KEY=

# Monitoring (optional)
SENTRY_DSN=
```

## FRONTEND PAGES (ALL REBUILT WITH ANTIGRAVITY THEME)

| Route | Status | Description |
|---|---|---|
| `/` | ✅ Antigravity | Landing: void black, particles, ambient orbs, floating stats, CTA to /onboarding |
| `/dashboard` | ✅ Antigravity | 7 sidebar tabs: Command Center, Autopilot, Agents (all 7 visible), Predictions, History, Analytics, Settings |
| `/admin` | ✅ Antigravity | 5 tabs: Overview, Revenue, Users, AdSense, Site Config |
| `/onboarding` | ✅ Antigravity | Login/Register → 5-question risk quiz → strategy recommendation → dashboard |
| `/pricing` | ⚠️ Old theme | PayFast integration, 2 plans (Pro R99, Enterprise R499), crisis pricing banner |
| `/terms` | ⚠️ Old theme | Legal — Terms of Service |
| `/privacy` | ⚠️ Old theme | Legal — POPIA Privacy Policy |
| `/disclaimer` | ⚠️ Old theme | Legal — Risk Disclaimer |

### Design System (Antigravity — globals.css)
- Background: `bg-black` (pure void)
- Cards: `glass-panel` (rgba(255,255,255,0.02), backdrop-filter: blur(40px), border: 1px solid rgba(255,255,255,0.06))
- Text: `text-white`, `text-white/60` (dim), `text-white/30` (muted)
- Gradients: `text-gradient-blue`, `text-gradient-green`, `text-gradient-gold`, `text-gradient-silver`
- Buttons: `cta-button` (blue filled with glow), `ghost-button` (outline)
- Inputs: `input-void`
- Mono stats: `stat-mono` (JetBrains Mono, tabular-nums)
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (stats/code)
- Dividers: `section-divider`
- Ambient orbs: `animate-float-slow`, `animate-pulse-glow`

## KNOWN ISSUES & BUGS

1. **RSS feeds returning 0 articles** — Likely blocking scrapers. `engine/sentiment_agent.py` needs User-Agent headers or switch to different feed source.
2. **Sentiment agent has no training data** — Keyword scoring is heuristic-only (VADER). No fine-tuned model.
3. **No slippage/commission modeled** — All backtest PnL is theoretical. Real execution will differ.
4. **Paystack in codebase but we want PayFast** — `billing.py` has Stripe webhook, pricing page references PayFast. Clean this up — remove Paystack/Stripe, add proper PayFast ITN handler.
5. **Frontend proxy URL** — `frontend/next.config.js` proxies `/api/*` to `http://185.167.97.193:8000/api/*`. This is a hardcoded IP that may not work after deploy. Needs to point to Railway URL.
6. **Pricing page not updated** — Still shows R99/R499 plans. Should show R299/month signal-only plan.
7. **Legal pages not styled** — Still using old theme, not Antigravity.
8. **First user = admin** — If the seed doesn't run, the first person to register gets admin. This is by design but worth noting.

## WHAT'S NEXT (PRIORITIES)

### IMMEDIATE (today)
1. **Deploy backend to Railway** — User needs to click deploy, add PostgreSQL + Redis, set env vars
2. **Create Discord webhook** — Run `python3 setup_discord_webhook.py` or manually create in Discord
3. **Update frontend proxy** — Point `next.config.js` to Railway URL after deploy
4. **Register admin account** — Go to /onboarding, register with keitumetse0407@gmail.com / StarkTrade2026!_Admin

### SHORT TERM (this week)
5. **Fix pricing page** — Update to show R299/month signal-only plan with Antigravity theme
6. **Fix PayFast integration** — Replace Stripe/Paystack with proper PayFast ITN handler
7. **Fix RSS feeds** — Add User-Agent headers or switch to better news source
8. **Style legal pages** — Update terms, privacy, disclaimer to Antigravity theme
9. **Test live signal generation** — Run orchestrator, verify signal appears in Discord
10. **Configure Celery Beat** — Set crontab for 06:00 UTC daily signal generation

### MEDIUM TERM (next 2 weeks)
11. **Set up PayFast merchant account** — Get API keys for SA payments
12. **Build signal history page** — Connect to `/api/v1/signals/history` API
13. **Build admin signal review** — Approve/reject signals before sending
14. **Add model retraining pipeline** — When concept drift detected, retrain ML models
15. **Post free signals publicly** — 3 days of free signals in Discord channel as proof
16. **DM 50-100 SA traders** — Founding member offer at R299/month

## COMMANDS TO KNOW

```bash
# Frontend
cd /root/starktrade-ai/frontend
npm run dev          # Dev server on :3000
npm run build        # Production build
npm start            # Production server

# Backend
cd /root/starktrade-ai/backend
uvicorn app.main:app --reload --port 8000  # Dev server

# Signal Engine (standalone, no backend needed)
cd /root/starktrade-ai
python3 -c "
import sys
sys.path.append('./backend')
from app.agents.orchestrator import run_pipeline
import asyncio
result = asyncio.run(run_pipeline('XAUUSD'))
# For manual testing, we can print the final decision
print(result.get('final_decision', {}))
"

# Discord Test
python3 test_discord.py "YOUR_WEBHOOK_URL"

# Discord Setup (interactive)
python3 setup_discord_webhook.py

# Backtest
python3 -m engine.backtester  # Runs 504-day walk-forward backtest

# Git
cd /root/starktrade-ai
git add -A && git commit -m "message" && git push origin main
```

## HARD RULES FOR CONTINUATION

1. **NEVER use Telegram as primary** — Discord is PRIMARY. Telegram is backup only.
2. **NEVER add auto-execution without user asking** — Signal-only for now. Alpaca is paper trading only.
3. **ALWAYS use Antigravity design** — Void black, glass panels, ambient orbs. NO more navy blue gradients.
4. **ALWAYS read files before editing** — Never guess paths or key names.
5. **NEVER truncate code** — Output full files, no "...rest stays the same".
6. **ALWAYS test build** — Run `npm run build` before claiming anything works.
7. **NEVER assume deploy is done** — Backend is NOT deployed. Frontend is on Vercel but backend API is dead.
8. **ALWAYS use subagents** — For multi-file work, launch subagents in parallel. Don't do everything sequentially.
9. **SA FIRST** — PayFast (not Stripe), ZAR pricing (not USD), SAST timezone (not PST), local payment methods.
10. **Ship fast** — Don't over-engineer. Get signals flowing, take payments, iterate.

## KEY INSIGHTS FROM PREV AI SESSION

- The Go trading engine was reviewed twice and both times the recommendation was: CUT IT. Python is enough.
- The 200 EMA trend filter is the single most important feature — without it, backtest goes from +14.0% to -19.5%.
- Dynamic agent weights (0.3 to 1.5) based on Bayesian-shrunk accuracy are already implemented in `context_memory.py`.
- Concept drift detection is already implemented — detects regime instability, volatility shift, trend direction flip.
- The ML models (RandomForest + GradientBoosting) are trained and saved at `engine/models/gold_quant_rf.pkl` and `gold_quant_gb.pkl`.
- The signal orchestrator works standalone — you can run it without the backend API, without a database, without Docker.
- The feedback loop auto-resolves active signals against current prices and updates agent scores.
- RSS feeds are the weakest link — they return 0 articles because they block Python's default User-Agent.

---

## YOUR TASK RIGHT NOW

Continue building StarkTrade AI. The user (Elkai/Keitumetse) wants to:
1. Get signals flowing to Discord
2. Start taking R299/month payments from SA traders
3. Have a working dashboard where he can see all 7 AI agents
4. Deploy the backend so the app actually works end-to-end

The backend is NOT deployed. The frontend is on Vercel but can't reach the API. Fix this. Ship. Make it work.
