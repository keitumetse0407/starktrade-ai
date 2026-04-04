"""Risk Agent - Position sizing, stop loss / take profit, drawdown management"""
import pandas as pd
from typing import Dict, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


@dataclass
class TradePlan:
    """Complete trade plan with risk parameters."""
    direction: str      # "BUY" or "SELL"
    entry: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    position_size_pct: float
    risk_amount: float
    risk_reward: float
    rationale: str


@dataclass
class OpenPosition:
    """Track an individual open position."""
    direction: str
    entry: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    position_size_pct: float
    risk_amount: float
    opened_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class RiskAgent:
    """The Ray Dalio — manages risk budget, validates trades, enforces circuit breakers."""

    def __init__(
        self,
        account_balance: float = 100_000,
        max_risk_pct: float = 2.0,       # Max % of account to risk per trade
        max_drawdown_pct: float = 8.0,   # Halt trading if drawdown hits this
        daily_loss_limit_pct: float = 3.0,  # Stop for 24h if daily loss hits this
        min_risk_reward: float = 1.5,    # Minimum R:R ratio
        max_position_pct: float = 5.0,   # Max position as % of portfolio
    ):
        self.account_balance = account_balance
        self.max_risk_pct = max_risk_pct
        self.max_drawdown_pct = max_drawdown_pct
        self.daily_loss_limit_pct = daily_loss_limit_pct
        self.min_risk_reward = min_risk_reward
        self.max_position_pct = max_position_pct

        # Runtime state
        self.current_drawdown_pct = 0.0
        self.daily_pnl_pct = 0.0
        self.daily_pnl_reset_at: Optional[datetime] = None  # When daily PnL resets
        self.open_positions: int = 0
        self.position_list: List[OpenPosition] = []  # Track individual positions
        self.max_concurrent = 3
        self.circuit_breaker_active = False
        self.peak_balance = account_balance  # Historical high water mark

    def _check_daily_reset(self):
        """Reset daily PnL if 24h has passed since last reset."""
        now = datetime.now(timezone.utc)
        if self.daily_pnl_reset_at is None:
            # First call — set reset time to next midnight UTC
            self.daily_pnl_reset_at = now.replace(hour=0, minute=0, second=0, microsecond=0)
            # If we're past midnight, set to tomorrow
            if self.daily_pnl_reset_at < now:
                from datetime import timedelta
                self.daily_pnl_reset_at += timedelta(days=1)
            return

        if now >= self.daily_pnl_reset_at:
            logger.info(f"Daily PnL reset: {self.daily_pnl_pct:.2f}% → 0.00%")
            self.daily_pnl_pct = 0.0
            # Advance reset time by 24h
            from datetime import timedelta
            self.daily_pnl_reset_at += timedelta(hours=24)

    def record_trade_opened(self, trade_plan: Optional[TradePlan] = None):
        """Increment the open positions counter and track the position."""
        self.open_positions += 1
        if trade_plan:
            pos = OpenPosition(
                direction=trade_plan.direction,
                entry=trade_plan.entry,
                stop_loss=trade_plan.stop_loss,
                take_profit_1=trade_plan.take_profit_1,
                take_profit_2=trade_plan.take_profit_2,
                position_size_pct=trade_plan.position_size_pct,
                risk_amount=trade_plan.risk_amount,
            )
            self.position_list.append(pos)
            logger.info(f"Position opened: {trade_plan.direction} @ {trade_plan.entry:.2f} | Total open: {self.open_positions}")
        else:
            logger.info(f"Position opened (counter only). Total open: {self.open_positions}")

    def build_trade_plan(
        self,
        direction: str,
        entry: float,
        atr: float,
        confidence: float,
        rationale: str,
    ) -> Optional[TradePlan]:
        """
        Build a complete trade plan with proper risk management.
        Returns None if trade doesn't meet criteria.
        """
        if self.circuit_breaker_active:
            logger.warning("CIRCUIT BREAKER ACTIVE — rejecting trade")
            return None

        if self.open_positions >= self.max_concurrent:
            logger.warning(f"Max concurrent positions ({self.max_concurrent}) reached")
            return None

        # Stop loss: 1.5x ATR
        sl_distance = atr * 1.5
        if direction == "BUY":
            stop_loss = entry - sl_distance
            tp1 = entry + (sl_distance * 2.0)   # 1:2 R:R
            tp2 = entry + (sl_distance * 3.5)   # 1:3.5 R:R
        else:
            stop_loss = entry + sl_distance
            tp1 = entry - (sl_distance * 2.0)
            tp2 = entry - (sl_distance * 3.5)

        risk_per_unit = abs(entry - stop_loss)
        reward_per_unit = abs(tp1 - entry)
        rr = reward_per_unit / risk_per_unit if risk_per_unit > 0 else 0

        # Reject if R:R is too low
        if rr < self.min_risk_reward:
            logger.info(f"Rejected: R:R {rr:.2f} < minimum {self.min_risk_reward}")
            return None

        # Position size: reduce risk on low confidence trades
        risk_pct = self.max_risk_pct * min(confidence, 1.0)
        risk_amount = self.account_balance * (risk_pct / 100)

        # Number of units to buy
        position_value = risk_amount / (risk_per_unit / entry) if risk_per_unit > 0 else 0
        position_pct = (position_value / self.account_balance) * 100 if self.account_balance > 0 else 0

        # Check position size limit
        if position_pct > self.max_position_pct:
            position_value = self.account_balance * (self.max_position_pct / 100)
            position_pct = self.max_position_pct

        return TradePlan(
            direction=direction,
            entry=round(entry, 2),
            stop_loss=round(stop_loss, 2),
            take_profit_1=round(tp1, 2),
            take_profit_2=round(tp2, 2),
            position_size_pct=round(position_pct, 2),
            risk_amount=round(risk_amount, 2),
            risk_reward=round(rr, 2),
            rationale=rationale,
        )

    def check_circuit_breakers(self) -> Dict:
        """Check all circuit breakers. Returns status dict."""
        breaks = []

        if self.current_drawdown_pct >= self.max_drawdown_pct:
            breaks.append(f"Drawdown {self.current_drawdown_pct:.1f}% >= {self.max_drawdown_pct:.1f}% — HALT ALL TRADING")
            self.circuit_breaker_active = True

        if abs(self.daily_pnl_pct) >= self.daily_loss_limit_pct and self.daily_pnl_pct < 0:
            breaks.append(f"Daily loss {self.daily_pnl_pct:.1f}% >= {self.daily_loss_limit_pct:.1f}% — stop for 24h")

        if self.open_positions >= self.max_concurrent:
            breaks.append(f"Max positions reached ({self.open_positions}/{self.max_concurrent})")

        return {
            "circuit_breaker_active": self.circuit_breaker_active,
            "current_drawdown_pct": round(self.current_drawdown_pct, 2),
            "daily_pnl_pct": round(self.daily_pnl_pct, 2),
            "open_positions": self.open_positions,
            "max_positions": self.max_concurrent,
            "blocks": breaks,
            "trading_allowed": not breaks,
        }

    def record_trade_closed(self, pnl: float):
        """Update state after a trade closes."""
        # Check daily reset first
        self._check_daily_reset()

        # Update account balance with PnL
        self.account_balance += pnl

        # Update peak balance (high water mark — only increases)
        if self.account_balance > self.peak_balance:
            self.peak_balance = self.account_balance

        # Calculate drawdown against peak (high water mark)
        if self.peak_balance > 0:
            self.current_drawdown_pct = (
                (self.peak_balance - self.account_balance) / self.peak_balance
            ) * 100

        # Track daily PnL (as percentage of peak)
        pnl_pct = (pnl / self.peak_balance) * 100 if self.peak_balance > 0 else 0
        self.daily_pnl_pct += pnl_pct

        # Decrement open positions (never go below 0)
        self.open_positions = max(0, self.open_positions - 1)

        # Remove most recent position from list
        if self.position_list:
            self.position_list.pop()

        # Check circuit breakers after updating
        self.check_circuit_breakers()

        logger.info(
            f"Trade closed: pnl={pnl:+.2f} ({pnl_pct:+.2f}%) | "
            f"balance={self.account_balance:.2f} | peak={self.peak_balance:.2f} | "
            f"drawdown={self.current_drawdown_pct:.2f}% | open={self.open_positions} | "
            f"daily_pnl={self.daily_pnl_pct:+.2f}%"
        )

    def get_status(self) -> Dict:
        """Return current risk status."""
        status = self.check_circuit_breakers()
        status.update({
            "account_balance": self.account_balance,
            "max_risk_pct": self.max_risk_pct,
            "max_position_pct": self.max_position_pct,
            "min_risk_reward": self.min_risk_reward,
        })
        return status
