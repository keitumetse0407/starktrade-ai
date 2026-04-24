"""
WebSocket Routes — Real-Time Agent Feed
========================================
The "wow" feature. Investors and users see AI agents working in real-time.

Broadcasts:
- /api/v1/ws/agents — Agent activity, votes, regime, consensus
- /api/v1/ws/live — Market ticks, portfolio updates, trade executions
- /api/v1/ws/state — Current agent state (reconciliation on reconnect)
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from jose import JWTError, jwt
from app.core.config import settings
from app.db.session import async_session_factory
from app.db.models import User, Signal
from app.services.ws_manager import ConnectionManager

manager = ConnectionManager()

router = APIRouter()


AGENT_DEFINITIONS = [
    {"id": "quant", "name": "Quant Agent", "role": "ML Price Prediction", "emoji": "📊"},
    {"id": "sentiment", "name": "Sentiment Agent", "role": "News & Social Sentiment", "emoji": "🗞️"},
    {"id": "pattern", "name": "Pattern Agent", "role": "Technical Patterns", "emoji": "📈"},
    {"id": "risk", "name": "Risk Agent", "role": "Portfolio Risk", "emoji": "🛡️"},
    {"id": "regime", "name": "Regime Detector", "role": "Market Regime", "emoji": "🌊"},
    {"id": "orchestrator", "name": "Orchestrator", "role": "Consensus Engine", "emoji": "⚡"},
    {"id": "context", "name": "Context Memory", "role": "Persistent Learning", "emoji": "🧠"},
]


async def authenticate_ws(token: str) -> dict | None:
    """Authenticate WebSocket connection via JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        if not user_id:
            return None
        return {"user_id": user_id, "token_payload": payload}
    except JWTError:
        return None


