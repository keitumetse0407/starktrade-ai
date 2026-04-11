"""
StarkTrade AI — Simplified Backend for VPS Deployment
Works without heavy dependencies (langchain, torch, etc.)
"""
import os

# Use uvloop for 5-10x faster async performance
try:
    import uvloop
    uvloop.install()
    print("✅ uvloop installed - async performance boosted")
except ImportError:
    pass

from dotenv import load_dotenv
load_dotenv()  # Load .env file

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, Text, select, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

# Config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://starktrade:starktrade@localhost:5432/starktrade")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Database with connection pooling
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,    pool_pre_ping=True,
    pool_recycle=3600,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), default="free")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    risk_tolerance = Column(Numeric, default=5)
    strategy = Column(String(50), default="all_weather")
    auto_trading_enabled = Column(Boolean, default=False)
    paper_trading_balance = Column(Numeric, default=100000)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime)

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(255), default="Paper Trading")
    total_value = Column(Numeric, default=100000)
    cash_balance = Column(Numeric, default=100000)
    daily_pnl = Column(Numeric, default=0)
    total_pnl = Column(Numeric, default=0)
    is_paper = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Trade(Base):
    __tablename__ = "trades"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(UUID(as_uuid=True), nullable=False)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)
    quantity = Column(Numeric, nullable=False)
    entry_price = Column(Numeric)
    stop_loss = Column(Numeric)
    take_profit = Column(Numeric)
    status = Column(String(20), default="pending")
    pnl = Column(Numeric)
    reasoning = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class SiteConfig(Base):
    __tablename__ = "site_config"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text)

# Schemas
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

# Auth helpers
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        async with async_session() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                raise HTTPException(status_code=401, detail="User not found")
            return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_db():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except:
            await session.rollback()
            raise

# App
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="StarkTrade AI", version="1.0.0", lifespan=lifespan)

# GZip compression for faster responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.get("/api/health")
async def health():
    return {"status": "operational", "service": "StarkTrade AI", "version": "1.0.0"}

@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # First user = admin
    count = await db.execute(select(func.count(User.id)))
    is_first = count.scalar() == 0
    
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="admin" if is_first else "free",
        is_active=True,
        is_verified=is_first,
    )
    db.add(user)
    await db.flush()
    
    # Create portfolio
    portfolio = Portfolio(user_id=user.id, name="Paper Trading", total_value=100000, cash_balance=100000)
    db.add(portfolio)
    await db.flush()
    
    token = create_token({"sub": str(user.id)})
    refresh = create_token({"sub": str(user.id)}, timedelta(days=7))
    
    return TokenResponse(access_token=token, refresh_token=refresh, expires_in=1800)

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    
    user.last_login_at = datetime.utcnow()
    
    token = create_token({"sub": str(user.id)})
    refresh = create_token({"sub": str(user.id)}, timedelta(days=7))
    
    return TokenResponse(access_token=token, refresh_token=refresh, expires_in=1800)

@app.get("/api/v1/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
        "risk_tolerance": current_user.risk_tolerance,
        "strategy": current_user.strategy,
        "auto_trading_enabled": current_user.auto_trading_enabled,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }

@app.get("/api/v1/portfolio/")
async def get_portfolios(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.user_id == current_user.id))
    portfolios = result.scalars().all()
    return [{
        "id": str(p.id),
        "name": p.name,
        "total_value": float(p.total_value),
        "cash_balance": float(p.cash_balance),
        "daily_pnl": float(p.daily_pnl),
        "total_pnl": float(p.total_pnl),
        "is_paper": p.is_paper,
    } for p in portfolios]

@app.get("/api/v1/trades/")
async def get_trades(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    )
    portfolios = result.scalars().all()
    portfolio_ids = [p.id for p in portfolios]
    
    if not portfolio_ids:
        return []
    
    result = await db.execute(
        select(Trade).where(Trade.portfolio_id.in_(portfolio_ids)).order_by(Trade.created_at.desc()).limit(20)
    )
    trades = result.scalars().all()
    return [{
        "id": str(t.id),
        "symbol": t.symbol,
        "side": t.side,
        "quantity": float(t.quantity),
        "entry_price": float(t.entry_price) if t.entry_price else None,
        "stop_loss": float(t.stop_loss) if t.stop_loss else None,
        "status": t.status,
        "pnl": float(t.pnl) if t.pnl else None,
        "reasoning": t.reasoning,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    } for t in trades]

