"""
PDT-Aware Position Manager
===========================
Pattern Day Trader detection and compliance.
Monitors day trade count and enforces limits.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from collections import deque

from app.brokers.base import BrokerBase, Account, TradingMode


class PDTStatus(Enum):
    """PDT status for account."""
    SAFE = "safe"  # Can trade
    WARNING = "warning"  # Approaching limit
    LOCKED = "locked"  # Hit limit, no more day trades


@dataclass
class TradeRecord:
    """Record of a day trade."""
    timestamp: datetime
    symbol: str
    side: str
    quantity: float
    order_id: str


@dataclass
class PDTState:
    """Current PDT state."""
    status: PDTStatus
    day_trades_in_5_days: int
    max_day_trades: int
    account_equity: float
    pattern_day_trader: bool
    last_trade_date: Optional[datetime] = None
    
    @property
    def trades_remaining(self) -> int:
        return max(0, self.max_day_trades - self.day_trades_in_5_days)
    
    @property
    def usage_percent(self) -> float:
        return (self.day_trades_in_5_days / self.max_day_trades) * 100 if self.max_day_trades > 0 else 0


class PDTManager:
    """
    Pattern Day Trader manager.
    
    Rules:
    - 3 day trades in 5 business days = PDT flag
    - PDT account has $25k minimum equity requirement
    - Once flagged, can trade with unlimited day trades
    - Non-PDT limited to 3 round-trip trades per 5 days
    """
    
    # PDT rule: 3 day trades in 5 business days triggers PDT flag
    MAX_DAY_TRADES_NON_PDT = 3
    PDT_EQUITY_THRESHOLD = 25000.00  # $25k minimum
    
    # Warning thresholds
    WARNING_THRESHOLD = 2  # Warn at 2 day trades
    CRITICAL_THRESHOLD = 3  # Lock at 3
    
    def __init__(self, broker: BrokerBase):
        self.broker = broker
        self._trade_history: deque[TradeRecord] = deque(maxlen=100)
        self._state: Optional[PDTState] = None
        
    async def init(self) -> None:
        """Initialize PDT state from broker."""
        account = await self.broker.get_account()
        self._state = PDTState(
            status=PDTStatus.SAFE,
            day_trades_in_5_days=account.day_trade_count,
            max_day_trades=3 if not account.pattern_day_trader else 999,
            account_equity=account.equity,
            pattern_day_trader=account.pattern_day_trader,
        )
        
    async def refresh(self) -> PDTState:
        """Refresh PDT state from broker."""
        account = await self.broker.get_account()
        
        # Count day trades in last 5 business days
        trades_in_window = self._count_trades_in_window()
        
        self._state = PDTState(
            status=self._calculate_status(trades_in_window),
            day_trades_in_5_days=trades_in_window,
            max_day_trades=3 if not account.pattern_day_trader else 999,
            account_equity=account.equity,
            pattern_day_trader=account.pattern_day_trader,
        )
        
        return self._state
    
    def _count_trades_in_window(self) -> int:
        """Count day trades in rolling 5-day window."""
        cutoff = datetime.now() - timedelta(business_days=5)
        return sum(1 for t in self._trade_history if t.timestamp >= cutoff and t.side != t.side)  # Round trips only
        
    def _calculate_status(self, trades_count: int) -> PDTStatus:
        """Calculate PDT status based on trade count."""
        if self._state and self._state.pattern_day_trader:
            return PDTStatus.SAFE  # PDT can trade freely
            
        if trades_count >= self.CRITICAL_THRESHOLD:
            return PDTStatus.LOCKED
        elif trades_count >= self.WARNING_THRESHOLD:
            return PDTStatus.WARNING
        else:
            return PDTStatus.SAFE
            
    async def can_open_position(
        self,
        symbol: str,
        side: str,
        quantity: float,
    ) -> tuple[bool, str]:
        """
        Check if a new position can be opened.
        
        Returns:
            (can_trade, reason)
        """
        if not self._state:
            await self.init()
            
        # Check PDT status
        if self._state.status == PDTStatus.LOCKED:
            return False, "Day trade limit reached. Wait for 5 business days."
            
        if self._state.status == PDTStatus.WARNING:
            return True, f"Warning: {self._state.trades_remaining} day trades remaining this period."
            
        return True, "OK"
        
    async def can_day_trade(self) -> tuple[bool, str]:
        """Check if a day trade can be executed."""
        if not self._state:
            await self.refresh()
            
        # If already PDT, unlimited
        if self._state.pattern_day_trader:
            return True, "PDT account - unlimited day trades"
            
        # Check limit
        if self._state.day_trades_in_5_days >= self.MAX_DAY_TRADES_NON_PDT:
            return False, f"Day trade limit reached ({self.MAX_DAY_TRADES_NON_PDT}/5 days)"
            
        return True, f"{self._state.trades_remaining} remaining"
        
    def record_trade(self, trade: TradeRecord) -> None:
        """Record a trade for PDT tracking."""
        self._trade_history.append(trade)
        
    async def get_state(self) -> PDTState:
        """Get current PDT state."""
        if not self._state:
            await self.init()
        return self._state


class PositionSizer:
    """
    Calculate optimal position size based on risk parameters.
    """
    
    def __init__(
        self,
        broker: BrokerBase,
        max_position_pct: float = 0.05,  # 5% max per position
        max_drawdown_pct: float = 0.08,   # 8% max drawdown
        max_daily_loss_pct: float = 0.03, # 3% daily loss stop
    ):
        self.broker = broker
        self.max_position_pct = max_position_pct
        self.max_drawdown_pct = max_drawdown_pct
        self.max_daily_loss_pct = max_daily_loss_pct
        
    async def calculate_size(
        self,
        symbol: str,
        entry_price: float,
        stop_loss_pct: float = 0.02,
    ) -> float:
        """
        Calculate position size in shares.
        
        Args:
            symbol: Stock symbol
            entry_price: Entry price per share
            stop_loss_pct: Stop loss percentage (e.g., 0.02 = 2%)
            
        Returns:
            Number of shares to buy
        """
        account = await self.broker.get_account()
        
        # Get buying power
        buying_power = account.buying_power
        
        # Calculate max position value
        max_position_value = buying_power * self.max_position_pct
        
        # Calculate stop loss amount
        risk_per_share = entry_price * stop_loss_pct
        if risk_per_share <= 0:
            risk_per_share = entry_price * 0.02  # Default 2%
            
        # Calculate shares based on risk
        # Risk should not exceed 1% of account
        max_risk = account.equity * 0.01
        risk_based_shares = max_risk / risk_per_share
        
        # Use smaller of the two
        shares = min(max_position_value / entry_price, risk_based_shares)
        
        # Round down to whole shares
        return int(shares)
        
    async def check_risk_limits(self) -> tuple[bool, str]:
        """Check overall risk limits."""
        account = await self.broker.get_account()
        
        # Check max drawdown
        portfolio_value = account.portfolio_value
        if portfolio_value > 0:
            drawdown = (account.equity - portfolio_value) / portfolio_value
            if abs(drawdown) >= self.max_drawdown_pct:
                return False, f"Max drawdown reached: {drawdown:.1%}"
                
        # Check daily loss
        # TODO: Track daily P&L
        
        return True, "Risk limits OK"


class KillSwitch:
    """
    Emergency kill switch to close all positions instantly.
    """
    
    def __init__(self, broker: BrokerBase):
        self.broker = broker
        self._triggered = False
        self._trigger_time: Optional[datetime] = None
        self._reason: Optional[str] = None
        
    @property
    def is_triggered(self) -> bool:
        return self._triggered
        
    @property
    def trigger_time(self) -> Optional[datetime]:
        return self._trigger_time
        
    @property
    def reason(self) -> Optional[str]:
        return self._reason
        
    async def trigger(self, reason: str = "Manual trigger") -> list:
        """
        Trigger kill switch - close ALL positions immediately.
        
        Args:
            reason: Reason for triggering
            
        Returns:
            List of closed orders
        """
        self._triggered = True
        self._trigger_time = datetime.now()
        self._reason = reason
        
        # Cancel all open orders first
        await self._cancel_all_orders()
        
        # Close all positions
        closed = await self.broker.close_all_positions(reason)
        
        return closed
    
    async def _cancel_all_orders(self) -> None:
        """Cancel all open orders."""
        try:
            orders = await self.broker.broker.get_orders(status="open")
            for order in orders:
                await self.broker.cancel_order(order["id"])
        except Exception:
            pass  # Best effort
            
    def reset(self) -> None:
        """Reset kill switch."""
        self._triggered = False
        self._trigger_time = None
        self._reason = None


# Helper for business days calculation
def timedelta(business_days: int) -> timedelta:
    """Calculate timedelta in business days (rough approximation)."""
    return timedelta(days=business_days * 1.5)