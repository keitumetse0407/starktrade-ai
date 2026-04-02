"""
StarkTrade AI — Simplified Backend for VPS Deployment
Works without heavy dependencies (langchain, torch, etc.)
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
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

# Database
engine = create_async_engine(DATABASE_URL, echo=False)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
