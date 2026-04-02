"""Trades API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.db.models import User, Trade, Portfolio
from app.core.auth import get_current_user
from app.schemas.schemas import TradeCreate, TradeResponse

router = APIRouter()


@router.get("/", response_model=list[TradeResponse])
async def get_trades(
    portfolio_id: str = Query(None),
    status: str = Query(None),
    symbol: str = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Trade)
        .join(Portfolio)
        .where(Portfolio.user_id == current_user.id)
    )

    if portfolio_id:
        query = query.where(Trade.portfolio_id == portfolio_id)
    if status:
        query = query.where(Trade.status == status)
    if symbol:
        query = query.where(Trade.symbol == symbol)

    query = query.order_by(Trade.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trade)
        .join(Portfolio)
        .where(Trade.id == trade_id, Portfolio.user_id == current_user.id)
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.post("/", response_model=TradeResponse, status_code=201)
async def create_trade(
    data: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.auto_trading_enabled:
        raise HTTPException(status_code=403, detail="Auto-trading is disabled")

    result = await db.execute(
        select(Portfolio).where(
            Portfolio.user_id == current_user.id,
            Portfolio.is_paper == True,
        )
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="No paper portfolio found")

    trade = Trade(
        portfolio_id=portfolio.id,
        symbol=data.symbol,
        asset_class=data.asset_class,
        side=data.side,
        quantity=data.quantity,
        stop_loss=data.stop_loss,
        take_profit=data.take_profit,
        status="pending",
    )
    db.add(trade)
    await db.flush()

    from app.services.execution import queue_trade_execution
    await queue_trade_execution(trade.id)

    return trade
