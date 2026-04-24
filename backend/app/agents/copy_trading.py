"""
Copy Trading System
=================

Allows users to automatically copy trades from master traders.
Users choose masters to follow, and their accounts mirror masters' positions.

Key Features:
- Master registration: Traders can become masters
- Follower management: Track who follows whom
- Position mirroring: Automatically copy trades
- Risk controls: Per-follower limits
- Performance tracking: Masters ranked by perf
- Partial copying: Follow with % of master position

Flow:
1. Master places trade
2. System notifies followers
3. Followers' accounts mirror (scaled)
4. Exit copied when master exits
5. Performance credited

This is social trading for StarkTrade.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import hashlib
import json

try:
    from typing import Optional, Literal
except ImportError:
    from typing_extensions import Optional, Literal


# ============================================================
# USER TYPES
# ============================================================
class UserRole(Enum):
    MASTER = "master"       # Can be copied
    FOLLOWER = "follower"    # Copies others
    BOTH = "both"        # Can do both


class CopyStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    SUSPENDED = "suspended"


class TradeAction(Enum):
    ENTRY = "entry"
    MODIFY = "modify"
    EXIT = "exit"


# ============================================================
# MASTER TRADER
# ============================================================
@dataclass
class MasterTrader:
    """A trader that can be copied."""
    user_id: str
    username: str
    
    # Stats
    total_return_pct: float = 0.0
    sharpe_ratio: float = 0.0
    win_rate: float = 0.0
    max_drawdown_pct: float = 0.0
    total_trades: int = 0
    
    # Copy settings
    is_copyable: bool = True
    min_follower_investment: float = 100.0   # Min $ to follow
    max_followers: int = 100                  # Max followers
    performance_fee_pct: float = 10.0            # Fee on profits
    
    # Status
    status: CopyStatus = CopyStatus.ACTIVE
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "total_return_pct": self.total_return_pct,
            "sharpe_ratio": self.sharpe_ratio,
            "win_rate": self.win_rate,
            "max_drawdown_pct": self.max_drawdown_pct,
            "total_trades": self.total_trades,
            "is_copyable": self.is_copyable,
            "performance_fee_pct": self.performance_fee_pct,
            "status": self.status.value,
        }


# ============================================================
# FOLLOWER RELATIONSHIP
# ============================================================
@dataclass
class FollowerRelationship:
    """Relationship between follower and master."""
    id: str
    follower_id: str
    master_id: str
    
    # Copy settings
    copy_ratio: float = 1.0        # 1.0 = 100% of master position
    max_position_pct: float = 5.0     # Max % of follower portfolio
    copy_entries: bool = True
    copy_exits: bool = True
    copy_modifications: bool = False
    
    # Status
    status: CopyStatus = CopyStatus.ACTIVE
    total_pnl_pct: float = 0.0
    
    # Tracking
    positions_copied: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def __post_init__(self):
        if not self.id:
            self.id = hashlib.md5(
                f"{self.follower_id}{self.master_id}{datetime.now().isoformat()}".encode()
            ).hexdigest()[:8]
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "follower_id": self.follower_id,
            "master_id": self.master_id,
            "copy_ratio": self.copy_ratio,
            "max_position_pct": self.max_position_pct,
            "total_pnl_pct": self.total_pnl_pct,
            "positions_copied": self.positions_copied,
            "status": self.status.value,
        }


# ============================================================
# COPIED POSITION
# ============================================================
@dataclass
class CopiedPosition:
    """A position mirrored to followers."""
    id: str
    master_id: str
    master_trade_id: str
    
    # Master position info
    symbol: str
    direction: Literal["buy", "sell"]
    entry_price: float
    stop_loss: float
    take_profit: float
    
    # Follower positions (per follower)
    follower_positions: dict[str, dict] = field(default_factory=dict)
    
    # Status
    action: TradeAction = TradeAction.ENTRY
    exited: bool = False
    
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    exited_at: Optional[datetime] = None
    
    def __post_init__(self):
        if not self.id:
            self.id = hashlib.md5(
                f"{self.master_id}{self.symbol}{datetime.now().isoformat()}".encode()
            ).hexdigest()[:8]
    
    def add_follower(
        self,
        follower_id: str,
        account_value: float,
        copy_ratio: float,
        max_position_pct: float,
    ) -> dict:
        """Add follower to this copied position."""
        # Calculate position size
        max_dollars = account_value * (max_position_pct / 100)
        master_value = 10000  # Assume master position value
        
        # Scale by ratio
        follower_shares = copy_ratio
        position_value = max_dollars * follower_shares
        
        self.follower_positions[follower_id] = {
            "entry_price": self.entry_price,
            "position_value": position_value,
            "direction": self.direction,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "copied_at": datetime.now(timezone.utc).isoformat(),
        }
        
        return self.follower_positions[follower_id]
    
    def exit_follower(self, follower_id: str, exit_price: float) -> dict:
        """Exit a follower's position."""
        if follower_id not in self.follower_positions:
            return {"error": "Not following this position"}
        
        pos = self.follower_positions[follower_id]
        
        if self.direction == "buy":
            pnl_pct = (exit_price - pos["entry_price"]) / pos["entry_price"] * 100
        else:
            pnl_pct = (pos["entry_price"] - exit_price) / pos["entry_price"] * 100
        
        result = {
            "exit_price": exit_price,
            "pnl_pct": pnl_pct,
            "position_value": pos["position_value"],
            "pnl_dollars": pos["position_value"] * (pnl_pct / 100),
        }
        
        del self.follower_positions[follower_id]
        return result


