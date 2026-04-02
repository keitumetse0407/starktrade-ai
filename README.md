# StarkTrade AI

AI-powered autonomous trading platform. Multi-agent intelligence meets institutional-grade risk management.

## Architecture

```
starktrade-ai/
├── frontend/          # Next.js 14, TypeScript, Tailwind, Shadcn/UI
├── backend/           # FastAPI, Celery, LangGraph multi-agent
├── trading-engine/    # Go 1.22+, goroutines, WebSocket
├── agents/            # Agent prompts, tools, graph definitions
├── infra/             # Docker, K8s, monitoring
├── tests/             # E2E, integration, unit tests
└── docs/              # Documentation
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Shadcn/UI, Zustand, TanStack Query, Recharts |
| Backend | Python FastAPI, Celery + Redis, FastAPI-Users JWT auth |
| Trading Engine | Go 1.22+, Gorilla WebSocket, goroutines |
| AI Layer | LangGraph multi-agent, OpenAI GPT-4o, Qdrant vector store |
| Database | PostgreSQL 16, TimescaleDB, Redis 7 |
| Infra | Docker Compose, GitHub Actions CI/CD, Prometheus/Grafana |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- Go 1.22+
- OpenAI API key

### 1. Clone & Configure

```bash
git clone <repo-url> && cd starktrade-ai
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY at minimum
```

### 2. Start All Services

```bash
docker-compose up -d
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Trading Engine: http://localhost:8081
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Qdrant: http://localhost:6333
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

### 3. Run Migrations

```bash
docker-compose exec backend alembic upgrade head
```

### 4. Access

- Landing page: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Onboarding: http://localhost:3000/onboarding

## Hierarchical Reasoning Model (HRM)

StarkTrade AI uses **Samsung's HRM architecture** for AI decision-making:

```
┌─────────────────────────────────────────────────┐
│               SYSTEM 2 (Strategic)               │
│                                                   │
│  • Market regime detection (Bull/Bear/Crisis)     │
│  • Risk budget allocation                         │
│  • Multi-timeframe analysis                       │
│  • Macro thesis formation                         │
│  • Slow, abstract reasoning (daily/weekly)        │
│                                                   │
│  Sets constraints → System 1 must follow          │
└──────────────────────┬──────────────────────────┘
                       │
                       │ Risk Budget & Context
                       ▼
┌─────────────────────────────────────────────────┐
│               SYSTEM 1 (Tactical)                │
│                                                   │
│  7 Parallel Agents:                               │
│  • Researcher (news, sentiment, filings)          │
│  • Strategist (intrinsic value, moat analysis)    │
│  • Quant (statistical arbitrage, ML patterns)     │
│  • Fundamentalist (10-K analysis, tokenomics)     │
│  • Risk Manager (System 2 gatekeeper authority)   │
│  • Organizer (workflow, notifications)            │
│  • Learner (weekly review, weight optimization)   │
│                                                   │
│  Fast, reactive execution (minutes/hours)         │
│  Operates WITHIN System 2's constraints           │
└──────────────────────┬──────────────────────────┘
                       │
                       │ Outcomes
                       ▼
┌─────────────────────────────────────────────────┐
│              FEEDBACK LOOP                        │
│                                                   │
│  • Win/loss outcomes → System 2 adjusts           │
│  • Risk budget recalibration                      │
│  • Aggression multiplier tuning                   │
│  • Regime model recalibration                     │
│  • Agent weight optimization                      │
│                                                   │
│  Continuous learning across timescales            │
└─────────────────────────────────────────────────┘
```

### Why HRM?

1. **Temporal Reasoning**: System 2 reasons about weeks/months, System 1 handles minutes/hours
2. **Constraint-Based**: System 2 sets boundaries, System 1 has freedom within them
3. **Feedback Loop**: Outcomes continuously improve System 2's strategic model
4. **Regime Awareness**: Different market regimes activate different agent behaviors
5. **Risk Budgeting**: System 2 allocates risk, System 1 spends it — never over budget

## Multi-Agent System

The AI core uses LangGraph's stateful graph to orchestrate 7 specialized agents:

```
TRIGGER → SYSTEM 2 REGIME → PARALLEL SYSTEM 1 → RISK GATE → SYNTHESIS
```

| Agent | Role | Inspired By |
|-------|------|------------|
| System 2 | Strategic regime detection, risk budgets | Samsung HRM |
| The Researcher | News, sentiment, filings, on-chain | Bloomberg Terminal |
| The Strategist | Intrinsic value, moat, margin of safety | Munger & Buffett |
| The Quant | Statistical arbitrage, ML patterns | Jim Simons |
| The Risk Manager | Final gatekeeper, circuit breakers | Ray Dalio |
| The Organizer | Workflow, notifications, scheduling | Project Manager |
| The Learner | Weekly review, weight optimization | Self-Improving System |
| The Fundamentalist | 10-K analysis, tokenomics, moat scoring | Forensic Accountant |

## API Endpoints

### Auth
- `POST /api/v1/auth/register` — Register
- `POST /api/v1/auth/login` — Login
- `GET /api/v1/auth/me` — Current user

### Portfolio
- `GET /api/v1/portfolio/` — List portfolios
- `POST /api/v1/portfolio/create` — Create portfolio

### Trades
- `GET /api/v1/trades/` — List trades
- `POST /api/v1/trades/` — Create trade

### Agents
- `GET /api/v1/agents/` — Agent status
- `GET /api/v1/agents/{id}/decisions` — Agent decisions

### Prediction Markets
- `GET /api/v1/predictions/markets` — List markets
- `POST /api/v1/predictions/markets` — Create market
- `POST /api/v1/predictions/trade` — Place prediction trade

### Market Data
- `GET /api/v1/market/pulse` — Market indices
- `GET /api/v1/market/ohlcv` — OHLCV data
- `GET /api/v1/market/search` — Symbol search

### WebSocket
- `ws://localhost:8000/api/v1/ws/live` — Real-time data
- `ws://localhost:8000/api/v1/ws/agents` — Agent activity feed

## Revenue Model

| Tier | Price | Features |
|------|-------|---------|
| Free | $0 | Paper trading $100K, 3 agents, delayed data, 1 prediction/day |
| Pro | $29.99/mo | Live trading, all 7 agents, real-time data, unlimited predictions |
| Enterprise | $199/mo | Custom agents, API access, white-label, institutional risk |

## Risk Management

Built-in circuit breakers (never override):
- Max 5% position size per trade
- 8% drawdown = halt ALL trading
- 3% daily loss = stop 24hrs
- Portfolio beta ≤ 1.5
- Always 5% in hedges
- Stress test every trade

## Disclaimer

Trading involves risk. Past performance does not guarantee future results. StarkTrade AI is an automated asset management tool, not a registered investment advisor. Use at your own risk.