@app.get("/api/v1/admin/stats")
async def admin_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users_count = await db.execute(select(func.count(User.id)))
    trades_count = await db.execute(select(func.count(Trade.id)))
    
    return {
        "total_users": users_count.scalar() or 0,
        "total_trades": trades_count.scalar() or 0,
        "total_aum": 2400000,
    }

@app.get("/api/v1/admin/users")
async def admin_users(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [{
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "auto_trading_enabled": u.auto_trading_enabled,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]

@app.get("/api/v1/admin/config")
async def admin_config(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(select(SiteConfig))
    configs = result.scalars().all()
    return {c.key: {"value": c.value, "description": c.description or ""} for c in configs}

# Market data endpoints (mock)
@app.get("/api/v1/market/pulse")
async def market_pulse():
    return [
        {"symbol": "S&P 500", "price": "5,234.18", "change": "+0.42%", "positive": True},
        {"symbol": "NASDAQ", "price": "16,742.39", "change": "+0.67%", "positive": True},
        {"symbol": "BTC", "price": "$67,500", "change": "+2.31%", "positive": True},
        {"symbol": "ETH", "price": "$3,450", "change": "+1.89%", "positive": True},
        {"symbol": "Gold", "price": "$2,340", "change": "-0.12%", "positive": False},
        {"symbol": "VIX", "price": "14.2", "change": "-3.2%", "positive": True},
    ]

@app.get("/api/v1/agents/")
async def agents_status():
    return [
        {"name": "System 2 (Strategic)", "status": "active", "role": "Regime Detection"},
        {"name": "Researcher", "status": "active", "role": "News & Sentiment"},
        {"name": "Strategist", "status": "active", "role": "Value Analysis"},
        {"name": "Quant", "status": "active", "role": "Technical Signals"},
        {"name": "Fundamentalist", "status": "active", "role": "Financial Analysis"},
        {"name": "Risk Manager", "status": "active", "role": "Gatekeeper"},
        {"name": "Learner", "status": "idle", "role": "Weekly Review"},
    ]

@app.get("/api/v1/predictions/markets")
async def predictions():
    return [
        {"id": "1", "title": "Will BTC hit $100K by June 2026?", "category": "Crypto", "yes_price": 0.67, "volume": 45230, "status": "open"},
        {"id": "2", "title": "Fed rate cut in Q2 2026?", "category": "Economics", "yes_price": 0.42, "volume": 128500, "status": "open"},
        {"id": "3", "title": "NVDA earnings beat estimates?", "category": "Tech", "yes_price": 0.78, "volume": 67890, "status": "open"},
    ]

# ============================================================
# AUTOTRADING ROUTES
# ============================================================

@app.get("/api/v1/autotrading/status")
async def autotrading_status():
    from app.agents.autotrading import engine
    return engine.get_status()

@app.post("/api/v1/autotrading/start")
async def autotrading_start():
    from app.agents.autotrading import engine
    engine.config.enabled = True
    result = await engine.start()
    return result

@app.post("/api/v1/autotrading/stop")
async def autotrading_stop():
    from app.agents.autotrading import engine
    result = await engine.stop()
    return result

@app.get("/api/v1/autotrading/trades")
async def autotrading_trades(limit: int = 50):
    from app.agents.autotrading import engine
    return {"trades": engine.trade_history[-limit:], "total": len(engine.trade_history)}

# ============================================================
# AGENT COUNCIL ROUTES
# ============================================================

@app.post("/api/v1/agents/analyze")
async def agents_analyze(request: Request):
    """Run AI agent council analysis on a symbol."""
    from app.agents.trading_agents import run_agent_council
    body = await request.json()
    symbol = body.get("symbol", "SPY")
    market_data = body.get("market_data", {"price": 100, "change": 0})
    result = await run_agent_council(symbol, market_data)
    return result

# ============================================================
# STRIPE/BILLING ROUTES (Mock for now)
# ============================================================

@app.get("/api/v1/billing/config")
async def billing_config():
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
    return {
        "publishable_key": os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        "stripe_configured": bool(stripe_key),
        "prices": {
            "pro": {"monthly": 29.99, "price_id": "price_pro_monthly"},
            "enterprise": {"monthly": 199, "price_id": "price_enterprise_monthly"},
        }
    }

@app.post("/api/v1/billing/create-checkout")
async def create_checkout(request: Request):
    body = await request.json()
    plan = body.get("plan", "pro")
    
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
    
    if stripe_key:
        try:
            import stripe
            stripe.api_key = stripe_key
            
            price_id = os.getenv("STRIPE_PRO_PRICE_ID", "") if plan == "pro" else os.getenv("STRIPE_ENTERPRISE_PRICE_ID", "")
            
            if not price_id:
                return {"error": "Price ID not configured", "demo_url": f"https://checkout.stripe.com/demo/{plan}"}
            
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                mode="subscription",
                success_url="https://starktrade-ai.vercel.app/dashboard?success=true",
                cancel_url="https://starktrade-ai.vercel.app/pricing",
            )
            return {"url": session.url}
        except Exception as e:
            return {"error": str(e), "demo_url": f"https://checkout.stripe.com/demo/{plan}"}
    
    return {
        "demo_url": f"https://checkout.stripe.com/demo/{plan}",
        "message": "Set STRIPE_SECRET_KEY to enable real payments"
    }

# ============================================================
# PAYSTACK PAYMENT ROUTES
# ============================================================

@app.get("/api/v1/paystack/config")
async def paystack_config():
    paystack_key = os.getenv("PAYSTACK_SECRET_KEY", "")
    return {
        "public_key": os.getenv("PAYSTACK_PUBLIC_KEY", ""),
        "currency": "ZAR",
        "configured": bool(paystack_key),
        "plans": {
            "pro": {"name": "Pro Autopilot", "amount": 499, "display": "R499/month"},
            "enterprise": {"name": "Enterprise", "amount": 3299, "display": "R3,299/month"},
        }
    }

@app.post("/api/v1/paystack/initialize")
async def paystack_initialize(request: Request):
    body = await request.json()
    email = body.get("email", "")
    plan = body.get("plan", "pro")
    
    paystack_key = os.getenv("PAYSTACK_SECRET_KEY", "")
    
    amounts = {"pro": 49900, "enterprise": 329900}
    
    if paystack_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.paystack.co/transaction/initialize",
                    headers={
                        "Authorization": f"Bearer {paystack_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "email": email,
                        "amount": amounts.get(plan, 49900),
                        "currency": "ZAR",
                        "callback_url": "https://starktrade-ai.vercel.app/dashboard?payment=success",
                        "channels": ["card", "bank", "ussd", "mobile_money", "bank_transfer"]
                    }
                )
                return response.json()
        except Exception as e:
            return {"status": False, "message": str(e)}
    
    return {
        "status": True,
        "message": "Demo mode",
        "data": {
            "authorization_url": f"https://checkout.paystack.com/demo/{plan}",
            "reference": f"demo_{datetime.utcnow().timestamp()}"
        }
    }

@app.get("/api/v1/paystack/verify/{reference}")
async def paystack_verify(reference: str):
    paystack_key = os.getenv("PAYSTACK_SECRET_KEY", "")
    
    if paystack_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.paystack.co/transaction/verify/{reference}",
                    headers={"Authorization": f"Bearer {paystack_key}"}
                )
                return response.json()
        except Exception as e:
            return {"status": False, "message": str(e)}
    
    return {"status": True, "data": {"status": "success", "reference": reference}}

