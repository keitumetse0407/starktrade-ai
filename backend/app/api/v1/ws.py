"""
WebSocket Routes — Real-Time Agent Feed
=========================================
The "wow" feature. Investors and users see AI agents working in real-time.

Endpoints:
- /api/v1/ws/live — Real-time market data + portfolio updates
- /api/v1/ws/agents — Agent activity feed (decisions, reasoning, status)
"""

import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status
from jose import JWTError, jwt
from app.core.config import settings
from app.db.session import async_session_factory
from app.db.models import User

router = APIRouter()


# ============================================================
# CONNECTION MANAGER
# ============================================================
class ConnectionManager:
    """Manages WebSocket connections with room-based broadcasting."""
    
    def __init__(self):
        # Room → set of websockets
        self.rooms: Dict[str, Set[WebSocket]] = {
            "live": set(),
            "agents": set(),
        }
        # Track authenticated users
        self.user_sessions: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, room: str, user_info: dict = None):
        await websocket.accept()
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(websocket)
        if user_info:
            self.user_sessions[websocket] = user_info
        print(f"WS connected: {room} (total: {len(self.rooms[room])})")
    
    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.rooms:
            self.rooms[room].discard(websocket)
        self.user_sessions.pop(websocket, None)
        print(f"WS disconnected: {room} (remaining: {len(self.rooms.get(room, set()))})")
    
    async def broadcast(self, room: str, message: dict):
        """Send message to all connections in a room."""
        if room not in self.rooms:
            return
        
        dead_connections = set()
        message_str = json.dumps(message, default=str)
        
        for ws in self.rooms[room]:
            try:
                await ws.send_text(message_str)
            except Exception:
                dead_connections.add(ws)
        
        # Clean up dead connections
        for ws in dead_connections:
            self.rooms[room].discard(ws)
            self.user_sessions.pop(ws, None)
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send message to a specific connection."""
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception:
            pass
    
    def get_room_size(self, room: str) -> int:
        return len(self.rooms.get(room, set()))


manager = ConnectionManager()


# ============================================================
# AUTH HELPER
# ============================================================
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


# ============================================================
# LIVE MARKET DATA WEBSOCKET
# ============================================================
@router.websocket("/live")
async def websocket_live(websocket: WebSocket):
    """
    Real-time market data + portfolio updates.
    
    Client sends: {"type": "subscribe", "symbols": ["BTC", "ETH", "NVDA"]}
    Server sends: Market ticks, portfolio updates, trade notifications
    """
    # Authenticate
    token = websocket.query_params.get("token")
    user_info = await authenticate_ws(token) if token else None
    
    await manager.connect(websocket, "live", user_info)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal(websocket, {
            "type": "connected",
            "room": "live",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "authenticated": user_info is not None,
        })
        
        # Start market data simulation
        market_task = asyncio.create_task(simulate_market_data(websocket))
        
        # Listen for client messages
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


# ============================================================
# AGENT ACTIVITY FEED WEBSOCKET
# ============================================================
@router.websocket("/agents")
async def websocket_agents(websocket: WebSocket):
    """
    Real-time agent activity feed — THE WOW FEATURE.
    
    Shows in real-time:
    - Agent decisions (buy/sell/hold with reasoning)
    - Agent status changes (active/idle/busy)
    - Risk manager alerts
    - Signal generation process
    - HRM System 2 regime updates
    """
    # Authenticate
    token = websocket.query_params.get("token")
    user_info = await authenticate_ws(token) if token else None
    
    await manager.connect(websocket, "agents", user_info)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal(websocket, {
            "type": "connected",
            "room": "agents",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "authenticated": user_info is not None,
            "message": "Agent activity feed connected. Watching 7 agents...",
        })
        
        # Start agent simulation
        agent_task = asyncio.create_task(simulate_agent_activity(websocket))
        
        # Listen for client messages (heartbeat, filters, etc.)
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await manager.send_personal(websocket, {
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            
            elif message.get("type") == "filter":
                # Client can filter by agent, symbol, etc.
                await manager.send_personal(websocket, {
                    "type": "filter_applied",
                    "filters": message.get("filters", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, "agents")
    except Exception as e:
        manager.disconnect(websocket, "agents")
    finally:
        if 'agent_task' in locals():
            agent_task.cancel()


# ============================================================
# SIMULATION TASKS (Replace with real data in production)
# ============================================================

async def simulate_market_data(websocket: WebSocket):
    """Simulate real-time market data ticks."""
    import random
    
    prices = {
        "BTC": 67500.0,
        "ETH": 3450.0,
        "NVDA": 875.30,
        "AAPL": 198.50,
        "SPY": 523.40,
        "GOLD": 2340.0,
    }
    
    try:
        while True:
            for symbol, base_price in prices.items():
                # Random walk
                change = random.gauss(0, base_price * 0.001)
                prices[symbol] += change
                
                await manager.send_personal(websocket, {
                    "type": "tick",
                    "symbol": symbol,
                    "price": round(prices[symbol], 2),
                    "change": round(change, 2),
                    "change_pct": round((change / prices[symbol]) * 100, 4),
                    "volume": random.randint(100, 10000),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            
            await asyncio.sleep(1)  # 1 tick per second
    
    except asyncio.CancelledError:
        pass


async def simulate_agent_activity(websocket: WebSocket):
    """Simulate real-time agent decisions and activity."""
    import random
    
    agents = [
        {"name": "System 2", "role": "Strategic", "emoji": "🧠"},
        {"name": "Researcher", "role": "Analysis", "emoji": "🕵️"},
        {"name": "Strategist", "role": "Value", "emoji": "🎯"},
        {"name": "Quant", "role": "Technical", "emoji": "📊"},
        {"name": "Fundamentalist", "role": "Financials", "emoji": "🔍"},
        {"name": "Risk Manager", "role": "Gatekeeper", "emoji": "🛡️"},
        {"name": "Learner", "role": "Review", "emoji": "🎓"},
    ]
    
    activities = [
        "Analyzing {symbol} earnings call...",
        "RSI divergence detected on {symbol}",
        "Margin of safety: {pct}% — APPROVED",
        "Sharpe ratio signal: {val} — generating signal",
        "Position size: {pct}% of portfolio — APPROVED",
        "Trade executed: {side} {symbol} @ ${price}",
        "Monitoring VIX spike to {vix}...",
        "Regime detection: {regime} (confidence: {conf}%)",
        "Risk budget: {budget}% remaining",
        "Timeframe alignment: {alignment}",
    ]
    
    symbols = ["NVDA", "AAPL", "MSFT", "GOOGL", "BTC", "ETH", "SPY"]
    regimes = ["BULL", "BEAR", "SIDEWAYS", "TRANSITION"]
    
    try:
        # Send initial agent statuses
        for agent in agents:
            await manager.send_personal(websocket, {
                "type": "agent_status",
                "agent": agent["name"],
                "role": agent["role"],
                "emoji": agent["emoji"],
                "status": random.choice(["active", "idle", "active", "active"]),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            await asyncio.sleep(0.3)
        
        # Continuous activity feed
        while True:
            agent = random.choice(agents)
            template = random.choice(activities)
            symbol = random.choice(symbols)
            
            # Fill template
            activity = template.format(
                symbol=symbol,
                pct=random.randint(20, 50),
                val=round(random.uniform(1.5, 3.0), 2),
                side=random.choice(["BUY", "SELL"]),
                price=round(random.uniform(100, 900), 2),
                vix=round(random.uniform(12, 25), 1),
                regime=random.choice(regimes),
                conf=random.randint(60, 95),
                budget=round(random.uniform(0.5, 4.0), 1),
                alignment=round(random.uniform(-1, 1), 2),
            )
            
            # Determine activity type
            if "executed" in activity.lower():
                activity_type = "trade_executed"
                priority = "high"
            elif "approved" in activity.lower():
                activity_type = "decision_approved"
                priority = "medium"
            elif "regime" in activity.lower():
                activity_type = "regime_update"
                priority = "high"
            elif "risk" in activity.lower():
                activity_type = "risk_alert"
                priority = "medium"
            else:
                activity_type = "analysis"
                priority = "low"
            
            await manager.send_personal(websocket, {
                "type": "agent_activity",
                "agent": agent["name"],
                "emoji": agent["emoji"],
                "activity": activity,
                "activity_type": activity_type,
                "priority": priority,
                "symbol": symbol,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            
            # Variable delay based on priority
            delay = {"high": 1, "medium": 2, "low": 3}[priority]
            await asyncio.sleep(delay + random.uniform(0, 2))
    
    except asyncio.CancelledError:
        pass


# ============================================================
# BROADCAST HELPERS (for use by other modules)
# ============================================================

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


async def broadcast_market_update(data: dict):
    """Broadcast market data update."""
    await manager.broadcast("live", {
        "type": "market_update",
        **data,
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
