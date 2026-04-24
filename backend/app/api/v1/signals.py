"""Signals API — Generate, send, track, and review AI trading signals."""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Signal, SignalPerformance
from app.core.auth import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/signals", tags=["signals"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────

class SignalGenerateRequest(BaseModel):
    symbol: str = Field(default="GLD", description="Yahoo Finance ticker (GLD = SPDR Gold Shares)")
    force: bool = Field(default=False, description="Force regeneration even if recent signal exists")


class SignalVote(BaseModel):
    agent: str
    vote: str
    confidence: float
    reasoning: str


class SignalResponse(BaseModel):
    id: str
    symbol: str
    direction: str
    entry_price: Optional[float]
    stop_loss: Optional[float]
    take_profit_1: Optional[float]
    take_profit_2: Optional[float]
    position_size_pct: Optional[float]
    risk_amount: Optional[float]
    rrr: Optional[float]
    confidence: Optional[float]
    consensus_score: Optional[str]
    regime: Optional[str]
    trend_direction: Optional[str]
    agent_votes: Optional[List[SignalVote]]
    rationale: Optional[str]
    invalidation: Optional[str]
    status: str
    generated_at: str
    sent_at: Optional[str]

    class Config:
        from_attributes = True


class SignalHistoryItem(BaseModel):
    id: str
    symbol: str
    direction: str
    entry_price: Optional[float]
    stop_loss: Optional[float]
    take_profit_1: Optional[float]
    take_profit_2: Optional[float]
    confidence: Optional[float]
    consensus_score: Optional[str]
    regime: Optional[str]
    status: str
    outcome_pnl_pct: Optional[float]
    generated_at: str

    class Config:
        from_attributes = True


class SignalPerformanceResponse(BaseModel):
    total_signals: int
    buy_signals: int
    sell_signals: int
    watch_signals: int
    no_trade_signals: int
    wins: int
    losses: int
    win_rate_pct: Optional[float]
    avg_win_pct: Optional[float]
    avg_loss_pct: Optional[float]
    profit_factor: Optional[float]
    sharpe_ratio: Optional[float]
    max_drawdown_pct: Optional[float]
    period_start: str
    period_end: str


class SignalSendRequest(BaseModel):
    signal_id: str = Field(..., description="UUID of the generated signal")
    channel: str = Field(default="api", description="Delivery channel: telegram, discord, whatsapp, api, email")


class SignalOutcomeRequest(BaseModel):
    signal_id: str
    pnl_pct: float = Field(..., description="Actual PnL percentage of the trade")
    notes: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────

def _signal_to_dict(row: Signal) -> dict:
    """Convert a Signal ORM row to a dict for the response."""
    return {
        "id": str(row.id),
        "symbol": row.symbol,
        "direction": row.direction,
        "entry_price": float(row.entry_price) if row.entry_price else None,
        "stop_loss": float(row.stop_loss) if row.stop_loss else None,
        "take_profit_1": float(row.take_profit_1) if row.take_profit_1 else None,
        "take_profit_2": float(row.take_profit_2) if row.take_profit_2 else None,
        "position_size_pct": float(row.position_size_pct) if row.position_size_pct else None,
        "risk_amount": float(row.risk_amount) if row.risk_amount else None,
        "rrr": float(row.rrr) if row.rrr else None,
        "confidence": float(row.confidence) if row.confidence else None,
        "consensus_score": row.consensus_score,
        "regime": row.regime,
        "trend_direction": row.trend_direction,
        "agent_votes": row.agent_votes,
        "rationale": row.rationale,
        "invalidation": row.invalidation,
        "status": row.status,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
        "sent_at": row.sent_at.isoformat() if row.sent_at else None,
    }


