"""Prediction Markets API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from app.db.session import get_db
from app.db.models import User, PredictionMarket, PredictionPosition
from app.core.auth import get_current_user
from app.schemas.schemas import (
    PredictionMarketCreate, PredictionMarketResponse, PredictionTrade,
)

router = APIRouter()

FEE_RATE = Decimal("0.02")


@router.get("/markets", response_model=list[PredictionMarketResponse])
async def get_markets(
    category: str = Query(None),
    status: str = Query("open"),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(PredictionMarket)
    if category:
        query = query.where(PredictionMarket.category == category)
    if status:
        query = query.where(PredictionMarket.status == status)
    query = query.order_by(PredictionMarket.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/markets", response_model=PredictionMarketResponse, status_code=201)
async def create_market(
    data: PredictionMarketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    market = PredictionMarket(
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        closes_at=data.closes_at,
    )
    db.add(market)
    await db.flush()
    return market


@router.post("/trade")
async def place_prediction_trade(
    data: PredictionTrade,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PredictionMarket).where(PredictionMarket.id == data.market_id)
    )
    market = result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    if market.status != "open":
        raise HTTPException(status_code=400, detail="Market is closed")

    # AMM pricing: constant product x*y=k
    yes_pool = Decimal(str(market.yes_pool))
    no_pool = Decimal(str(market.no_pool))
    qty = Decimal(str(data.quantity))
    k = max(yes_pool * no_pool, Decimal("1"))

    if data.side == "yes":
        new_yes_pool = yes_pool + qty
        new_no_pool = k / new_yes_pool
        cost = qty
        market.yes_pool = new_yes_pool
        market.no_pool = new_no_pool
        market.yes_price = new_no_pool / (new_yes_pool + new_no_pool)
        market.no_price = new_yes_pool / (new_yes_pool + new_no_pool)
    else:
        new_no_pool = no_pool + qty
        new_yes_pool = k / new_no_pool
        cost = qty
        market.no_pool = new_no_pool
        market.yes_pool = new_yes_pool
        market.yes_price = new_no_pool / (new_yes_pool + new_no_pool)
        market.no_price = new_yes_pool / (new_yes_pool + new_no_pool)

    market.total_volume += cost

    position = PredictionPosition(
        user_id=current_user.id,
        market_id=data.market_id,
        side=data.side,
        quantity=qty,
        avg_price=Decimal(str(market.yes_price if data.side == "yes" else market.no_price)),
        current_price=Decimal(str(market.yes_price if data.side == "yes" else market.no_price)),
    )
    db.add(position)
    await db.flush()

    return {
        "position_id": str(position.id),
        "side": data.side,
        "quantity": float(qty),
        "avg_price": float(position.avg_price),
        "fee": float(cost * FEE_RATE),
        "market_yes_price": float(market.yes_price),
        "market_no_price": float(market.no_price),
    }
