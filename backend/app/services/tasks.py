"""Celery task definitions."""
from app.services.celery_app import celery_app


@celery_app.task(name="execute_trade")
def execute_trade_task(trade_id: str):
    """Execute a pending trade."""
    import asyncio
    from app.services.execution import execute_trade
    return asyncio.run(execute_trade(trade_id))


@celery_app.task(name="run_agent_pipeline")
def run_agent_pipeline():
    """Run the full multi-agent analysis pipeline."""
    import asyncio
    from app.agents.orchestrator import run_pipeline
    return asyncio.run(run_pipeline())


@celery_app.task(name="update_portfolio_metrics")
def update_portfolio_metrics():
    """Recalculate portfolio metrics for all active portfolios."""
    import asyncio
    return asyncio.run(_update_metrics())


@celery_app.task(name="generate_daily_digest")
def generate_daily_digest():
    """Generate daily performance digest for all users."""
    return {"status": "digest_generated"}


@celery_app.task(name="run_weekly_learning")
def run_weekly_learning():
    """Run weekly learning module — review trades, adjust weights."""
    import asyncio
    from app.agents.learner import run_weekly_review
    return asyncio.run(run_weekly_review())


async def _update_metrics():
    from app.db.session import async_session_factory
    from app.db.models import Portfolio
    from sqlalchemy import select

    async with async_session_factory() as db:
        result = await db.execute(select(Portfolio).where(Portfolio.is_paper == False))
        portfolios = result.scalars().all()

        for p in portfolios:
            # Recalculate metrics (simplified)
            from sqlalchemy import func as sql_func
            from app.db.models import Trade
            trades_result = await db.execute(
                select(
                    sql_func.count(Trade.id),
                    sql_func.sum(Trade.pnl),
                    sql_func.sum(Trade.pnl).filter(Trade.pnl > 0),
                ).where(
                    Trade.portfolio_id == p.id,
                    Trade.status == "executed",
                )
            )
            row = trades_result.one()
            if row[0] > 0:
                p.total_trades = row[0]
                p.total_pnl = float(row[1] or 0)
                p.win_rate = (float(row[2] or 0) / max(float(row[1] or 1), 1)) * 100

        await db.commit()
    return {"status": "metrics_updated", "count": len(portfolios)}
