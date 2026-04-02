"""Market Data API routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.market_data import get_ohlcv, get_market_pulse

router = APIRouter()


@router.get("/ohlcv")
async def get_ohlcv_data(
    symbol: str = Query(...),
    timeframe: str = Query("1d"),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    data = await get_ohlcv(db, symbol, timeframe, limit)
    return {"symbol": symbol, "timeframe": timeframe, "data": data}


@router.get("/pulse")
async def market_pulse():
    return await get_market_pulse()


@router.get("/search")
async def search_symbols(q: str = Query(..., min_length=1)):
    from app.services.market_data import search_symbols as _search
    return await _search(q)
