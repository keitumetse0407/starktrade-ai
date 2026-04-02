"""SQLAlchemy ORM models."""
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text, DateTime, JSON, ForeignKey, Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.sql import func
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), nullable=False, default="free")
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    two_factor_enabled = Column(Boolean, nullable=False, default=False)
    risk_tolerance = Column(Integer, nullable=False, default=5)
    strategy = Column(String(50), nullable=False, default="all_weather")
    auto_trading_enabled = Column(Boolean, nullable=False, default=False)
    paper_trading_balance = Column(Numeric(15, 2), nullable=False, default=100000)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login_at = Column(DateTime(timezone=True))


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, default="Default Portfolio")
    total_value = Column(Numeric(15, 2), nullable=False, default=0)
    cash_balance = Column(Numeric(15, 2), nullable=False, default=0)
    daily_pnl = Column(Numeric(15, 2), nullable=False, default=0)
    total_pnl = Column(Numeric(15, 2), nullable=False, default=0)
    total_return_pct = Column(Numeric(8, 4), nullable=False, default=0)
    sharpe_ratio = Column(Numeric(8, 4))
    max_drawdown_pct = Column(Numeric(8, 4))
    beta = Column(Numeric(8, 4))
    win_rate = Column(Numeric(5, 2))
    is_paper = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Trade(Base):
    __tablename__ = "trades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    asset_class = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)
    quantity = Column(Numeric(15, 8), nullable=False)
    entry_price = Column(Numeric(15, 8))
    exit_price = Column(Numeric(15, 8))
    stop_loss = Column(Numeric(15, 8))
    take_profit = Column(Numeric(15, 8))
    status = Column(String(20), nullable=False, default="pending", index=True)
    risk_score = Column(Integer)
    conviction_score = Column(Integer)
    pnl = Column(Numeric(15, 2))
    pnl_pct = Column(Numeric(8, 4))
    fees = Column(Numeric(10, 4), default=0)
    reasoning = Column(Text)
    executed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Composite index for dashboard queries (user's recent trades)
    __table_args__ = (
        # Index for: "get all executed trades for a portfolio, ordered by date"
        {'comment': 'Trades table - composite index on (portfolio_id, created_at) for dashboard queries'},
    )


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    persona = Column(String(100), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False, default="idle")
    weight = Column(Numeric(5, 2), nullable=False, default=1.0)
    total_trades = Column(Integer, nullable=False, default=0)
    winning_trades = Column(Integer, nullable=False, default=0)
    total_pnl = Column(Numeric(15, 2), nullable=False, default=0)
    avg_confidence = Column(Numeric(5, 2))
    performance_score = Column(Numeric(5, 2))
    current_task = Column(Text)
    last_active_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    trade_id = Column(UUID(as_uuid=True), ForeignKey("trades.id", ondelete="SET NULL"))
    decision_type = Column(String(50), nullable=False)
    symbol = Column(String(50))
    reasoning = Column(Text, nullable=False)
    confidence = Column(Numeric(5, 2), nullable=False)
    vote = Column(String(20))
    data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSONB)
    read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("portfolios.id", ondelete="CASCADE"))
    level = Column(String(20), nullable=False)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    action_taken = Column(String(255))
    auto_resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PredictionMarket(Base):
    __tablename__ = "prediction_markets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    yes_price = Column(Numeric(10, 4), nullable=False, default=0.5)
    no_price = Column(Numeric(10, 4), nullable=False, default=0.5)
    yes_pool = Column(Numeric(15, 2), nullable=False, default=0)
    no_pool = Column(Numeric(15, 2), nullable=False, default=0)
    total_volume = Column(Numeric(15, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="open")
    resolution = Column(String(10))
    closes_at = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SiteConfig(Base):
    __tablename__ = "site_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
