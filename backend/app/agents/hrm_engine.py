"""
Hierarchical Reasoning Module (HRM) — Based on Samsung Research
================================================================

Two-level architecture inspired by System 1 / System 2 thinking:

SYSTEM 2 (Strategic Layer — Slow, Abstract):
  - Market regime detection (Bull/Bear/Sideways/Crisis)
  - Multi-timeframe strategic planning
  - Portfolio-level risk budget allocation
  - Cross-asset correlation analysis
  - Macro thesis formation

SYSTEM 1 (Tactical Layer — Fast, Reactive):
  - Technical signal generation
  - Entry/exit timing optimization
  - Position sizing
  - Real-time momentum tracking
  - Intraday pattern recognition

KEY HRM PRINCIPLE: System 2 sets context → System 1 executes → 
System 2 receives feedback → Adjusts strategy → Loop

This creates temporal reasoning across timescales:
  - System 2: Weekly/monthly strategic shifts
  - System 1: Minute/hourly tactical decisions
  - Feedback: Continuous learning loop
"""

from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timezone

try:
    from typing import Optional
except ImportError:
    from typing_extensions import Optional


# ============================================================
# MARKET REGIMES (System 2 concern)
# ============================================================
class MarketRegime(Enum):
    BULL = "bull"              # Uptrend, risk-on
    BEAR = "bear"              # Downtrend, risk-off
    SIDEWAYS = "sideways"      # Range-bound, mean-revert
    TRANSITION = "transition"  # Regime shift detected
    CRISIS = "crisis"          # Black swan / extreme volatility


class TimeFrame(Enum):
    SCALP = "1m"      # System 1 only
    INTRADAY = "1h"   # System 1 primary
    SWING = "4h"      # Both systems
    POSITION = "1D"   # System 2 primary
    STRATEGIC = "1W"  # System 2 only


# ============================================================
# SYSTEM 2: STRATEGIC REASONING STATE
# ============================================================
@dataclass
class StrategicState:
    """System 2's world model — updated slowly, guides all decisions."""
    
    # Market regime
    regime: MarketRegime = MarketRegime.SIDEWAYS
    regime_confidence: float = 0.5
    regime_duration_days: int = 0
    
    # Strategic thesis
    macro_thesis: str = ""
    sector_rotation_signal: str = ""  # "risk-on" | "risk-off" | "neutral"
    correlation_breakdown: bool = False
    
    # Risk budget (System 2 allocates, System 1 spends)
    risk_budget_pct: float = 2.0        # Max total risk allocation
    risk_spent_pct: float = 0.0         # Currently used
    max_position_size_pct: float = 5.0  # Per-trade limit
    
    # Multi-timeframe alignment
    weekly_trend: str = "neutral"       # "up" | "down" | "neutral"
    daily_trend: str = "neutral"
    h4_trend: str = "neutral"
    timeframe_alignment: float = 0.0    # -1 to 1, how aligned are all TFs
    
    # Temporal context
    last_regime_change: Optional[datetime] = None
    last_strategic_review: Optional[datetime] = None
    
    def can_allocate_risk(self, amount_pct: float) -> bool:
        """System 2 gate: can System 1 spend this risk budget?"""
        return (self.risk_spent_pct + amount_pct) <= self.risk_budget_pct
    
    def allocate_risk(self, amount_pct: float) -> bool:
        """Allocate risk budget. Returns False if over budget."""
        if self.can_allocate_risk(amount_pct):
            self.risk_spent_pct += amount_pct
            return True
        return False
    
    def release_risk(self, amount_pct: float):
        """Release risk budget when position closes."""
        self.risk_spent_pct = max(0, self.risk_spent_pct - amount_pct)
    
    def get_aggression_multiplier(self) -> float:
        """How aggressive should System 1 be? Based on regime."""
        multipliers = {
            MarketRegime.BULL: 1.0,         # Full aggression
            MarketRegime.SIDEWAYS: 0.6,     # Reduced, mean-revert
            MarketRegime.TRANSITION: 0.3,   # Very cautious
            MarketRegime.BEAR: 0.5,         # Hedged, short-biased
            MarketRegime.CRISIS: 0.1,       # Defensive only
        }
        return multipliers.get(self.regime, 0.5)