# ============================================================
# COPY TRADING ENGINE
# ============================================================
class CopyTradingEngine:
    """
    Main copy trading system.
    
    Usage:
        engine = CopyTradingEngine()
        await engine.register_master(user_id, username)
        await engine.follow_master(follower_id, master_id, copy_ratio=0.5)
        await engine.on_master_trade(master_id, trade)
    """
    
    def __init__(self):
        # Master registry
        self.masters: dict[str, MasterTrader] = {}
        
        # Follower relationships
        self.relationships: dict[str, FollowerRelationship] = {}
        
        # Active copied positions
        self.copied_positions: dict[str, CopiedPosition] = {}
        
        # Position history
        self.history: list[CopiedPosition] = []
    
    # ========================================================
    # MASTER MANAGEMENT
    # ========================================================
    
    async def register_master(
        self,
        user_id: str,
        username: str,
        min_investment: float = 100.0,
        fee_pct: float = 10.0,
    ) -> MasterTrader:
        """Register a user as a master trader."""
        master = MasterTrader(
            user_id=user_id,
            username=username,
            min_follower_investment=min_investment,
            performance_fee_pct=fee_pct,
        )
        
        self.masters[user_id] = master
        return master
    
    async def update_master_stats(
        self,
        user_id: str,
        total_return: float,
        sharpe: float,
        win_rate: float,
        drawdown: float,
        trades: int,
    ):
        """Update master performance stats."""
        if user_id not in self.masters:
            return
        
        m = self.masters[user_id]
        m.total_return_pct = total_return
        m.sharpe_ratio = sharpe
        m.win_rate = win_rate
        m.max_drawdown_pct = drawdown
        m.total_trades = trades
    
    def get_master(self, user_id: str) -> Optional[MasterTrader]:
        """Get master trader."""
        return self.masters.get(user_id)
    
    def get_top_masters(self, limit: int = 10) -> list[dict]:
        """Get top performing masters."""
        sorted_masters = sorted(
            self.masters.values(),
            key=lambda m: m.total_return_pct,
            reverse=True,
        )[:limit]
        
        return [m.to_dict() for m in sorted_masters]
    
    def get_copyable_masters(self) -> list[dict]:
        """Get all copyable masters."""
        return [
            m.to_dict() for m in self.masters.values()
            if m.is_copyable and m.status == CopyStatus.ACTIVE
        ]
    
    # ========================================================
    # FOLLOWER MANAGEMENT
    # ========================================================
    
    async def follow_master(
        self,
        follower_id: str,
        master_id: str,
        copy_ratio: float = 1.0,
        max_position_pct: float = 5.0,
    ) -> FollowerRelationship:
        """Start following a master."""
        if master_id not in self.masters:
            raise ValueError(f"Master {master_id} not found")
        
        master = self.masters[master_id]
        
        if len(self._get_follower_relationships(master_id)) >= master.max_followers:
            raise ValueError(f"Master {master_id} has max followers")
        
        rel = FollowerRelationship(
            id="",  # Auto-generated
            follower_id=follower_id,
            master_id=master_id,
            copy_ratio=copy_ratio,
            max_position_pct=max_position_pct,
        )
        
        self.relationships[rel.id] = rel
        return rel
    
    async def unfollow_master(self, follower_id: str, master_id: str):
        """Stop following a master."""
        rel = self._get_relationship(follower_id, master_id)
        if rel:
            rel.status = CopyStatus.STOPPED
    
    def _get_relationship(self, follower_id: str, master_id: str) -> Optional[FollowerRelationship]:
        """Get relationship between follower and master."""
        for rel in self.relationships.values():
            if rel.follower_id == follower_id and rel.master_id == master_id:
                return rel
        return None
    
    def _get_follower_relationships(self, master_id: str) -> list[FollowerRelationship]:
        """Get all followers of a master."""
        return [
            r for r in self.relationships.values()
            if r.master_id == master_id and r.status == CopyStatus.ACTIVE
        ]
    
    def get_following(self, follower_id: str) -> list[dict]:
        """Get who a user is following."""
        return [
            r.to_dict() for r in self.relationships.values()
            if r.follower_id == follower_id and r.status == CopyStatus.ACTIVE
        ]
    
    def get_followers(self, master_id: str) -> list[dict]:
        """Get followers of a master."""
        return [
            r.to_dict() for r in self._get_follower_relationships(master_id)
        ]
    
    # ========================================================
    # TRADE COPYING
    # ========================================================
    
    async def on_master_trade(
        self,
        master_id: str,
        trade: dict,
    ) -> list[dict]:
        """
        Called when a master places a trade.
        Mirrors to all active followers.
        
        Returns list of follower execution results.
        """
        if master_id not in self.masters:
            return []
        
        master = self.masters[master_id]
        if not master.is_copyable:
            return []
        
        # Get active followers
        followers = self._get_follower_relationships(master_id)
        
        if not followers:
            return []
        
        # Create position
        copied = CopiedPosition(
            id="",
            master_id=master_id,
            master_trade_id=trade.get("trade_id", ""),
            symbol=trade["symbol"],
            direction=trade["direction"],
            entry_price=trade["entry_price"],
            stop_loss=trade.get("stop_loss", 0),
            take_profit=trade.get("take_profit", 0),
        )
        
        results = []
        
        for rel in followers:
            if rel.status != CopyStatus.ACTIVE:
                continue
            
            # Check copy settings
            action = trade.get("action", "entry")
            
            if action == "entry" and not rel.copy_entries:
                continue
            elif action == "exit" and not rel.copy_exits:
                continue
            elif action == "modify" and not rel.copy_modifications:
                continue
            
            # Add follower to copied position
            # Note: In production, fetch actual account value
            account_value = 10000  # Placeholder
            
            pos = copied.add_follower(
                rel.follower_id,
                account_value,
                rel.copy_ratio,
                rel.max_position_pct,
            )
            
            # Update relationship
            rel.positions_copied += 1
            rel.updated_at = datetime.now(timezone.utc)
            
            results.append({
                "follower_id": rel.follower_id,
                "copied": True,
                "position": pos,
                "copy_ratio": rel.copy_ratio,
            })
        
        if results:
            self.copied_positions[copied.id] = copied
        
        return results
    
    async def on_master_exit(
        self,
        master_id: str,
        symbol: str,
        exit_price: float,
    ) -> list[dict]:
        """Called when a master exits a position."""
        # Find the position
        copied = None
        for c in self.copied_positions.values():
            if c.master_id == master_id and c.symbol == symbol and not c.exited:
                copied = c
                break
        
        if not copied:
            return []
        
        results = []
        
        for follower_id in list(copied.follower_positions.keys()):
            result = copied.exit_follower(follower_id, exit_price)
            
            # Update relationship PnL
            rel = self._get_relationship(follower_id, master_id)
            if rel:
                rel.total_pnl_pct += result.get("pnl_pct", 0)
            
            results.append({
                "follower_id": follower_id,
                "pnl_pct": result.get("pnl_pct", 0),
                "pnl_dollars": result.get("pnl_dollars", 0),
            })
        
        copied.exited = True
        copied.exited_at = datetime.now(timezone.utc)
        
        # Move to history
        self.history.append(copied)
        del self.copied_positions[copied.id]
        
        return results
    
    # ========================================================
    # STATS
    # ========================================================
    
    def get_follower_stats(self, follower_id: str) -> dict:
        """Get stats for a follower."""
        rels = [
            r for r in self.relationships.values()
            if r.follower_id == follower_id
        ]
        
        if not rels:
            return {"total_following": 0}
        
        total_pnl = sum(r.total_pnl_pct for r in rels)
        
        return {
            "total_following": len(rels),
            "total_pnl_pct": total_pnl,
            "masters": [self.masters.get(r.master_id, None).__dict__ for r in rels],
        }
    
    def get_master_stats(self, master_id: str) -> dict:
        """Get stats for a master."""
        followers = self.get_followers(master_id)
        
        return {
            "master": self.masters.get(master_id, None).__dict__ if self.masters.get(master_id) else None,
            "total_followers": len(followers),
            "positions_copied": sum(f["positions_copied"] for f in followers),
        }
    
    def get_leaderboard(self) -> list[dict]:
        """Get leaderboard of masters."""
        return self.get_top_masters(20)


