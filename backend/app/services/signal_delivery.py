"""
Signal Delivery Service — Telegram + Database Persistence
==================================================
Saves finalized signals to PostgreSQL and sends to Telegram channel.
Includes Celery Beat tasks for cleanup.

Security: This service is internal-only (not exposed as API endpoint).
Triggered only from within the Orchestrator execution flow.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_factory
from app.db.models import Signal, SignalPerformance
from app.api.v1.ws import manager

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
RETENTION_DAYS = 30


async def deliver_signal(
    symbol: str,
    direction: str,
    entry_price: Optional[float],
    stop_loss: Optional[float],
    take_profit_1: Optional[float],
    take_profit_2: Optional[float],
    position_size_pct: Optional[float],
    risk_amount: Optional[float],
    rrr: Optional[float],
    confidence: float,
    consensus_score: str,
    regime: str,
    trend_direction: str,
    agent_votes: dict,
    rationale: str,
    invalidation: Optional[str],
    internal_trigger: bool = False,
) -> dict:
    """
    Save signal to database and broadcast via Telegram.
    
    INTERNAL ONLY - Must be called with internal_trigger=True
    from the Orchestrator. Public API endpoints are disabled
    for security.
    """
    if not internal_trigger:
        raise PermissionError("Signal delivery must be triggered internally")
    
    timestamp = datetime.now(timezone.utc)
    
    message_text = format_telegram_message(
        symbol, direction, confidence, regime, rationale
    )
    
    telegram_message_id = None
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        telegram_message_id = await send_telegram_message(message_text)
    
    async with async_session_factory() as db:
        signal = Signal(
            symbol=symbol,
            direction=direction,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit_1=take_profit_1,
            take_profit_2=take_profit_2,
            position_size_pct=position_size_pct,
            risk_amount=risk_amount,
            rrr=rrr,
            confidence=confidence,
            consensus_score=consensus_score,
            regime=regime,
            trend_direction=trend_direction,
            agent_votes=agent_votes,
            rationale=rationale,
            invalidation=invalidation,
            message_text=message_text,
            status="sent",
            delivered_via="telegram" if telegram_message_id else None,
            telegram_message_id=str(telegram_message_id) if telegram_message_id else None,
            sent_at=timestamp,
        )
        db.add(signal)
        await db.commit()
        await db.refresh(signal)
        
        signal_id = signal.id
        
        await db.execute(
            SignalPerformance.__table__.insert().values(
                total_signals=1,
                buy_signals=1 if direction == "BUY" else 0,
                sell_signals=1 if direction == "SELL" else 0,
                watch_signals=1 if direction == "WATCH" else 0,
                no_trade_signals=1 if direction == "NO_TRADE" else 0,
                period_start=timestamp,
                period_end=timestamp + timedelta(days=1),
            )
        )
        await db.commit()
    
    await manager.broadcast("agents", {
        "type": "signal_generated",
        "signal": {
            "id": str(signal_id),
            "symbol": symbol,
            "direction": direction,
            "confidence": confidence,
            "regime": regime,
            "timestamp": timestamp.isoformat(),
        }
    })
    
    return {"signal_id": str(signal_id), "telegram_sent": bool(telegram_message_id)}


async def send_telegram_message(text: str) -> Optional[int]:
    """Send message via Telegram Bot API."""
    import httpx
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return None
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True,
            })
            if r.status_code == 200:
                data = r.json()
                return data.get("result", {}).get("message_id")
    except Exception as e:
        print(f"[SignalDelivery] Telegram error: {e}")
    
    return None


def format_telegram_message(
    symbol: str,
    direction: str,
    confidence: float,
    regime: str,
    rationale: str,
) -> str:
    """Format signal for Telegram with emoji indicators."""
    
    direction_emoji = {
        "BUY": "🟢",
        "SELL": "🔴",
        "WATCH": "👀",
        "NO_TRADE": "⏸️",
    }.get(direction, "⚪")
    
    confidence_bar = "█" * int(confidence / 10) + "░" * (10 - int(confidence / 10))
    
    truncated_rationale = rationale[:200] + "..." if len(rationale) > 200 else rationale
    
    message = f"""
🤖 *STARKTRADE SIGNAL*

📊 {symbol} | {direction_emoji} *{direction}*

💡 Confidence: {confidence:.0f}%
{confidence_bar}

🌊 Regime: {regime.upper()}

📝 Reasoning:
_{truncated_rationale}_

⚠️ *Not financial advice. Past performance ≠ future results.*
"""
    
    return message.strip()


async def purge_old_signals(days: int = RETENTION_DAYS) -> int:
    """Celery task: Archive/purge signals older than retention period."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    async with async_session_factory() as db:
        result = await db.execute(
            select(Signal).where(
                Signal.created_at < cutoff,
                Signal.status.in_(["generated", "sent", "active"])
            )
        )
        signals = result.scalars().all()
        
        count = len(signals)
        
        for signal in signals:
            signal.status = "archived"
        
        await db.commit()
        
        print(f"[SignalDelivery] Archived {count} old signals")
        
        return count


from celery import shared_task

@shared_task(bind=True, name="signal_delivery.purge_old_signals")
def purge_old_signals_task(self, days: int = 30) -> int:
    """Celery Beat task: Archive/purge signals older than retention period."""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(purge_old_signals(days))
    finally:
        loop.close()

@shared_task(bind=True, name="signal_delivery.cleanup_cache")
def cleanup_redis_cache_task(self) -> int:
    """Celery Beat task: Clean up expired Redis cache."""
    from app.services.celery_app import redis_client
    
    if not redis_client:
        return 0
    
    count = 0
    try:
        for key in redis_client.scan_iter(match="*signal:*", count=1000):
            ttl = redis_client.ttl(key)
            if ttl <= 0:
                redis_client.delete(key)
                count += 1
    except Exception as e:
        print(f"[SignalDelivery] Redis cleanup error: {e}")
    
    print(f"[SignalDelivery] Cleaned {count} expired Redis keys")
    return count


async def get_signal_performance(days: int = 30) -> dict:
    """Get signal performance stats for backtesting."""
    start = datetime.now(timezone.utc) - timedelta(days=days)
    
    async with async_session_factory() as db:
        result = await db.execute(
            select(Signal).where(
                Signal.created_at >= start,
                Signal.status.in_(["closed_win", "closed_loss"])
            )
        )
        signals = result.scalars().all()
        
        if not signals:
            return {
                "total": 0,
                "win_rate": 0,
                "avg_win_pct": 0,
                "avg_loss_pct": 0,
            }
        
        wins = [s for s in signals if s.outcome_pnl_pct and s.outcome_pnl_pct > 0]
        losses = [s for s in signals if s.outcome_pnl_pct and s.outcome_pnl_pct <= 0]
        
        return {
            "total": len(signals),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": (len(wins) / len(signals)) * 100 if signals else 0,
            "avg_win_pct": sum(s.outcome_pnl_pct for s in wins) / len(wins) if wins else 0,
            "avg_loss_pct": abs(sum(s.outcome_pnl_pct for s in losses) / len(losses)) if losses else 0,
        }