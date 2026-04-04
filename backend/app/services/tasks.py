"""Celery task definitions."""
import asyncio
import uuid
from app.services.celery_app import celery_app


@celery_app.task(name="execute_trade")
def execute_trade_task(trade_id: str):
    """Execute a pending trade via async execution service."""
    from app.services.execution import execute_trade
    # Convert string to UUID if needed
    try:
        tid = uuid.UUID(trade_id) if isinstance(trade_id, str) else trade_id
    except ValueError:
        return {"status": "error", "reason": f"Invalid UUID: {trade_id}"}
    
    # Celery is sync, execution service is async — use asyncio.run() carefully
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(execute_trade(str(tid)))
        return result
    finally:
        loop.close()


@celery_app.task(name="run_agent_pipeline")
def run_agent_pipeline():
    """Run the full multi-agent analysis pipeline on top symbols."""
    from app.agents.orchestrator import run_pipeline
    symbols = ["SPY", "QQQ", "GLD", "BTC-USD"]
    
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        results = []
        for symbol in symbols:
            result = loop.run_until_complete(run_pipeline(symbol))
            results.append({"symbol": symbol, **result})
        return {"status": "completed", "results": results}
    finally:
        loop.close()


@celery_app.task(name="update_portfolio_metrics")
def update_portfolio_metrics():
    """Recalculate portfolio metrics for all active portfolios."""
    import asyncio
    return asyncio.run(_update_metrics())


@celery_app.task(name="generate_daily_digest")
def generate_daily_digest():
    """Generate daily performance digest for all users."""
    return asyncio.run(_send_digests())


@celery_app.task(name="run_weekly_learning")
def run_weekly_learning():
    """Run weekly learning module — review trades, adjust weights."""
    from app.agents.learner import run_weekly_review
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(run_weekly_review())
        return result
    finally:
        loop.close()


async def _update_metrics():
    """Update portfolio metrics using proper SQL aggregates."""
    from app.db.session import async_session_factory
    from app.db.models import Portfolio, Trade
    from sqlalchemy import select, func
    
    async with async_session_factory() as db:
        result = await db.execute(
            select(Portfolio).where(Portfolio.is_paper == False)
        )
        portfolios = result.scalars().all()

        for p in portfolios:
            # Count total executed trades (no non-existent total_trades field)
            trades_result = await db.execute(
                select(
                    func.count(Trade.id).label("total"),
                    func.coalesce(func.sum(Trade.pnl), 0).label("total_pnl"),
                    func.coalesce(func.sum(
                        func.case((Trade.pnl > 0, 1), else_=0)
                    ), 0).label("wins"),
                ).where(
                    Trade.portfolio_id == p.id,
                    Trade.status == "executed",
                )
            )
            row = trades_result.one()
            total = row[0] or 0
            if total > 0:
                p.total_pnl = float(row[1] or 0)
                p.win_rate = (float(row[2] or 0) / total) * 100
                # Calculate total return % from cash balance
                if p.cash_balance and p.cash_balance > 0:
                    p.total_return_pct = (float(p.total_pnl) / float(p.cash_balance)) * 100

        await db.commit()
    return {"status": "metrics_updated", "count": len(portfolios)}


async def _send_digests():
    """Send daily email/notification digest to active users."""
    from app.db.session import async_session_factory
    from app.db.models import User, Portfolio, Notification
    from sqlalchemy import select
    
    async with async_session_factory() as db:
        result = await db.execute(
            select(User).where(User.is_active == True, User.is_verified == True)
        )
        users = result.scalars().all()
        
        sent = 0
        for user in users:
            # Get user's portfolio summary
            pf_result = await db.execute(
                select(Portfolio).where(
                    Portfolio.user_id == user.id
                ).limit(1)
            )
            portfolio = pf_result.scalar_one_or_none()
            
            if portfolio:
                notification = Notification(
                    user_id=user.id,
                    type="daily_digest",
                    title="Daily Portfolio Update",
                    message=f"Portfolio: {portfolio.total_value:.2f} | P&L: {portfolio.daily_pnl:.2f} | Win rate: {portfolio.win_rate or 0:.1f}%",
                )
                db.add(notification)
                sent += 1
        
        await db.commit()
    
    return {"status": "digest_sent", "count": sent}