@router.websocket("/live")
async def websocket_live(websocket: WebSocket):
    """Real-time market data + portfolio updates."""
    token = websocket.query_params.get("token")
    user_info = await authenticate_ws(token) if token else None
    
    await manager.connect(websocket, "live", user_info)
    
    try:
        await manager.send_personal(websocket, {
            "type": "connected",
            "room": "live",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "authenticated": user_info is not None,
        })
        
        market_task = asyncio.create_task(send_market_pulses(websocket))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "subscribe":
                symbols = message.get("symbols", [])
                await manager.send_personal(websocket, {
                    "type": "subscribed",
                    "symbols": symbols,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            
            elif message.get("type") == "ping":
                await manager.send_personal(websocket, {
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, "live")
    except Exception as e:
        manager.disconnect(websocket, "live")
    finally:
        if 'market_task' in locals():
            market_task.cancel()


@router.websocket("/agents")
async def websocket_agents(websocket: WebSocket):
    """Real-time agent activity feed — THE WOW FEATURE."""
    token = websocket.query_params.get("token")
    user_info = await authenticate_ws(token) if token else None
    
    await manager.connect(websocket, "agents", user_info)
    
    try:
        await manager.send_personal(websocket, {
            "type": "connected",
            "room": "agents",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "authenticated": user_info is not None,
            "message": "Agent activity feed connected. Watching 7 agents...",
        })
        
        agent_task = asyncio.create_task(simulate_agent_activity(websocket))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await manager.send_personal(websocket, {
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            
            elif message.get("type") == "sync":
                await send_agent_state_sync(websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, "agents")
    except Exception as e:
        manager.disconnect(websocket, "agents")
    finally:
        if 'agent_task' in locals():
            agent_task.cancel()


@router.get("/state")
async def get_agent_state():
    """REST endpoint for state reconciliation on WebSocket reconnect."""
    latest_signal = None
    async with async_session_factory() as db:
        from sqlalchemy import select
        from app.db.models import Signal
        result = await db.execute(
            select(Signal).order_by(Signal.created_at.desc()).limit(1)
        )
        row = result.scalar_one_or_none()
        if row:
            latest_signal = {
                "id": str(row.id),
                "symbol": row.symbol,
                "direction": row.direction,
                "confidence": float(row.confidence) if row.confidence else 0,
                "regime": row.regime,
                "timestamp": row.created_at.isoformat() if row.created_at else None,
            }
    
    return {
        "agents": AGENT_DEFINITIONS,
        "regime": {"regime": "SIDEWAYS", "confidence": 72, "lastUpdate": datetime.now(timezone.utc).isoformat()},
        "latest_signal": latest_signal,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def send_agent_state_sync(websocket: WebSocket):
    """Send current agent state for reconciliation."""
    state = await get_agent_state()
    await manager.send_personal(websocket, {
        "type": "state_sync",
        **state,
    })


async def send_market_pulses(websocket: WebSocket):
    """Send market pulses every 30 seconds."""
    import random
    
    prices = {"BTC": 67500, "ETH": 3450, "SPY": 523, "GOLD": 2340, "VIX": 16.5}
    
    try:
        while True:
            for symbol, base_price in prices.items():
                change = random.gauss(0, base_price * 0.0005)
                prices[symbol] += change
                
                await manager.send_personal(websocket, {
                    "type": "tick",
                    "symbol": symbol,
                    "price": round(prices[symbol], 2),
                    "change": round(change, 2),
                    "changePct": round((change / prices[symbol]) * 100, 4),
                    "volume": random.randint(100, 10000),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            
            await asyncio.sleep(30)
    
    except asyncio.CancelledError:
        pass


async def simulate_agent_activity(websocket: WebSocket):
    """Simulate real-time agent decisions and activity."""
    import random
    
    symbols = ["NVDA", "AAPL", "MSFT", "BTC", "ETH"]
    regimes = ["BULL", "BEAR", "SIDEWAYS", "TRANSITION"]
    votes_list = ["BUY", "SELL", "HOLD"]
    
    for agent in AGENT_DEFINITIONS:
        await manager.send_personal(websocket, {
            "type": "agent_status",
            "agent": agent["id"],
            "role": agent["role"],
            "emoji": agent["emoji"],
            "status": random.choice(["idle", "active"]),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await asyncio.sleep(0.2)
    
    try:
        cycle = 0
        while True:
            cycle += 1
            
            await manager.send_personal(websocket, {
                "type": "agent_activity",
                "activity_type": "analysis_start",
                "agent": "orchestrator",
                "emoji": "⚡",
                "activity": f"Starting analysis cycle #{cycle}",
                "priority": "high",
                "symbol": random.choice(symbols),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            for i, agent in enumerate(AGENT_DEFINITIONS):
                await manager.send_personal(websocket, {
                    "type": "agent_status",
                    "agent": agent["id"],
                    "status": "analyzing",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                await asyncio.sleep(1.5)
                
                vote = random.choice(votes_list)
                conf = random.randint(60, 95)
                
                await manager.send_personal(websocket, {
                    "type": "agent_activity",
                    "activity_type": "vote_cast",
                    "agent": agent["id"],
                    "emoji": agent["emoji"],
                    "activity": f"Voting {vote} at {conf}% confidence",
                    "priority": "medium",
                    "symbol": random.choice(symbols),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                
                await manager.send_personal(websocket, {
                    "type": "agent_vote",
                    "agent": agent["id"],
                    "vote": vote,
                    "confidence": conf,
                    "reasoning": f"{agent['name']} analysis complete",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            
            regime = random.choice(regimes)
            await manager.send_personal(websocket, {
                "type": "regime_change",
                "regime": regime,
                "confidence": random.randint(55, 95),
                "message": f"System 2 detected: {regime} regime",
                "priority": "high",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            buy_cnt = random.randint(1, 5)
            sell_cnt = random.randint(0, 3)
            hold_cnt = 7 - buy_cnt - sell_cnt
            decision = "BUY" if buy_cnt > sell_cnt else "SELL" if sell_cnt > buy_cnt else "HOLD"
            
            await manager.send_personal(websocket, {
                "type": "consensus",
                "finalDecision": decision,
                "totalBuy": buy_cnt,
                "totalSell": sell_cnt,
                "totalHold": hold_cnt,
                "avgConfidence": random.randint(65, 90),
                "reasoning": f"Council consensus: {buy_cnt}B/{sell_cnt}S/{hold_cnt}H",
                "riskApproved": random.random() > 0.1,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            await manager.send_personal(websocket, {
                "type": "agent_activity",
                "activity_type": "analysis_complete",
                "agent": "orchestrator",
                "emoji": "⚡",
                "activity": f"Analysis complete: {decision}",
                "priority": "high",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            await asyncio.sleep(15)
    
    except asyncio.CancelledError:
        pass


async def broadcast_agent_activity(activity: dict):
    """Broadcast agent activity to all connected clients."""
    await manager.broadcast("agents", {
        "type": "agent_activity",
        **activity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_trade_notification(trade: dict):
    """Broadcast trade execution to all connected clients."""
    await manager.broadcast("live", {
        "type": "trade_executed",
        **trade,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_regime_change(regime: str, confidence: float):
    """Broadcast HRM System 2 regime change."""
    await manager.broadcast("agents", {
        "type": "regime_change",
        "regime": regime,
        "confidence": confidence,
        "message": f"System 2 detected regime change: {regime} ({confidence:.0%} confidence)",
        "priority": "critical",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })