"""Portfolio API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User, Portfolio, Position, Trade
from app.core.auth import get_current_user
from app.schemas.schemas import PortfolioResponse

router = APIRouter()


@router.get("/", response_model=list[PortfolioResponse])
async def get_portfolios(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id,
        )
    )
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio


@router.post("/create", response_model=PortfolioResponse, status_code=201)
async def create_portfolio(
    name: str = "Default Portfolio",
    is_paper: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    portfolio = Portfolio(
        user_id=current_user.id,
        name=name,
        cash_balance=current_user.paper_trading_balance if is_paper else 0,
        total_value=current_user.paper_trading_balance if is_paper else 0,
        is_paper=is_paper,
    )
    db.add(portfolio)
    await db.flush()
    return portfolio
