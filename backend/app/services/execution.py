"""Trade execution service."""
import uuid
from decimal import Decimal
from app.core.config import settings
from app.db.session import async_session_factory
from app.db.models import Trade


async def queue_trade_execution(trade_id: uuid.UUID):
    """Queue a trade for execution via Celery."""
    from app.services.celery_app import celery_app
    celery_app.send_task("execute_trade", args=[str(trade_id)])


async def execute_trade(trade_id: str):
    """Execute a trade against the trading engine."""
    async with async_session_factory() as db:
        from sqlalchemy import select
        result = await db.execute(select(Trade).where(Trade.id == trade_id))
        trade = result.scalar_one_or_none()

        if not trade:
            return {"error": "Trade not found"}

        if trade.status != "pending":
            return {"error": f"Trade already {trade.status}"}

        trade.status = "approved"

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.TRADING_ENGINE_WS_URL.replace('/ws', '')}/api/execute",
                    json={
                        "symbol": trade.symbol,
                        "side": trade.side,
                        "quantity": str(trade.quantity),
                        "type": "market",
                    },
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    trade.status = "executed"
                    trade.entry_price = Decimal(str(data.get("fill_price", 0)))
                    trade.executed_at = data.get("executed_at")
                else:
                    trade.status = "failed"
        except Exception as e:
            trade.status = "failed"

        await db.commit()
        return {"trade_id": trade_id, "status": trade.status}
