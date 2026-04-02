"""
Alpaca Broker Integration
============================
Connect to Alpaca for live trading with real money.
Paper trading mode available for testing.
"""

import os
import httpx
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User, Portfolio, Trade

router = APIRouter()

# Alpaca config
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY", "")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY", "")
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")

HEADERS = {
    "APCA-API-KEY-ID": ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    "Content-Type": "application/json"
}


@router.get("/status")
async def alpaca_status():
    """Check Alpaca connection status."""
    if not ALPACA_API_KEY:
        return {"connected": False, "mode": "not_configured", "message": "Set ALPACA_API_KEY to enable"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{ALPACA_BASE_URL}/v2/account", headers=HEADERS)
            
            if response.status_code == 200:
                account = response.json()
                return {
                    "connected": True,
                    "mode": "paper" if "paper" in ALPACA_BASE_URL else "live",
                    "account_status": account.get("status"),
                    "buying_power": account.get("buying_power"),
                    "portfolio_value": account.get("portfolio_value"),
                }
            else:
                return {"connected": False, "error": response.text}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@router.get("/account")
async def get_account():
    """Get Alpaca account details."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{ALPACA_BASE_URL}/v2/account", headers=HEADERS)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        return response.json()


@router.get("/positions")
async def get_positions():
    """Get current positions."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{ALPACA_BASE_URL}/v2/positions", headers=HEADERS)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        return response.json()


@router.post("/order")
async def place_order(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Place an order through Alpaca.
    
    Body:
    {
        "symbol": "AAPL",
        "qty": 1,
        "side": "buy",
        "type": "market",
        "time_in_force": "day",
        "stop_loss": 150.00,
        "take_profit": 160.00
    }
    """
    body = await request.json()
    
    # Validate required fields
    required = ["symbol", "qty", "side", "type"]
    for field in required:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Prepare order
    order_data = {
        "symbol": body["symbol"],
        "qty": str(body["qty"]),
        "side": body["side"],
        "type": body["type"],
        "time_in_force": body.get("time_in_force", "day"),
    }
    
    # Add stop loss / take profit if provided
    if body.get("stop_loss"):
        order_data["stop_loss"] = {"limit_price": str(body["stop_loss"])}
    
    if body.get("take_profit"):
        order_data["take_profit"] = {"limit_price": str(body["take_profit"])}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{ALPACA_BASE_URL}/v2/orders",
            headers=HEADERS,
            json=order_data
        )
        
        if response.status_code not in [200, 201]:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        order_result = response.json()
        
        # Save to database
        trade = Trade(
            portfolio_id=body.get("portfolio_id", "00000000-0000-0000-0000-000000000000"),
            symbol=body["symbol"],
            side=body["side"],
            quantity=body["qty"],
            entry_price=float(order_result.get("limit_price") or 0),
            stop_loss=body.get("stop_loss"),
            take_profit=body.get("take_profit"),
            status=order_result.get("status", "pending"),
            reasoning=body.get("reasoning", "AI agent trade"),
        )
        db.add(trade)
        await db.commit()
        
        return order_result


@router.get("/orders")
async def get_orders(status: str = "all", limit: int = 50):
    """Get order history."""
    params = {"status": status, "limit": limit}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{ALPACA_BASE_URL}/v2/orders",
            headers=HEADERS,
            params=params
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        return response.json()


@router.delete("/order/{order_id}")
async def cancel_order(order_id: str):
    """Cancel an open order."""
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{ALPACA_BASE_URL}/v2/orders/{order_id}",
            headers=HEADERS
        )
        
        if response.status_code == 204:
            return {"status": "cancelled"}
        else:
            raise HTTPException(status_code=response.status_code, detail=response.text)


@router.get("/market/{symbol}")
async def get_market_data(symbol: str):
    """Get latest market data for a symbol."""
    async with httpx.AsyncClient() as client:
        # Get latest quote
        quote_response = await client.get(
            f"{ALPACA_BASE_URL}/v2/stocks/{symbol}/quotes/latest",
            headers=HEADERS
        )
        
        # Get latest trade
        trade_response = await client.get(
            f"{ALPACA_BASE_URL}/v2/stocks/{symbol}/trades/latest",
            headers=HEADERS
        )
        
        return {
            "symbol": symbol,
            "quote": quote_response.json() if quote_response.status_code == 200 else None,
            "latest_trade": trade_response.json() if trade_response.status_code == 200 else None,
        }