# ============================================================
# SYSTEM 1: TACTICAL SIGNAL
# ============================================================
@dataclass
class TacticalSignal:
    """System 1's fast decision output."""
    
    symbol: str
    direction: str                  # "buy" | "sell" | "hold"
    confidence: float               # 0.0 - 1.0
    timeframe: TimeFrame
    
    # Entry/exit
    entry_price: float = 0.0
    stop_loss: float = 0.0
    take_profit_1: float = 0.0
    take_profit_2: float = 0.0
    risk_reward: float = 0.0
    
    # Technical context
    rsi: float = 50.0
    macd_signal: str = "neutral"
    ema_alignment: str = "neutral"
    volume_confirmation: bool = False
    
    # Timing
    signal_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    
    # HRM integration
    strategic_approved: bool = False
    risk_allocated_pct: float = 0.0
    
    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) > self.expires_at


# ============================================================
# HRM REASONING ENGINE
# ============================================================
class HierarchicalReasoningEngine:
    """
    Dual-system reasoning engine.
    
    System 2 (Strategic): Updates regime, allocates risk, sets context
    System 1 (Tactical):  Generates signals within System 2's constraints
    
    The key HRM innovation: System 2 doesn't micromanage System 1.
    It sets boundaries and budgets, then System 1 operates freely within them.
    """
    
    def __init__(self):
        self.strategic = StrategicState()
        self.tactical_history: list[TacticalSignal] = []
        self.feedback_buffer: list[dict] = []
    
    # ========================================================
    # SYSTEM 2 METHODS (Slow — call daily/weekly)
    # ========================================================
    
    async def update_regime(self, market_data: dict) -> MarketRegime:
        """
        System 2: Detect market regime from multi-timeframe data.
        This is the most important decision — wrong regime = wrong everything.
        """
        # Extract signals from market data
        vix = market_data.get("vix", 15)
        sp500_trend = market_data.get("sp500_20d_return_pct", 0)
        breadth = market_data.get("market_breadth_pct", 50)  # % stocks above 200 MA
        yield_curve = market_data.get("yield_curve_slope", 0)
        
        # Crisis detection (System 2 priority)
        if vix > 35 or sp500_trend < -15:
            new_regime = MarketRegime.CRISIS
        # Bull regime
        elif sp500_trend > 5 and breadth > 60 and vix < 20:
            new_regime = MarketRegime.BULL
        # Bear regime
        elif sp500_trend < -5 and breadth < 40:
            new_regime = MarketRegime.BEAR
        # Transition (regime shift in progress)
        elif abs(sp500_trend) < 3 and 40 < breadth < 60:
            new_regime = MarketRegime.TRANSITION
        # Sideways
        else:
            new_regime = MarketRegime.SIDEWAYS
        
        # Track regime changes
        if new_regime != self.strategic.regime:
            self.strategic.last_regime_change = datetime.now(timezone.utc)
            self.strategic.regime_duration_days = 0
            # On regime change, release all risk budget
            self.strategic.risk_spent_pct = 0.0
        
        self.strategic.regime = new_regime
        self.strategic.last_strategic_review = datetime.now(timezone.utc)
        
        return new_regime
    
    async def update_timeframe_alignment(self, multi_tf_data: dict) -> float:
        """
        System 2: Check if all timeframes agree.
        Returns -1 (all bearish) to +1 (all bullish).
        """
        signals = []
        
        for tf_key in ["weekly", "daily", "h4"]:
            tf_data = multi_tf_data.get(tf_key, {})
            ema_trend = tf_data.get("ema_trend", 0)  # -1, 0, +1
            signals.append(ema_trend)
        
        if not signals:
            return 0.0
        
        alignment = sum(signals) / len(signals)
        self.strategic.timeframe_alignment = alignment
        
        return alignment
    
    def set_risk_budget(self, total_pct: float, max_per_trade_pct: float):
        """System 2: Set risk budget for System 1 to spend."""
        self.strategic.risk_budget_pct = total_pct
        self.strategic.max_position_size_pct = max_per_trade_pct
    
    def get_system2_context(self) -> dict:
        """
        Package System 2's world model for System 1 to use.
        System 1 operates WITHIN these constraints.
        """
        return {
            "regime": self.strategic.regime.value,
            "regime_confidence": self.strategic.regime_confidence,
            "aggression_multiplier": self.strategic.get_aggression_multiplier(),
            "risk_budget_remaining_pct": (
                self.strategic.risk_budget_pct - self.strategic.risk_spent_pct
            ),
            "max_position_pct": self.strategic.max_position_size_pct,
            "timeframe_alignment": self.strategic.timeframe_alignment,
            "weekly_trend": self.strategic.weekly_trend,
            "daily_trend": self.strategic.daily_trend,
            "h4_trend": self.strategic.h4_trend,
            "sector_rotation": self.strategic.sector_rotation_signal,
            "correlation_breakdown": self.strategic.correlation_breakdown,
        }
    
    # ========================================================
    # SYSTEM 1 METHODS (Fast — call every tick/candle)
    # ========================================================
    
    async def generate_tactical_signal(
        self,
        symbol: str,
        technical_data: dict,
        timeframe: TimeFrame = TimeFrame.INTRADAY
    ) -> TacticalSignal:
        """
        System 1: Generate a fast tactical signal.
        Must respect System 2's constraints.
        """
        # Get System 2 context
        ctx = self.get_system2_context()
        
        # Extract technical indicators
        rsi = technical_data.get("rsi", 50)
        macd = technical_data.get("macd_histogram", 0)
        ema9 = technical_data.get("ema9", 0)
        ema21 = technical_data.get("ema21", 0)
        ema50 = technical_data.get("ema50", 0)
        current_price = technical_data.get("price", 0)
        atr = technical_data.get("atr", 0)
        
        # System 1 signal logic (fast, reactive)
        direction = "hold"
        confidence = 0.0
        
        # EMA alignment check
        ema_aligned_bull = ema9 > ema21 > ema50
        ema_aligned_bear = ema9 < ema21 < ema50
        
        # RSI signals
        rsi_oversold = rsi < 30
        rsi_overbought = rsi > 70
        
        # MACD confirmation
        macd_bullish = macd > 0
        macd_bearish = macd < 0
        
        # BUY signal: EMA aligned up + RSI recovery + MACD bullish
        if ema_aligned_bull and rsi > 35 and rsi < 65 and macd_bullish:
            direction = "buy"
            confidence = 0.7 + (0.1 if rsi_oversold else 0) + (0.1 if ctx["timeframe_alignment"] > 0.5 else 0)
        
        # SELL signal: EMA aligned down + RSI declining + MACD bearish
        elif ema_aligned_bear and rsi < 65 and rsi > 35 and macd_bearish:
            direction = "sell"
            confidence = 0.7 + (0.1 if rsi_overbought else 0) + (0.1 if ctx["timeframe_alignment"] < -0.5 else 0)
        
        # Apply System 2's aggression multiplier
        confidence *= ctx["aggression_multiplier"]
        
        # Calculate entry/exit levels using ATR
        stop_multiplier = 1.5
        tp1_multiplier = 2.0
        tp2_multiplier = 3.5
        
        entry = current_price
        if direction == "buy":
            stop_loss = entry - (atr * stop_multiplier)
            tp1 = entry + (atr * tp1_multiplier)
            tp2 = entry + (atr * tp2_multiplier)
        elif direction == "sell":
            stop_loss = entry + (atr * stop_multiplier)
            tp1 = entry - (atr * tp1_multiplier)
            tp2 = entry - (atr * tp2_multiplier)
        else:
            stop_loss = tp1 = tp2 = 0
        
        # Risk/reward
        risk = abs(entry - stop_loss)
        reward = abs(tp1 - entry)
        rr = reward / risk if risk > 0 else 0
        
        # Position sizing: System 1 asks System 2 for budget
        risk_pct = min(
            ctx["max_position_pct"] * confidence,
            ctx["risk_budget_remaining_pct"]
        )
        
        # Create signal
        signal = TacticalSignal(
            symbol=symbol,
            direction=direction,
            confidence=min(confidence, 1.0),
            timeframe=timeframe,
            entry_price=entry,
            stop_loss=stop_loss,
            take_profit_1=tp1,
            take_profit_2=tp2,
            risk_reward=rr,
            rsi=rsi,
            macd_signal="bullish" if macd_bullish else "bearish" if macd_bearish else "neutral",
            ema_alignment="aligned_up" if ema_aligned_bull else "aligned_down" if ema_aligned_bear else "mixed",
            volume_confirmation=technical_data.get("volume_above_avg", False),
        )
        
        # System 2 approval: check if signal aligns with regime
        signal.strategic_approved = self._check_strategic_alignment(signal, ctx)
        
        if signal.strategic_approved and direction != "hold":
            # Allocate risk budget
            if self.strategic.allocate_risk(risk_pct):
                signal.risk_allocated_pct = risk_pct
            else:
                signal.strategic_approved = False  # Over budget
        
        self.tactical_history.append(signal)
        return signal
    
    def _check_strategic_alignment(self, signal: TacticalSignal, ctx: dict) -> bool:
        """
        System 2 veto: Does this signal make sense given the regime?
        """
        regime = ctx["regime"]
        
        # In crisis mode, only allow hedges
        if regime == "crisis":
            return signal.direction == "sell" and signal.confidence > 0.8
        
        # In bear regime, favor shorts
        if regime == "bear":
            if signal.direction == "buy" and signal.confidence < 0.8:
                return False
        
        # In sideways, favor mean-reversion signals
        if regime == "sideways":
            if signal.risk_reward < 2.0:
                return False
        
        # Check timeframe alignment agreement
        alignment = ctx["timeframe_alignment"]
        if signal.direction == "buy" and alignment < -0.3:
            return False  # Fighting the trend
        if signal.direction == "sell" and alignment > 0.3:
            return False
        
        return True
    
    # ========================================================
    # FEEDBACK LOOP (HRM's key innovation)
    # ========================================================
    
    def record_outcome(self, signal: TacticalSignal, outcome: dict):
        """
        System 1 reports back to System 2.
        This is the temporal reasoning loop:
          System 2 sets context → System 1 acts → Outcome → System 2 learns
        """
        feedback = {
            "signal_time": signal.signal_time,
            "symbol": signal.symbol,
            "direction": signal.direction,
            "confidence": signal.confidence,
            "regime_at_signal": self.strategic.regime.value,
            "outcome": outcome,  # {"pnl": float, "win": bool, "hold_time": str}
            "strategic_approved": signal.strategic_approved,
        }
        
        self.feedback_buffer.append(feedback)
        
        # Release risk budget
        if signal.risk_allocated_pct > 0:
            self.strategic.release_risk(signal.risk_allocated_pct)
    
    async def strategic_review(self) -> dict:
        """
        System 2: Weekly review of System 1's performance.
        Adjust strategy based on outcomes.
        """
        if not self.feedback_buffer:
            return {"status": "no_data"}
        
        wins = sum(1 for f in self.feedback_buffer if f["outcome"].get("win", False))
        total = len(self.feedback_buffer)
        win_rate = wins / total if total > 0 else 0
        
        # Adjust aggression based on recent performance
        if win_rate > 0.7:
            # Performing well — maintain or increase aggression
            self.strategic.risk_budget_pct = min(5.0, self.strategic.risk_budget_pct * 1.1)
        elif win_rate < 0.4:
            # Performing poorly — reduce risk
            self.strategic.risk_budget_pct = max(0.5, self.strategic.risk_budget_pct * 0.8)
        
        review = {
            "period_trades": total,
            "win_rate": win_rate,
            "new_risk_budget": self.strategic.risk_budget_pct,
            "regime": self.strategic.regime.value,
            "recommendation": "increase_aggression" if win_rate > 0.7 else "decrease_aggression" if win_rate < 0.4 else "maintain",
        }
        
        # Clear feedback buffer after review
        self.feedback_buffer.clear()
        
        return review


# ============================================================
# SINGLETON INSTANCE
# ============================================================
hrm_engine = HierarchicalReasoningEngine()
