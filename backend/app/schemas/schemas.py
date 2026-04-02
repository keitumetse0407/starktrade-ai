"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ============================================================
# Auth
# ============================================================
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_verified: bool
    risk_tolerance: int
    strategy: str
    auto_trading_enabled: bool
    created_at: datetime


# ============================================================
# Portfolio
# ============================================================
class PortfolioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    total_value: float
    cash_balance: float
    daily_pnl: float
    total_pnl: float
    total_return_pct: float
    sharpe_ratio: Optional[float]
    max_drawdown_pct: Optional[float]
    beta: Optional[float]
    win_rate: Optional[float]
    is_paper: bool


# ============================================================
# Trades
# ============================================================
class TradeCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=50)
    asset_class: str
    side: str
    quantity: float = Field(gt=0)
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class TradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    symbol: str
    asset_class: str
    side: str
    quantity: float
    entry_price: Optional[float]
    exit_price: Optional[float]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    status: str
    risk_score: Optional[int]
    conviction_score: Optional[int]
    pnl: Optional[float]
    reasoning: Optional[str]
    created_at: datetime


# ============================================================
# Agents
# ============================================================
class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    persona: str
    description: Optional[str]
    status: str
    weight: float
    total_trades: int
    winning_trades: int
    total_pnl: float
    performance_score: Optional[float]
    current_task: Optional[str]


class AgentDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    agent_id: str
    decision_type: str
    symbol: Optional[str]
    reasoning: str
    confidence: float
    vote: Optional[str]
    created_at: datetime


# ============================================================
# Settings
# ============================================================
class RiskSettings(BaseModel):
    risk_tolerance: int = Field(ge=1, le=10)
    strategy: str
    max_drawdown_pct: float = Field(ge=1, le=50)
    daily_loss_limit_pct: float = Field(ge=0.5, le=20)
    auto_trading_enabled: bool


# ============================================================
# Prediction Markets
# ============================================================
class PredictionMarketCreate(BaseModel):
    title: str = Field(min_length=10, max_length=500)
    description: Optional[str] = None
    category: str
    closes_at: datetime


class PredictionMarketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: Optional[str]
    category: str
    yes_price: float
    no_price: float
    total_volume: float
    status: str
    closes_at: datetime


class PredictionTrade(BaseModel):
    market_id: str
    side: str = Field(pattern="^(yes|no)$")
    quantity: float = Field(gt=0)


# ============================================================
# WebSocket Messages
# ============================================================
class WSMessage(BaseModel):
    type: str
    payload: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# Pagination
# ============================================================
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    has_next: bool