# ============================================================
# BROKER/ALPACA ROUTES
# ============================================================

@app.get("/api/v1/broker/status")
async def broker_status():
    alpaca_key = os.getenv("ALPACA_API_KEY", "")
    alpaca_url = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
    
    if not alpaca_key:
        return {
            "connected": False,
            "mode": "not_configured",
            "message": "Set ALPACA_API_KEY to enable live trading"
        }
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{alpaca_url}/v2/account",
                headers={
                    "APCA-API-KEY-ID": alpaca_key,
                    "APCA-API-SECRET-KEY": os.getenv("ALPACA_SECRET_KEY", ""),
                }
            )
            
            if response.status_code == 200:
                account = response.json()
                return {
                    "connected": True,
                    "mode": "paper" if "paper" in alpaca_url else "live",
                    "account_status": account.get("status"),
                    "buying_power": account.get("buying_power"),
                    "portfolio_value": account.get("portfolio_value"),
                }
            else:
                return {"connected": False, "error": response.text}
    except Exception as e:
        return {"connected": False, "error": str(e)}

# ─── PAYFAST PAYMENT GATEWAY ─────────────────────────────────────────────────
import hashlib
import urllib.parse
import urllib.request

PAYFAST_MERCHANT_ID = os.getenv("PAYFAST_MERCHANT_ID", "34411889")
PAYFAST_MERCHANT_KEY = os.getenv("PAYFAST_MERCHANT_KEY", "3zkl5gmlic8d6")
PAYFAST_PASSPHRASE = os.getenv("PAYFAST_PASSPHRASE", "")
PAYFAST_SANDBOX = os.getenv("PAYFAST_SANDBOX", "false").lower() == "true"
PAYFAST_URL = "https://sandbox.payfast.co.za/eng/process" if PAYFAST_SANDBOX else "https://www.payfast.co.za/eng/process"
PAYFAST_VALIDATE_URL = "https://www.payfast.co.za/eng/query/validate"