def _history_to_dict(row: Signal) -> dict:
    return {
        "id": str(row.id),
        "symbol": row.symbol,
        "direction": row.direction,
        "entry_price": float(row.entry_price) if row.entry_price else None,
        "stop_loss": float(row.stop_loss) if row.stop_loss else None,
        "take_profit_1": float(row.take_profit_1) if row.take_profit_1 else None,
        "take_profit_2": float(row.take_profit_2) if row.take_profit_2 else None,
        "confidence": float(row.confidence) if row.confidence else None,
        "consensus_score": row.consensus_score,
        "regime": row.regime,
        "status": row.status,
        "outcome_pnl_pct": float(row.outcome_pnl_pct) if row.outcome_pnl_pct else None,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("/generate", response_model=SignalResponse)
async def generate_signal(
    req: SignalGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """
    Run the full multi-agent pipeline and generate a new signal.

    This calls SignalOrchestrator.generate_signal() which:
      1. Fetches market data from Yahoo Finance
      2. Calculates 34+ technical indicators
      3. Runs RegimeDetector, QuantAgent, SentimentAgent, PatternAgent
      4. Reaches consensus (≥3/4 agree → trade)
      5. Builds trade plan with RiskAgent
      6. Returns formatted signal
    """
    # Run the engine
    from engine.orchestrator import SignalOrchestrator
    from engine.data_collector import GoldDataCollector
    from engine.indicators import TechnicalIndicators

    collector = GoldDataCollector(req.symbol)
    raw = collector.get_historical_data(period="2y", interval="1d")
    if raw.empty:
        raise HTTPException(status_code=502, detail=f"Failed to fetch data for {req.symbol}")

    indicators = TechnicalIndicators()
    df = indicators.calculate_all(raw)
    df = df.dropna()

    if len(df) < 50:
        raise HTTPException(status_code=500, detail=f"Insufficient data after indicators ({len(df)} rows)")

    orchestrator = SignalOrchestrator()
    signal = orchestrator.generate_signal(df)

    # Convert agent votes to serializable format
    agent_votes_data = [
        {
            "agent": v.agent,
            "vote": v.vote,
            "confidence": v.confidence,
            "reasoning": v.reasoning,
        }
        for v in signal.agent_votes
    ]

    # Save to DB
    db_signal = Signal(
        symbol=signal.symbol,
        direction=signal.direction,
        entry_price=signal.entry if signal.entry > 0 else None,
        stop_loss=signal.stop_loss if signal.stop_loss > 0 else None,
        take_profit_1=signal.take_profit_1 if signal.take_profit_1 > 0 else None,
        take_profit_2=signal.take_profit_2 if signal.take_profit_2 > 0 else None,
        position_size_pct=signal.position_size_pct if signal.position_size_pct > 0 else None,
        risk_amount=signal.risk_amount if signal.risk_amount > 0 else None,
        rrr=signal.rrr if signal.rrr > 0 else None,
        confidence=signal.confidence,
        consensus_score=signal.consensus_score,
        regime=signal.regime,
        trend_direction=signal.direction if signal.direction in ("BUY", "SELL") else None,
        agent_votes=agent_votes_data,
        rationale=signal.rationale,
        invalidation=signal.invalidation,
        message_text=signal.message,
        status="generated",
    )
    db.add(db_signal)
    await db.commit()
    await db.refresh(db_signal)

    return _signal_to_dict(db_signal)


@router.get("/", response_model=List[SignalHistoryItem])
async def get_signals(
    limit: int = Query(default=20, le=100),
    symbol: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get signals - optionally filtered by symbol and status."""
    stmt = select(Signal).order_by(Signal.generated_at.desc()).limit(limit)
    if symbol:
        stmt = stmt.where(Signal.symbol == symbol)
    if status:
        stmt = stmt.where(Signal.status == status)
    result = await db.execute(stmt)
    signals = result.scalars().all()
    return [_signal_to_dict(s) for s in signals]


@router.get("/latest", response_model=SignalResponse)
async def get_latest_signal(
    symbol: str = Query(default="XAUUSD"),
    db: AsyncSession = Depends(get_db),
):
    """Get the most recent signal for a symbol."""
    stmt = select(Signal).where(Signal.symbol == symbol).order_by(Signal.generated_at.desc()).limit(1)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail=f"No signals found for {symbol}")

    return _signal_to_dict(row)


@router.get("/history", response_model=List[SignalHistoryItem])
async def get_signal_history(
    symbol: str = Query(default="XAUUSD"),
    limit: int = Query(default=30, le=200),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get signal history for a symbol."""
    conditions = [Signal.symbol == symbol]
    if status:
        conditions.append(Signal.status == status)

    stmt = (
        select(Signal)
        .where(and_(*conditions))
        .order_by(Signal.generated_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [_history_to_dict(r) for r in rows]


@router.get("/performance", response_model=SignalPerformanceResponse)
async def get_signal_performance(
    days: int = Query(default=30, description="Lookback period in days"),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate signal performance over the lookback period."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = select(Signal).where(
        and_(
            Signal.generated_at >= since,
            Signal.direction.in_(["BUY", "SELL"]),  # Only count actionable signals
        )
    )
    result = await db.execute(stmt)
    signals = result.scalars().all()

    total = len(signals)
    buys = sum(1 for s in signals if s.direction == "BUY")
    sells = sum(1 for s in signals if s.direction == "SELL")
    watches = sum(1 for s in signals if s.direction == "WATCH")
    no_trades = sum(1 for s in signals if s.direction == "NO_TRADE")

    # Wins/losses from closed signals
    closed = [s for s in signals if s.status in ("closed_win", "closed_loss") and s.outcome_pnl_pct is not None]
    wins = sum(1 for s in closed if s.outcome_pnl_pct > 0)
    losses = sum(1 for s in closed if s.outcome_pnl_pct <= 0)

    win_rate = (wins / len(closed) * 100) if closed else None
    avg_win = (sum(s.outcome_pnl_pct for s in closed if s.outcome_pnl_pct > 0) / wins) if wins else None
    avg_loss = (sum(s.outcome_pnl_pct for s in closed if s.outcome_pnl_pct <= 0) / losses) if losses else None

    gross_profit = sum(s.outcome_pnl_pct for s in closed if s.outcome_pnl_pct > 0) if wins else 0
    gross_loss = abs(sum(s.outcome_pnl_pct for s in closed if s.outcome_pnl_pct <= 0)) if losses else 0
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else None

    return SignalPerformanceResponse(
        total_signals=total,
        buy_signals=buys,
        sell_signals=sells,
        watch_signals=watches,
        no_trade_signals=no_trades,
        wins=wins,
        losses=losses,
        win_rate_pct=round(win_rate, 2) if win_rate else None,
        avg_win_pct=round(avg_win, 4) if avg_win else None,
        avg_loss_pct=round(avg_loss, 4) if avg_loss else None,
        profit_factor=round(profit_factor, 4) if profit_factor else None,
        sharpe_ratio=None,  # Requires daily returns series — computed separately
        max_drawdown_pct=None,  # Requires equity curve — computed separately
        period_start=since.isoformat(),
        period_end=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/send", response_model=dict)
async def send_signal(
    req: SignalSendRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """
    Mark a signal as sent via the specified channel.

    For Telegram: sends the signal message to the configured channel.
    For other channels: marks as delivered (actual delivery handled externally).
    """
    signal_id = uuid.UUID(req.signal_id)
    stmt = select(Signal).where(Signal.id == signal_id)
    result = await db.execute(stmt)
    signal = result.scalar_one_or_none()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    if signal.status != "generated":
        raise HTTPException(status_code=400, detail=f"Signal already in '{signal.status}' status")

    if req.channel == "telegram":
        # Send via Telegram
        try:
            from engine.telegram import send_signal_to_channel
            message_id = await send_signal_to_channel(signal.message_text)
            signal.telegram_message_id = str(message_id)
        except ImportError:
            logger.warning("Telegram module not available — marking as sent without delivery")
        except Exception as e:
            logger.error(f"Failed to send signal via Telegram: {e}")
            raise HTTPException(status_code=502, detail=f"Telegram delivery failed: {str(e)}")

    elif req.channel == "discord":
        # Send via Discord webhook
        try:
            from engine.discord_notifier import send_signal_to_discord
            message_id = await send_signal_to_discord(signal.message_text)
            signal.delivered_via = "discord"
        except ImportError:
            logger.warning("Discord module not available — marking as sent without delivery")
        except Exception as e:
            logger.error(f"Failed to send signal via Discord: {e}")
            raise HTTPException(status_code=502, detail=f"Discord delivery failed: {str(e)}")

    signal.status = "sent"
    signal.delivered_via = req.channel
    signal.sent_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(signal)

    return {
        "success": True,
        "signal_id": str(signal.id),
        "channel": req.channel,
        "sent_at": signal.sent_at.isoformat(),
        "status": signal.status,
    }


@router.post("/outcome", response_model=dict)
async def record_outcome(
    req: SignalOutcomeRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """
    Record the actual outcome of a signal after the trade closes.

    This is critical for tracking real performance and building credibility.
    """
    signal_id = uuid.UUID(req.signal_id)
    stmt = select(Signal).where(Signal.id == signal_id)
    result = await db.execute(stmt)
    signal = result.scalar_one_or_none()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    if signal.status not in ("sent", "active"):
        raise HTTPException(status_code=400, detail=f"Cannot record outcome for '{signal.status}' signal")

    signal.outcome_pnl_pct = req.pnl_pct
    signal.outcome_notes = req.notes
    signal.status = "closed_win" if req.pnl_pct > 0 else "closed_loss"
    signal.closed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(signal)

    return {
        "success": True,
        "signal_id": str(signal.id),
        "pnl_pct": req.pnl_pct,
        "result": "WIN" if req.pnl_pct > 0 else "LOSS",
        "status": signal.status,
    }


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific signal by ID."""
    try:
        uid = uuid.UUID(signal_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signal ID")

    stmt = select(Signal).where(Signal.id == uid)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="Signal not found")

    return _signal_to_dict(row)
