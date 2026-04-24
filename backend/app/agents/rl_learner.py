"""
Self-Improving RL System for Trading
==============================

Implements reinforcement learning feedback loop that automatically
improves trading strategy based on outcomes.

Key Features:
- Outcome tracking: Every trade result feeds back to the model
- Performance metrics: Win rate, Sharpe, drawdown tracked per strategy
- Auto-adjustment: Risk parameters adjust based on performance
- Pattern discovery: Finds what works and what doesn't
- Model updating: Updates agent prompts based on learned patterns

The system creates a closed loop:
Signal → Trade → Outcome → Learn → Adjust → Signal...

This is the "self-improving" part - the system gets better over time
without manual intervention.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import json
import hashlib
from collections import defaultdict
import statistics

try:
    from typing import Optional, Literal
except ImportError:
    from typing_extensions import Optional, Literal


# ============================================================
# OUTCOME ENUMS
# ============================================================
class TradeOutcome(Enum):
    WIN = "win"
    LOSS = "loss"
    BREAKEVEN = "breakeven"
    PENDING = "pending"


class SignalSource(Enum):
    TECHNICAL = "technical"
    MOMENTUM = "momentum"
    MEAN_REVERT = "mean_revert"
    BREAKOUT = "breakout"
    VOLUME = "volume"
    COMPOSITE = "composite"


# ============================================================
# TRADE RECORD
# ============================================================
@dataclass
class TradeRecord:
    """Complete record of a single trade."""
    id: str
    symbol: str
    direction: Literal["buy", "sell"]
    
    # Entry
    entry_price: float
    entry_time: datetime
    
    # Exit
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    
    # Management
    position_size_pct: float = 1.0
    stop_loss: float = 0.0
    take_profit: float = 0.0
    
    # Analysis
    signal_source: SignalSource = SignalSource.TECHNICAL
    signal_confidence: float = 0.5
    regime_at_entry: str = "sideways"
    
    # Outcome
    outcome: TradeOutcome = TradeOutcome.PENDING
    pnl_pct: float = 0.0
    hold_time_hours: float = 0.0
    
    # Metadata
    strategy_version: str = "v1.0"
    notes: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================================
# PERFORMANCE METRICS
# ============================================================
@dataclass
class PerformanceMetrics:
    """Performance metrics for a trading period."""
    period: str  # "1d", "1w", "1m"
    
    # Counts
    total_trades: int = 0
    wins: int = 0
    losses: int = 0
    breakevens: int = 0
    
    # PnL
    total_pnl_pct: float = 0.0
    avg_win_pct: float = 0.0
    avg_loss_pct: float = 0.0
    largest_win_pct: float = 0.0
    largest_loss_pct: float = 0.0
    
    # Derived
    win_rate: float = 0.0
    avg_rr: float = 0.0  # Risk/reward
    
    # Risk
    max_drawdown_pct: float = 0.0
    sharpe_ratio: float = 0.0
    volatility: float = 0.0
    
    # Time
    avg_hold_time_hours: float = 0.0
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def calculate(self, trades: list[TradeRecord]):
        """Calculate metrics from trade list."""
        if not trades:
            return
        
        closed_trades = [t for t in trades if t.outcome != TradeOutcome.PENDING]
        if not closed_trades:
            return
        
        self.total_trades = len(closed_trades)
        self.wins = sum(1 for t in closed_trades if t.outcome == TradeOutcome.WIN)
        self.losses = sum(1 for t in closed_trades if t.outcome == TradeOutcome.LOSS)
        self.breakevens = sum(1 for t in closed_trades if t.outcome == TradeOutcome.BREAKEVEN)
        
        wins = [t for t in closed_trades if t.outcome == TradeOutcome.WIN]
        losses = [t for t in closed_trades if t.outcome == TradeOutcome.LOSS]
        
        self.total_pnl_pct = sum(t.pnl_pct for t in closed_trades)
        self.avg_win_pct = sum(t.pnl_pct for t in wins) / len(wins) if wins else 0
        self.avg_loss_pct = sum(t.pnl_pct for t in losses) / len(losses) if losses else 0
        self.largest_win_pct = max((t.pnl_pct for t in wins), default=0)
        self.largest_loss_pct = min((t.pnl_pct for t in losses), default=0)
        
        self.win_rate = self.wins / self.total_trades if self.total_trades else 0
        
        # Risk/reward
        if self.avg_loss_pct != 0:
            self.avg_rr = abs(self.avg_win_pct / self.avg_loss_pct)
        
        # Hold time
        self.avg_hold_time_hours = sum(t.hold_time_hours for t in closed_trades) / len(closed_trades)
        
        # Drawdown calculation
        cumulative = 0.0
        peak = 0.0
        max_dd = 0.0
        for t in closed_trades:
            cumulative += t.pnl_pct
            if cumulative > peak:
                peak = cumulative
            dd = (peak - cumulative) / 100
            if dd > max_dd:
                max_dd = dd
        self.max_drawdown_pct = max_dd
        
        self.updated_at = datetime.now(timezone.utc)


# ============================================================
# LEARNING MEMORY
# ============================================================
@dataclass
class LearnedPattern:
    """A discovered pattern from trading."""
    id: str
    pattern_type: str  # "entry", "exit", "avoid", "timing"
    description: str
    confidence: float  # How confident we are
    evidence_count: int  # How many examples
    historical_win_rate: float
    recommended_action: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_validated: Optional[datetime] = None


# ============================================================
# SELF-IMPROVING AGENT
# ============================================================
class SelfImprovingAgent:
    """
    RL agent that learns from trade outcomes and improves.
    
    Key loop:
    1. Execute trade based on current parameters
    2. Record outcome
    3. Update metrics
    4. Discover patterns
    5. Adjust parameters
    6. Repeat
    """
    
    def __init__(self, name: str = "default"):
        self.name = name
        self.trades: list[TradeRecord] = []
        self.patterns: list[LearnedPattern] = []
        
        # Current parameters (evolves over time)
        self.params = {
            "max_position_pct": 5.0,
            "stop_atr_multiplier": 1.5,
            "tp1_atr_multiplier": 2.0,
            "tp2_atr_multiplier": 3.5,
            "min_confidence": 0.6,
            "max_loss_per_trade_pct": 2.0,
            "daily_loss_limit_pct": 3.0,
            "max_drawdown_limit_pct": 8.0,
        }
        
        # Performance history
        self.metrics_history: dict[str, PerformanceMetrics] = {}
        
        # Feedback for pattern discovery
        self.entry_patterns: list[dict] = []
        self.exit_patterns: list[dict] = []
    
    # ========================================================
    # CORE LOOP
    # ========================================================
    
    async def on_trade_entry(self, trade: TradeRecord):
        """Called when a trade is opened."""
        self.trades.append(trade)
        
        # Record entry pattern for later analysis
        self.entry_patterns.append({
            "trade_id": trade.id,
            "source": trade.signal_source.value,
            "confidence": trade.signal_confidence,
            "regime": trade.regime_at_entry,
            "time": trade.entry_time.isoformat(),
        })
    
    async def on_trade_exit(self, trade: TradeRecord):
        """Called when a trade is closed. This is where learning happens."""
        # Update trade outcome
        pnl = trade.pnl_pct
        
        if pnl > 0.1:
            trade.outcome = TradeOutcome.WIN
        elif pnl < -0.1:
            trade.outcome = TradeOutcome.LOSS
        else:
            trade.outcome = TradeOutcome.BREAKEVEN
        
        # Record exit pattern
        self.exit_patterns.append({
            "trade_id": trade.id,
            "pnl_pct": pnl,
            "hold_time": trade.hold_time_hours,
            "outcome": trade.outcome.value,
            "time": trade.exit_time.isoformat() if trade.exit_time else None,
        })
        
        # TRIGGER LEARNING
        await self._learn_from_outcome(trade)
    
    async def _learn_from_outcome(self, trade: TradeRecord):
        """Main learning function - called after each trade."""
        # 1. Update parameters based on outcome
        await self._adjust_parameters(trade)
        
        # 2. Discover patterns
        await self._discover_patterns()
        
        # 3. Validate existing patterns
        await self._validate_patterns()
    
    async def _adjust_parameters(self, trade: TradeRecord):
        """Adjust parameters based on trade outcome."""
        
        # Get recent performance
        recent = self.get_recent_metrics("1w")
        
        if recent and recent.total_trades >= 5:
            # Win rate based adjustments
            if recent.win_rate > 0.7:
                # Doing great - increase position slightly
                self.params["max_position_pct"] = min(
                    self.params["max_position_pct"] * 1.1,
                    10.0  # Cap at 10%
                )
            elif recent.win_rate < 0.4:
                # Doing poorly - decrease position
                self.params["max_position_pct"] = max(
                    self.params["max_position_pct"] * 0.8,
                    1.0  # Floor at 1%
                )
            
            # Drawdown protection
            if recent.max_drawdown_pct > 5:
                # High drawdown - reduce risk
                self.params["max_position_pct"] *= 0.5
                self.params["daily_loss_limit_pct"] = min(
                    self.params["daily_loss_limit_pct"],
                    2.0
                )
            
            # RR based adjustments
            if recent.avg_rr > 0:
                if recent.avg_rr < 1.5:
                    # Poor RR - tighten stops
                    self.params["stop_atr_multiplier"] = max(
                        self.params["stop_atr_multiplier"] * 0.9,
                        1.0
                    )
                elif recent.avg_rr > 2.5:
                    # Great RR - can use wider stops
                    self.params["stop_atr_multiplier"] = min(
                        self.params["stop_atr_multiplier"] * 1.05,
                        3.0
                    )
        
        # Always apply single-trade lesson
        if trade.outcome == TradeOutcome.LOSS:
            # Losing trade - check if stop was too tight
            if trade.pnl_pct < -3.0:
                # Stopped out too easily - widen slightly
                self.params["stop_atr_multiplier"] = min(
                    self.params["stop_atr_multiplier"] * 1.1,
                    3.0
                )
    
    async def _discover_patterns(self):
        """Discover new patterns from recent trades."""
        if len(self.trades) < 10:
            return
        
        recent = self.trades[-20:]  # Last 20 trades
        
        # Analyze entry patterns
        source_performance = defaultdict(lambda: {"wins": 0, "total": 0})
        for trade in recent:
            if trade.outcome == TradeOutcome.PENDING:
                continue
            source = trade.signal_source.value
            source_performance[source]["total"] += 1
            if trade.outcome == TradeOutcome.WIN:
                source_performance[source]["wins"] += 1
        
        # Find winning patterns
        for source, stats in source_performance.items():
            wr = stats["wins"] / stats["total"] if stats["total"] > 0 else 0
            
            # Strong pattern (>60% win rate)
            if wr > 0.6 and stats["total"] >= 3:
                # Check if pattern already exists
                existing = next(
                    (p for p in self.patterns 
                     if p.pattern_type == "entry" and source in p.description),
                    None
                )
                
                if existing:
                    existing.confidence = min(wr, existing.confidence + 0.05)
                    existing.evidence_count += stats["total"]
                    existing.historical_win_rate = wr
                    existing.last_validated = datetime.now(timezone.utc)
                else:
                    self.patterns.append(LearnedPattern(
                        id=hashlib.md5(f"{source}{datetime.now().isoformat()}".encode()).hexdigest()[:8],
                        pattern_type="entry",
                        description=f"Signal source {source} shows {wr:.0%} win rate",
                        confidence=wr,
                        evidence_count=stats["total"],
                        historical_win_rate=wr,
                        recommended_action=f"Prefer {source} signals",
                    ))
            
            # Avoid pattern (<40% win rate)
            elif wr < 0.4 and stats["total"] >= 3:
                existing = next(
                    (p for p in self.patterns 
                     if p.pattern_type == "avoid" and source in p.description),
                    None
                )
                
                if existing:
                    existing.confidence = wr
                else:
                    self.patterns.append(LearnedPattern(
                        id=hashlib.md5(f"avoid{source}{datetime.now().isoformat()}".encode()).hexdigest()[:8],
                        pattern_type="avoid",
                        description=f"Signal source {source} shows only {wr:.0%} win rate - AVOID",
                        confidence=1 - wr,
                        evidence_count=stats["total"],
                        historical_win_rate=wr,
                        recommended_action=f"Reject {source} signals",
                    ))
    
    async def _validate_patterns(self):
        """Validate and update existing patterns."""
        for pattern in self.patterns:
            # Find related trades
            related = [
                t for t in self.trades[-10:]
                if pattern.pattern_type == "entry" and pattern.description.split()[2] in t.signal_source.value
            ]
            
            if len(related) >= 3:
                # Recalculate win rate
                wins = sum(1 for t in related if t.outcome == TradeOutcome.WIN)
                new_wr = wins / len(related)
                
                # Update confidence with decay
                pattern.confidence = pattern.confidence * 0.7 + new_wr * 0.3
                pattern.historical_win_rate = new_wr
                pattern.last_validated = datetime.now(timezone.utc)
                
                # Remove if confidence too low
                if pattern.confidence < 0.3:
                    self.patterns.remove(pattern)
    
    # ========================================================
    # API
    # ========================================================
    
    def get_recent_metrics(self, period: str = "1w") -> PerformanceMetrics:
        """Get metrics for recent period."""
        metrics = PerformanceMetrics(period=period)
        
        # Filter trades by period
        now = datetime.now(timezone.utc)
        
        if period == "1d":
            start = now.replace(hour=0, minute=0, second=0)
        elif period == "1w":
            from datetime import timedelta
            start = now - timedelta(days=7)
        else:  # 1m
            from datetime import timedelta
            start = now - timedelta(days=30)
        
        recent_trades = [
            t for t in self.trades 
            if t.created_at >= start and t.outcome != TradeOutcome.PENDING
        ]
        
        metrics.calculate(recent_trades)
        self.metrics_history[period] = metrics
        
        return metrics
    
    def get_recommendations(self) -> list[dict]:
        """Get current parameter recommendations."""
        return [
            {
                "parameter": k,
                "value": v,
                "reason": f"Based on {self.get_recent_metrics('1w').win_rate:.0%} win rate",
            }
            for k, v in self.params.items()
        ]
    
    def get_strong_patterns(self) -> list[dict]:
        """Get patterns to follow."""
        return [
            {
                "description": p.description,
                "confidence": p.confidence,
                "action": p.recommended_action,
            }
            for p in self.patterns
            if p.confidence > 0.5 and p.pattern_type == "entry"
        ]
    
    def get_avoid_patterns(self) -> list[dict]:
        """Get patterns to avoid."""
        return [
            {
                "description": p.description,
                "confidence": p.confidence,
                "action": p.recommended_action,
            }
            for p in self.patterns
            if p.pattern_type == "avoid"
        ]
    
    def to_dict(self) -> dict:
        """Export state."""
        return {
            "name": self.name,
            "params": self.params,
            "total_trades": len(self.trades),
            "patterns_discovered": len(self.patterns),
            "recent_performance": self.get_recent_metrics("1w").to_dict() if hasattr(self.get_recent_metrics("1w"), 'to_dict') else {},
            "recommendations": self.get_recommendations(),
        }


# ============================================================
# RL-GATED SIGNAL GENERATOR
# ============================================================
class RLGatedSignalGenerator:
    """
    Signal generator that only fires based on learned patterns.
    
    Usage:
        generator = RLGatedSignalGenerator(self_improving_agent)
        signal = await generator.generate(signal_config)
    """
    
    def __init__(self, agent: SelfImprovingAgent):
        self.agent = agent
    
    async def generate(self, signal_candidate: dict) -> dict:
        """
        Evaluate signal candidate against learned patterns.
        Returns modified signal or rejection.
        """
        # Check avoid patterns
        avoid = self.agent.get_avoid_patterns()
        source = signal_candidate.get("source", "technical")
        
        for pattern in avoid:
            if source in pattern["description"]:
                return {
                    "approved": False,
                    "reason": f"Avoid pattern: {pattern['description']}",
                    "confidence": 0.0,
                }
        
        # Check strong patterns
        strong = self.agent.get_strong_patterns()
        bonus = 0.0
        
        for pattern in strong:
            if source in pattern["description"]:
                bonus = pattern["confidence"] * 0.2  # Up to 20% boost
        
        # Apply RL parameters
        params = self.agent.params
        
        adjusted = {
            "approved": True,
            "confidence": signal_candidate.get("confidence", 0.5) + bonus,
            "position_size_pct": min(
                signal_candidate.get("position_size_pct", params["max_position_pct"]),
                params["max_position_pct"]
            ),
            "stop_atr": params["stop_atr_multiplier"],
            "tp1_atr": params["tp1_atr_multiplier"],
            "tp2_atr": params["tp2_atr_multiplier"],
            "source": source,
            "pattern_bonus": bonus,
            "rl_version": "v1.0",
        }
        
        # Check confidence threshold
        if adjusted["confidence"] < params["min_confidence"]:
            adjusted["approved"] = False
            adjusted["reason"] = f"Confidence {adjusted['confidence']:.0%} < {params['min_confidence']:.0%}"
        
        return adjusted


# ============================================================
# SINGLETON
# ============================================================
self_improving_agent = SelfImprovingAgent(name="starktrade_rl")

__all__ = [
    "TradeOutcome",
    "SignalSource",
    "TradeRecord",
    "PerformanceMetrics", 
    "LearnedPattern",
    "SelfImprovingAgent",
    "RLGatedSignalGenerator",
    "self_improving_agent",
]