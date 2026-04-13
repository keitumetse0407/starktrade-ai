"""StarkTrade AI — FastAPI Application Entry Point"""
import os

# Fallback DB if DATABASE_URL not set
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings

# Sentry error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration

# Initialize Sentry
if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        profiles_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
        release=f"starktrade-ai@{settings.APP_VERSION}",
        send_default_pii=False,  # Don't send PII for GDPR compliance
        before_send=lambda event, hint: (
            None if "NetworkError" in str(hint.get("exc_info", "")) else event
        ),
    )

from app.api.v1 import auth, portfolio, trades, agents, predictions, ws, market_data, admin, signals, autotrading, billing
from app.payfast_routes import router as payfast_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.session import init_db, async_session_factory
    from app.db.seed import seed_all
    await init_db()
    async with async_session_factory() as session:
        await seed_all(session)
        await session.commit()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://starktrade-ai.vercel.app",
        "https://frontend-bice-mu-58.vercel.app",
        "https://starktrade.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=[
    "localhost",
    "starktrade.ai",
    "starktrade-ai-backend.railway.app",
    "starktrade-ai.duckdns.org",
    "113.30.188.215",
])


# Health check
@app.get("/api/health")
async def health():
    return {
        "status": "operational",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# Mount v1 routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["Portfolio"])
app.include_router(trades.router, prefix="/api/v1/trades", tags=["Trades"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["Prediction Markets"])
app.include_router(market_data.router, prefix="/api/v1/market", tags=["Market Data"])
app.include_router(ws.router, prefix="/api/v1/ws", tags=["WebSocket"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(signals.router, tags=["Signals"])
app.include_router(autotrading.router, prefix="/api/v1/autotrading", tags=["Autotrading"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])

# PayFast payment routes
app.include_router(payfast_router)
