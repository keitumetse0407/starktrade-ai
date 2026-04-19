# StarkTrade Platform — Agent Instructions

# 🚨 TRADING SAFETY PRIME DIRECTIVE (NON-NEGOTIABLE)
- **Default mode is PAPER trading** unless explicitly set to LIVE via server-side config
- Any code path that places real orders MUST require explicit server-side allowlist + manual human confirmation
- A global KILL SWITCH must exist to cancel open orders and flatten all positions instantly
- NEVER log secrets; redact API keys (Alpaca, Paystack, Alpha Vantage) in all logs
- ALL trade executions MUST be logged with: timestamp, symbol, side, qty, price, order_type, strategy_id
- Use Decimal for ALL monetary calculations — NEVER float
- Max position size: 5% per trade, 8% drawdown = halt ALL trading, 3% daily loss = stop 24hrs

---

## Architecture Overview
This is a multi-service trading platform running in Docker.

| Service          | Tech                        | Port | Path               |
|------------------|-----------------------------|------|--------------------|
| Frontend         | Next.js 16.2.2 + TS + TW   | 3000 | `frontend/`        |
| Backend API      | FastAPI + Python + Celery   | 8000 | `backend/`         |
| Trading Engine   | Go                          | 8081 | `trading-engine/`  |
| Trading Logic    | Python (agent scripts)      | —    | `engine/`          |
| Agent Prompts    | Markdown/YAML               | —    | `agents/`          |

## ⚠️ CRITICAL QUIRKS (READ FIRST)
- Frontend is Next.js **16.2.2** — NOT 14 as the README claims. Do NOT use Next.js 14 APIs/patterns.
- Backend uses **Celery** for async tasks — long-running jobs MUST go through Celery, not inline FastAPI endpoints.
- All backend commands run through Docker: `docker-compose exec backend <command>`
- Migrations: `docker-compose exec backend alembic upgrade head`
- `.env.example` lists ALL required vars. `SECRET_KEY` and `OPENAI_API_KEY` are **mandatory**.

## External Services & APIs
| Service        | Purpose                        | Env Var(s)                    |
|----------------|--------------------------------|-------------------------------|
| Alpha Vantage  | Market data                    | `ALPHA_VANTAGE_API_KEY`       |
| News API       | Financial news                 | `NEWS_API_KEY`                |
| Alpaca         | Trade execution & market data  | `ALPACA_API_KEY`, `ALPACA_SECRET` |
| Paystack       | Payment processing             | `PAYSTACK_SECRET_KEY`         |
| Qdrant         | Vector DB for embeddings       | `QDRANT_URL`, `QDRANT_API_KEY` |
| Discord        | Webhook notifications          | `DISCORD_WEBHOOK_URL`         |
| Telegram       | Bot notifications              | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

## Start Commands
```sh
# Start all services
docker-compose up -d

# Frontend dev (outside Docker)
cd frontend && npm run dev

# Backend shell
docker-compose exec backend bash

# Run migrations
docker-compose exec backend alembic upgrade head

# Celery worker
docker-compose exec backend celery -A app.worker worker --loglevel=info
```

## Verification Commands
```sh
# Frontend
cd frontend && npm run lint
cd frontend && npm run typecheck

# Backend
docker-compose exec backend pytest
docker-compose exec backend python -m mypy .

# Trading Engine (Go)
cd trading-engine && go test ./...
cd trading-engine && go vet ./...

# All services health
docker-compose ps
curl http://localhost:8000/health
curl http://localhost:3000/api/health
curl http://localhost:8081/health
```

## Code Standards

### Frontend (Next.js 16.2.2 + TypeScript)
- Use Server Components by default, Client Components only when needed
- All components must be typed — no `any`
- Use Tailwind utility classes — no custom CSS unless absolutely necessary
- API calls go through Next.js API routes or server actions, never direct from client
- Use `next/image` for all images, `next/link` for all navigation

### Backend (FastAPI + Python)
- All endpoints need Pydantic models for request/response
- Use dependency injection for DB sessions, auth, etc.
- Long-running tasks → Celery (NEVER block the request)
- All DB queries use SQLAlchemy ORM (no raw SQL unless performance-critical)
- Alembic for ALL schema changes (never modify DB directly)

### Trading Engine (Go)
- Follow standard Go project layout
- All errors must be handled (no `_` for error returns)
- Use context.Context for cancellation/timeouts on all operations
- Trading operations MUST have circuit breakers and rate limiting
- Log all trade executions with full audit trail

### Trading Logic (Python - engine/)
- All strategies must implement a base Strategy interface
- Backtest before deploying ANY strategy change
- Risk limits must be enforced at the engine level (max position size, max drawdown, stop-loss)
- NEVER place real trades without confirmation/safety checks

## Agent Workflow
1. **Read before writing** — `grep`/`glob` to understand existing patterns first
2. **Follow existing conventions** — match the code style already in each package
3. **Run tests after changes** — verify nothing breaks
4. **Docker-first** — backend commands go through `docker-compose exec`
5. **Check .env.example** — if adding a new service, add its env vars there too

## Subagent Usage Guidelines
- @security-auditor — MANDATORY before any auth, payment (Paystack), or trading code
- @code-reviewer — for any PR with 100+ lines changed
- @test-engineer — for any new endpoint or trading strategy
- @architect — before adding new services or changing the docker-compose topology
- @devops — for Docker, CI/CD, deployment, Nginx changes
- @researcher — when integrating new APIs or unfamiliar libraries

## Tool Preferences
- Use `context7` MCP for Next.js, FastAPI, Go stdlib, Alpaca SDK docs
- Use `sequential-thinking` MCP for complex trading logic or multi-service debugging
- Use `memory` MCP to remember architecture decisions across sessions