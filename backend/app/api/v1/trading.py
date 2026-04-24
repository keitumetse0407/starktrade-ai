"""
Multi-Broker API Endpoints
=======================
Unified trading interface with kill switch.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel

from app.brokers.base import (
    BrokerType, TradingMode, BrokerConfig, create_broker, BrokerBase
)
from app.brokers.pdt import PDTManager, PositionSizer, KillSwitch, PDTStatus


# Broker instances (singleton per worker)
_broker: Optional[BrokerBase] = None
_pdt_manager: Optional[PDTManager] = None
_position_sizer: Optional[PositionSizer] = None
_kill_switch: Optional[KillSwitch] = None


router = APIRouter(prefix="/broker", tags=["broker"])


# Request/Response models
class BrokerConnectRequest(BaseModel):
    broker_type: str = "alpaca"
    api_key: str
    api_secret: str
    trading_mode: str = "paper"  # paper | live


class OrderRequest(BaseModel):
    symbol: str
    side: str  # buy | sell
    quantity: float
    order_type: str = "market"
    time_in_force: str = "day"
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


class PDTCheckResponse(BaseModel):
    can_trade: bool
    status: str
    day_trades_in_5_days: int
    max_day_trades: int
    trades_remaining: int
    reason: str


def get_broker() -> BrokerBase:
    """Dependency to get broker instance."""
    global _broker
    if _broker is None:
        raise HTTPException(400, "Broker not connected. Call /broker/connect first.")
    return _broker


@router.post("/connect")
async def connect_broker(request: BrokerConnectRequest):
    """Connect to a broker."""
    global _broker, _pdt_manager, _position_sizer, _kill_switch
    
    try:
        broker_type = BrokerType(request.broker_type)
    except ValueError:
        raise HTTPException(400, f"Invalid broker_type: {request.broker_type}")
    
    try:
        trading_mode = TradingMode(request.trading_mode)
    except ValueError:
        raise HTTPException(400, f"Invalid trading_mode: {request.trading_mode}")
    
    config = BrokerConfig(
        broker_type=broker_type,
        api_key=request.api_key,
        api_secret=request.api_secret,
        base_url="https://paper-api.alpaca.markets" if trading_mode == TradingMode.PAPER else "https://api.alpaca.markets",
        trading_mode=trading_mode,
    )
    
    _broker = create_broker(config)
    
    # Test connection
    if not await _broker.connect():
        raise HTTPException(400, "Failed to connect to broker")
    
    # Initialize managers
    _pdt_manager = PDTManager(_broker)
    _position_sizer = PositionSizer(_broker)
    _kill_switch = KillSwitch(_broker)
    
    return {
        "connected": True,
        "broker": request.broker_type,
        "mode": request.trading_mode,
    }


@router.get("/status")
async def broker_status():
    """Get broker connection status."""
    broker = get_broker()
    
    account = await broker.get_account()
    
    return {
        "connected": True,
        "broker": broker.config.broker_type.value,
        "mode": broker.config.trading_mode.value,
        "account_id": account.account_id,
        "buying_power": account.buying_power,
        "equity": account.equity,
        "pattern_day_trader": account.pattern_day_trader,
        "day_trade_count": account.day_trade_count,
    }


@router.get("/account")
async def get_account():
    """Get account details."""
    broker = get_broker()
    account = await broker.get_account()
    
    return {
        "account_id": account.account_id,
        "buying_power": account.buying_power,
        "cash": account.cash,
        "portfolio_value": account.portfolio_value,
        "equity": account.equity,
        "pattern_day_trader": account.pattern_day_trader,
        "day_trade_count": account.day_trade_count,
    }


@router.get("/positions")
async def get_positions():
    """Get current positions."""
    broker = get_broker()
    positions = await broker.get_positions()
    
    return [
        {
            "symbol": p.symbol,
            "quantity": p.quantity,
            "avg_entry_price": p.avg_entry_price,
            "market_value": p.market_value,
            "unrealized_pl": p.unrealized_pl,
            "unrealized_plpc": p.unrealized_plpc,
        }
        for p in positions
    ]


@router.post("/order")
async def place_order(request: OrderRequest):
    """Place an order with PDT checks."""
    broker = get_broker()
    
    # Check PDT
    can_trade, reason = await _pdt_manager.can_day_trade()
    if not can_trade:
        raise HTTPException(403, reason)
    
    # Calculate position size if not provided
    if request.quantity <= 0:
        size = await _position_sizer.calculate_size(
            request.symbol,
            request.limit_price or 0,
        )
        request.quantity = size
    
    # Check risk limits
    can_trade, reason = await _position_sizer.check_risk_limits()
    if not can_trade:
        raise HTTPException(403, reason)
    
    # Place order
    order = await broker.place_order(
        symbol=request.symbol,
        side=request.side,
        quantity=request.quantity,
        order_type=request.order_type,
        time_in_force=request.time_in_force,
        limit_price=request.limit_price,
        stop_price=request.stop_price,
    )
    
    return {
        "order_id": order.order_id,
        "symbol": order.symbol,
        "side": order.side,
        "quantity": order.quantity,
        "status": order.status,
    }


@router.delete("/order/{order_id}")
async def cancel_order(order_id: str):
    """Cancel an order."""
    broker = get_broker()
    success = await broker.cancel_order(order_id)
    
    if not success:
        raise HTTPException(400, "Failed to cancel order")
    
    return {"status": "cancelled", "order_id": order_id}


@router.get("/orders")
async def get_orders(status: str = "all", limit: int = 50):
    """Get order history."""
    broker = get_broker()
    
    # This would need a method on broker
    return {"status": "not_implemented"}


# PDT Endpoints
@router.get("/pdt/status", response_model=PDTCheckResponse)
async def pdt_status():
    """Get PDT status."""
    if _pdt_manager is None:
        raise HTTPException(400, "Broker not connected")
    
    state = await _pdt_manager.get_state()
    
    return PDTCheckResponse(
        can_trade=state.status != PDTStatus.LOCKED,
        status=state.status.value,
        day_trades_in_5_days=state.day_trades_in_5_days,
        max_day_trades=state.max_day_trades,
        trades_remaining=state.trades_remaining,
        reason=f"{state.trades_remaining} day trades remaining" if not state.pattern_day_trader else "PDT account",
    )


@router.get("/pdt/check")
async def pdt_check():
    """Check if day trade is allowed."""
    if _pdt_manager is None:
        raise HTTPException(400, "Broker not connected")
    
    can_trade, reason = await _pdt_manager.can_day_trade()
    
    return {
        "can_trade": can_trade,
        "reason": reason,
    }


# Kill Switch Endpoints
@router.post("/kill")
async def trigger_kill_switch(reason: str = "Manual emergency trigger"):
    """Trigger kill switch - close all positions immediately."""
    if _kill_switch is None:
        raise HTTPException(400, "Broker not connected")
    
    if _kill_switch.is_triggered:
        return {
            "already_triggered": True,
            "trigger_time": _kill_switch.trigger_time,
            "reason": _kill_switch.reason,
        }
    
    closed = await _kill_switch.trigger(reason)
    
    return {
        "triggered": True,
        "trigger_time": _kill_switch.trigger_time,
        "reason": reason,
        "positions_closed": len(closed),
    }


@router.get("/kill/status")
async def kill_switch_status():
    """Get kill switch status."""
    if _kill_switch is None:
        return {"triggered": False}
    
    return {
        "triggered": _kill_switch.is_triggered,
        "trigger_time": _kill_switch.trigger_time,
        "reason": _kill_switch.reason,
    }


@router.post("/kill/reset")
async def reset_kill_switch():
    """Reset kill switch."""
    if _kill_switch is None:
        raise HTTPException(400, "Broker not connected")
    
    _kill_switch.reset()
    
    return {"status": "reset"}


# Position Sizing
@router.get("/size/{symbol}")
async def calculate_position_size(symbol: str, entry_price: float, stop_loss_pct: float = 0.02):
    """Calculate optimal position size."""
    if _position_sizer is None:
        raise HTTPException(400, "Broker not connected")
    
    size = await _position_sizer.calculate_size(
        symbol=symbol,
        entry_price=entry_price,
        stop_loss_pct=stop_loss_pct,
    )
    
    account = await _broker.get_account()
    
    return {
        "symbol": symbol,
        "shares": size,
        "estimated_cost": size * entry_price,
        "max_position_pct": _position_sizer.max_position_pct,
        "account_equity": account.equity,
    }