# ============================================================
# COPY TRADING API
# ============================================================
class CopyTradingAPI:
    """FastAPI integration for copy trading."""
    
    def __init__(self, engine: CopyTradingEngine):
        self.engine = engine
    
    async def copy_trade(
        self,
        master_trade: dict,
    ) -> dict:
        """Endpoint for masters to signal trades."""
        return await self.engine.on_master_trade(
            master_trade["user_id"],
            master_trade,
        )
    
    async def register_master(
        self,
        user_id: str,
        username: str,
    ) -> dict:
        """Register as master trader."""
        master = await self.engine.register_master(user_id, username)
        return master.to_dict()
    
    async def become_follower(
        self,
        follower_id: str,
        master_id: str,
        settings: dict,
    ) -> dict:
        """Follow a master."""
        rel = await self.engine.follow_master(
            follower_id,
            master_id,
            copy_ratio=settings.get("copy_ratio", 1.0),
            max_position_pct=settings.get("max_position_pct", 5.0),
        )
        return rel.to_dict()


# ============================================================
# SINGLETON
# ============================================================
copy_trading_engine = CopyTradingEngine()

__all__ = [
    "UserRole",
    "CopyStatus",
    "TradeAction",
    "MasterTrader",
    "FollowerRelationship", 
    "CopiedPosition",
    "CopyTradingEngine",
    "CopyTradingAPI",
    "copy_trading_engine",
]