PRICING = {
    "pro": {"name": "StarkTrade AI Pro", "amount": 499.00, "description": "Pro plan - Monthly", "features": ["Unlimited signals", "Advanced AI analysis", "Priority support", "WhatsApp alerts"]},
    "enterprise": {"name": "StarkTrade AI Enterprise", "amount": 3299.00, "description": "Enterprise plan - Monthly", "features": ["Everything in Pro", "Custom strategies", "API access", "Dedicated support"]},
}

def generate_payfast_signature(data: dict, passphrase: str = "") -> str:
    param_string = ""
    for key in sorted(data.keys()):
        value = str(data[key]).strip()
        if value:
            param_string += f"{key}={urllib.parse.quote_plus(value)}&"
    param_string = param_string.rstrip("&")
    if passphrase:
        param_string += f"&passphrase={urllib.parse.quote_plus(passphrase)}"
    return hashlib.md5(param_string.encode()).hexdigest()

@app.get("/api/payfast/plans")
async def payfast_plans():
    return {"plans": [{"id": k, "name": v["name"], "amount": v["amount"], "currency": "ZAR", "description": v["description"], "features": v["features"]} for k, v in PRICING.items()]}

@app.post("/api/payfast/create")
async def payfast_create(request: Request):
    body = await request.json()
    plan_id = body.get("plan_id", "").lower()
    plan = PRICING.get(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan_id}")

    payment_id = f"stark_{body.get('user_id', '')}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    data = {
        "merchant_id": PAYFAST_MERCHANT_ID,
        "merchant_key": PAYFAST_MERCHANT_KEY,
        "return_url": "https://starktrade-ai.vercel.app/payment/success",
        "cancel_url": "https://starktrade-ai.vercel.app/payment/cancel",
        "notify_url": "https://starktrade-ai.vercel.app/api/payfast/itn",
        "name_first": body.get("first_name", ""),
        "name_last": body.get("last_name", ""),
        "email_address": body.get("email", ""),
        "m_payment_id": payment_id,
        "amount": f"{plan['amount']:.2f}",
        "item_name": plan["name"],
        "item_description": plan["description"],
        "custom_str1": body.get("user_id", ""),
        "custom_str2": plan_id,
    }
    data = {k: v for k, v in data.items() if v}
    data["signature"] = generate_payfast_signature(data, PAYFAST_PASSPHRASE)
    payment_url = f"{PAYFAST_URL}?{urllib.parse.urlencode(data)}"
    return {"success": True, "payment_url": payment_url, "payment_id": payment_id, "amount": plan["amount"], "plan_name": plan["name"]}

@app.post("/api/payfast/itn")
async def payfast_itn(request: Request):
    form_data = await request.form()
    itn_data = {k: v for k, v in form_data.items()}
    received_sig = itn_data.pop("signature", "")
    calculated_sig = generate_payfast_signature(itn_data, PAYFAST_PASSPHRASE)
    if received_sig != calculated_sig:
        return {"status": "error", "message": "Invalid signature"}
    # Validate with PayFast
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(PAYFAST_VALIDATE_URL, data=itn_data)
            if resp.text.strip() != "VALID":
                return {"status": "error", "message": "Validation failed"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    payment_status = itn_data.get("payment_status", "")
    user_id = itn_data.get("custom_str1", "")
    plan_id = itn_data.get("custom_str2", "")
    print(f"PayFast ITN: status={payment_status}, user={user_id}, plan={plan_id}")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
