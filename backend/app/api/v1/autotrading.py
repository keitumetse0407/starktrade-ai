"""
Autotrading API Routes
========================
Control the autotrading engine via API.
"""

from fastapi import APIRouter, HTTPException
from app.agents.autotrading import engine, TradingConfig

router = APIRouter()


@router.get("/status")
async def get_autotrading_status():
    """Get autotrading engine status."""
    return engine.get_status()


@router.post("/start")
async def start_autotrading():
    """Start the autotrading engine."""
    result = await engine.start()
    return result


@router.post("/stop")
async def stop_autotrading():
    """Stop the autotrading engine."""
    result = await engine.stop()
    return result


@router.post("/config")
async def update_autotrading_config(config: dict):
    """Update autotrading configuration."""
    result = engine.update_config(**config)
    return {"status": "updated", "config": result}


@router.get("/trades")
async def get_autotrading_trades(limit: int = 50):
    """Get autotrading trade history."""
    return {
        "trades": engine.trade_history[-limit:],
        "total": len(engine.trade_history)
    }
