"""Context Memory — The persistent brain of StarkTrade AI.

This is what makes the system intelligent across runs. Without it,
every signal is generated blind — no memory of yesterday, no learning
from outcomes, no awareness of streaks or regime changes.

Stores to disk (JSON) so it survives process restarts.
Loads automatically on startup.
"""

import json
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path

logger = logging.getLogger(__name__)

MEMORY_DIR = Path(__file__).parent / "memory"
MEMORY_DIR.mkdir(exist_ok=True)

SIGNAL_LOG_PATH = MEMORY_DIR / "signal_log.json"
AGENT_SCOREBOARD_PATH = MEMORY_DIR / "agent_scoreboard.json"
MARKET_JOURNAL_PATH = MEMORY_DIR / "market_journal.json"
SYSTEM_STATE_PATH = MEMORY_DIR / "system_state.json"


@dataclass
class SignalEntry:
    """One signal in the rolling log."""
    id: str
    date: str
    symbol: str
    direction: str  # BUY, SELL, WATCH, NO_TRADE
    entry_price: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    confidence: float
    consensus_score: str  # e.g. "3B/0S/1N"
    regime: str
    trend_direction: str
    agent_votes: List[Dict]  # [{agent, vote, confidence, reasoning}]
    status: str  # generated → active → closed_win / closed_loss / invalid
    outcome_pnl_pct: Optional[float] = None
    outcome_notes: Optional[str] = None
    closed_at: Optional[str] = None
    telegram_message_id: Optional[str] = None

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict) -> "SignalEntry":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class AgentPerformance:
    """Track one agent's recent accuracy."""
    agent: str
    total_votes: int = 0
    correct_votes: int = 0
    wrong_votes: int = 0
    last_10: List[bool] = field(default_factory=list)  # True=correct, False=wrong
    current_streak: int = 0  # Positive=win streak, negative=loss streak
    best_streak: int = 0
    worst_streak: int = 0
    avg_confidence_when_correct: float = 0.0
    avg_confidence_when_wrong: float = 0.0
    _correct_confidence_sum: float = 0.0
    _wrong_confidence_sum: float = 0.0

    @property
    def accuracy(self) -> float:
        if self.total_votes == 0:
            return 0.5  # Prior: neutral
        return self.correct_votes / self.total_votes

    @property
    def accuracy_last_10(self) -> float:
        if not self.last_10:
            return 0.5
        return sum(self.last_10) / len(self.last_10)

    @property
    def dynamic_weight(self) -> float:
        """
        How much this agent's vote should count RIGHT NOW.

        Combines long-term accuracy (60%) with recent form (40%).
        Returns 0.0 - 1.5 (1.0 = baseline, >1.0 = trusted, <1.0 = distrusted)
        """
        long_term = self.accuracy
        recent = self.accuracy_last_10

        # Bayesian shrinkage toward prior (0.5) for low sample sizes
        n = self.total_votes
        prior = 0.5
        k = 10  # Prior strength — how many imaginary 50/50 votes to add
        shrunk_long_term = (self.correct_votes + k * prior) / (n + k)
        shrunk_recent = (sum(self.last_10) + k * prior) / (len(self.last_10) + k) if self.last_10 else prior

        raw = 0.6 * shrunk_long_term + 0.4 * shrunk_recent

        # Map [0.3, 0.7] → [0.5, 1.5]
        weight = 0.5 + (raw - 0.3) / 0.4
        return round(max(0.3, min(1.5, weight)), 3)

    def record_outcome(self, was_correct: bool, confidence: float):
        """Record whether this agent's vote was right or wrong."""
        self.total_votes += 1
        if was_correct:
            self.correct_votes += 1
            self._correct_confidence_sum += confidence
        else:
            self.wrong_votes += 1
            self._wrong_confidence_sum += confidence

        self.last_10.append(was_correct)
        if len(self.last_10) > 10:
            self.last_10 = self.last_10[-10:]

        # Update streaks
        if was_correct:
            if self.current_streak > 0:
                self.current_streak += 1
            else:
                self.current_streak = 1
            self.best_streak = max(self.best_streak, self.current_streak)
        else:
            if self.current_streak < 0:
                self.current_streak -= 1
            else:
                self.current_streak = -1
            self.worst_streak = min(self.worst_streak, self.current_streak)

        # Update averages
        if self.correct_votes > 0:
            self.avg_confidence_when_correct = self._correct_confidence_sum / self.correct_votes
        if self.wrong_votes > 0:
            self.avg_confidence_when_wrong = self._wrong_confidence_sum / self.wrong_votes

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["accuracy"] = self.accuracy
        d["accuracy_last_10"] = self.accuracy_last_10
        d["dynamic_weight"] = self.dynamic_weight
        return d

    @classmethod
    def from_dict(cls, d: Dict) -> "AgentPerformance":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class RegimeEntry:
    """One day's regime classification in the market journal."""
    date: str
    regime: str
    trend_direction: str
    trend_strength: float
    volatility_state: str
    atr_state: str
    atr_ratio: float
    volume_state: str
    volume_ratio: float
    adx: float
    price: float
    days_in_regime: int = 0  # How many consecutive days in this regime


@dataclass
class MarketJournal:
    """
    The market's diary. Tracks regime history, streaks, and concept drift.

    Answers:
    - "What regime are we in and how long have we been here?"
    - "Has the regime been stable or flipping between states?"
    - "Is volatility expanding or contracting over time?"
    - "Has our model's accuracy degraded recently? (concept drift)"
    """
    entries: List[RegimeEntry] = field(default_factory=list)
    max_entries: int = 365  # Keep one year of history

    def add_entry(self, entry: RegimeEntry):
        """Add today's regime classification."""
        self.entries.append(entry)
        if len(self.entries) > self.max_entries:
            self.entries = self.entries[-self.max_entries:]
        self._update_days_in_regime()

    def _update_days_in_regime(self):
        """Recalculate consecutive days in current regime."""
        if not self.entries:
            return

        # Walk backwards from most recent
        current_regime = self.entries[-1].regime
        count = 0
        for entry in reversed(self.entries):
            if entry.regime == current_regime:
                entry.days_in_regime = count + 1
                count += 1
            else:
                break

    @property
    def current_regime(self) -> Optional[str]:
        return self.entries[-1].regime if self.entries else None

    @property
    def days_in_current_regime(self) -> int:
        return self.entries[-1].days_in_regime if self.entries else 0

    @property
    def regime_stability(self) -> float:
        """
        How stable has the regime been over the last 10 days?
        1.0 = same regime all 10 days
        0.0 = regime changed every single day
        """
        if len(self.entries) < 2:
            return 1.0

        recent = [e.regime for e in self.entries[-10:]]
        if not recent:
            return 1.0

        # Count how many days matched the previous day
        stable_days = sum(1 for i in range(1, len(recent)) if recent[i] == recent[i - 1])
        return stable_days / (len(recent) - 1)

    def get_regime_trend(self, window: int = 10) -> str:
        """
        What's the dominant regime trend over the last N days?
        Returns the most common regime.
        """
        if len(self.entries) < window:
            return self.current_regime or "unknown"

        recent = [e.regime for e in self.entries[-window:]]
        return max(set(recent), key=recent.count)

    def detect_concept_drift(self, window: int = 20) -> Dict[str, Any]:
        """
        Has the market behavior changed significantly?

        Concept drift = the relationships our model learned are no longer valid.
        Detected by:
        1. Regime flip-flopping (stability < 0.3 over 20 days)
        2. Volatility regime shift (avg ATR ratio changed by >50%)
        3. Trend direction change (was bullish for 10+ days, now bearish)
        """
        if len(self.entries) < window:
            return {"drift_detected": False, "reason": "Insufficient history"}

        recent = self.entries[-window:]
        older = self.entries[-(window*2):-window] if len(self.entries) >= window * 2 else []

        signals = []

        # 1. Regime stability
        stability = self.regime_stability
        if stability < 0.3:
            signals.append(f"Regime instability: stability={stability:.2f} over {window} days")

        # 2. Volatility shift
        recent_atr = [e.atr_ratio for e in recent]
        if older:
            older_atr = [e.atr_ratio for e in older]
            avg_recent_atr = sum(recent_atr) / len(recent_atr)
            avg_older_atr = sum(older_atr) / len(older_atr)
            if avg_older_atr > 0:
                atr_change = abs(avg_recent_atr - avg_older_atr) / avg_older_atr
                if atr_change > 0.5:
                    signals.append(f"Volatility regime shift: ATR ratio changed {atr_change:.0%} ({avg_older_atr:.2f} → {avg_recent_atr:.2f})")

        # 3. Trend direction change
        recent_trends = [e.trend_direction for e in recent]
        if older:
            older_trends = [e.trend_direction for e in older]
            recent_dominant = max(set(recent_trends), key=recent_trends.count)
            older_dominant = max(set(older_trends), key=older_trends.count)
            if recent_dominant != older_dominant:
                signals.append(f"Trend direction flip: {older_dominant} → {recent_dominant}")

        return {
            "drift_detected": len(signals) > 0,
            "signal_count": len(signals),
            "signals": signals,
            "regime_stability": round(stability, 3),
            "current_regime": self.current_regime,
            "days_in_regime": self.days_in_current_regime,
        }

    def to_dict(self) -> Dict:
        return {
            "entries": [asdict(e) for e in self.entries[-30:]],  # Last 30 for serialization
            "current_regime": self.current_regime,
            "days_in_current_regime": self.days_in_current_regime,
            "regime_stability_10d": round(self.regime_stability, 3),
            "max_entries": self.max_entries,
            "total_entries": len(self.entries),
        }

    @classmethod
    def from_dict(cls, d: Dict) -> "MarketJournal":
        journal = cls(max_entries=d.get("max_entries", 365))
        for entry_dict in d.get("entries", []):
            journal.entries.append(RegimeEntry(**entry_dict))
        return journal


class ContextMemory:
    """
    The persistent memory system. Loads/saves to disk automatically.

    Usage:
        memory = ContextMemory.load()
        memory.add_signal(signal_entry)
        memory.record_outcome(signal_id, pnl_pct=2.5, agent_outcomes={...})
        memory.add_regime(regime_entry)
        memory.save()

        # Query
        print(memory.recent_performance(days=30))
        print(memory.agent_scoreboard)
        print(memory.market_journal.detect_concept_drift())
    """

    def __init__(self):
        self.signals: List[SignalEntry] = []
        self.agents: Dict[str, AgentPerformance] = {
            "RegimeDetector": AgentPerformance(agent="RegimeDetector"),
            "QuantAgent": AgentPerformance(agent="QuantAgent"),
            "SentimentAgent": AgentPerformance(agent="SentimentAgent"),
            "PatternAgent": AgentPerformance(agent="PatternAgent"),
        }
        self.market_journal = MarketJournal()
        self.system_state = {
            "last_signal_at": None,
            "total_signals_generated": 0,
            "total_trades_taken": 0,
            "consecutive_losses": 0,
            "consecutive_wins": 0,
            "best_streak": 0,
            "worst_streak": 0,
            "last_restart_at": datetime.now(timezone.utc).isoformat(),
        }

    # ─── Persistence ─────────────────────────────────────────────────

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "ContextMemory":
        """Load memory from disk. Returns empty memory if files don't exist."""
        memory = cls()
        p = path or MEMORY_DIR

        # Load signal log
        signal_path = p / "signal_log.json"
        if signal_path.exists():
            try:
                with open(signal_path) as f:
                    data = json.load(f)
                memory.signals = [SignalEntry.from_dict(d) for d in data]
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Corrupted signal log: {e}. Starting fresh.")

        # Load agent scoreboard
        scoreboard_path = p / "agent_scoreboard.json"
        if scoreboard_path.exists():
            try:
                with open(scoreboard_path) as f:
                    data = json.load(f)
                for agent_name, agent_data in data.items():
                    if agent_name in memory.agents:
                        memory.agents[agent_name] = AgentPerformance.from_dict(agent_data)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Corrupted scoreboard: {e}. Starting fresh.")

        # Load market journal
        journal_path = p / "market_journal.json"
        if journal_path.exists():
            try:
                with open(journal_path) as f:
                    data = json.load(f)
                memory.market_journal = MarketJournal.from_dict(data)
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Corrupted market journal: {e}. Starting fresh.")

        # Load system state
        state_path = p / "system_state.json"
        if state_path.exists():
            try:
                with open(state_path) as f:
                    memory.system_state.update(json.load(f))
            except (json.JSONDecodeError, KeyError) as e:
                logger.warning(f"Corrupted system state: {e}.")

        logger.info(f"Context memory loaded: {len(memory.signals)} signals, "
                     f"{len(memory.market_journal.entries)} journal entries")
        return memory

    def save(self, path: Optional[Path] = None):
        """Save all memory to disk."""
        p = path or MEMORY_DIR
        p.mkdir(exist_ok=True)

        # Signal log
        with open(p / "signal_log.json", "w") as f:
            json.dump([s.to_dict() for s in self.signals], f, indent=2)

        # Agent scoreboard
        with open(p / "agent_scoreboard.json", "w") as f:
            json.dump({name: agent.to_dict() for name, agent in self.agents.items()}, f, indent=2)

        # Market journal
        with open(p / "market_journal.json", "w") as f:
            json.dump(self.market_journal.to_dict(), f, indent=2)

        # System state
        with open(p / "system_state.json", "w") as f:
            json.dump(self.system_state, f, indent=2)

        logger.info(f"Context memory saved: {len(self.signals)} signals, "
                     f"{len(self.market_journal.entries)} journal entries")

    # ─── Signal Operations ───────────────────────────────────────────

    def add_signal(self, signal: SignalEntry):
        """Record a new signal."""
        self.signals.append(signal)
        self.system_state["last_signal_at"] = datetime.now(timezone.utc).isoformat()
        self.system_state["total_signals_generated"] = len(self.signals)

        if signal.direction in ("BUY", "SELL"):
            self.system_state["total_trades_taken"] += 1

    def record_outcome(self, signal_id: str, pnl_pct: float, notes: Optional[str] = None):
        """
        Record the outcome of a signal and update agent performance.

        This is the LEARNING mechanism. Each outcome updates:
        - Signal status (closed_win/closed_loss)
        - Agent accuracy scores
        - System streak counters
        """
        # Find the signal
        signal = next((s for s in self.signals if s.id == signal_id), None)
        if not signal:
            logger.warning(f"Signal {signal_id} not found for outcome recording")
            return

        signal.outcome_pnl_pct = pnl_pct
        signal.outcome_notes = notes
        signal.closed_at = datetime.now(timezone.utc).isoformat()
        signal.status = "closed_win" if pnl_pct > 0 else "closed_loss"

        was_win = pnl_pct > 0

        # Update system streaks
        if was_win:
            if self.system_state["consecutive_losses"] > 0:
                self.system_state["consecutive_losses"] = 0
            self.system_state["consecutive_wins"] += 1
            self.system_state["best_streak"] = max(
                self.system_state["best_streak"],
                self.system_state["consecutive_wins"],
            )
        else:
            if self.system_state["consecutive_wins"] > 0:
                self.system_state["consecutive_wins"] = 0
            self.system_state["consecutive_losses"] += 1
            self.system_state["worst_streak"] = min(
                self.system_state["worst_streak"],
                -self.system_state["consecutive_losses"],
            )

        # Update each agent that voted on this signal
        for vote in signal.agent_votes:
            agent_name = vote.get("agent", "")
            if agent_name not in self.agents:
                continue

            agent = self.agents[agent_name]
            vote_dir = vote.get("vote", "neutral")  # bullish/bearish/neutral
            actual_dir = "bullish" if pnl_pct > 0 else "bearish"

            # Was this agent's vote correct?
            if vote_dir == "no_trade" or vote_dir == "neutral":
                # Agent said no trade — neutral, don't penalize or reward
                continue

            was_correct = vote_dir == actual_dir
            agent.record_outcome(was_correct, vote.get("confidence", 0.5))

        logger.info(
            f"Signal {signal_id}: {'WIN' if was_win else 'LOSS'} "
            f"({pnl_pct:+.2f}%) | Streak: W{self.system_state['consecutive_wins']}/"
            f"L{self.system_state['consecutive_losses']}"
        )

    # ─── Market Journal Operations ────────────────────────────────────

    def add_regime_entry(self, entry: RegimeEntry):
        """Record today's regime classification."""
        self.market_journal.add_entry(entry)

    # ─── Query Methods ────────────────────────────────────────────────

    def recent_performance(self, days: int = 30) -> Dict[str, Any]:
        """Get performance stats for the last N days."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_str = cutoff.isoformat()

        recent_signals = [
            s for s in self.signals
            if s.closed_at and s.closed_at >= cutoff_str and s.direction in ("BUY", "SELL")
        ]

        if not recent_signals:
            return {
                "period_days": days,
                "total_signals": 0,
                "message": "No closed signals in period",
            }

        wins = [s for s in recent_signals if s.outcome_pnl_pct and s.outcome_pnl_pct > 0]
        losses = [s for s in recent_signals if s.outcome_pnl_pct is not None and s.outcome_pnl_pct <= 0]

        total_pnl = sum(s.outcome_pnl_pct for s in recent_signals if s.outcome_pnl_pct is not None)
        avg_win = sum(s.outcome_pnl_pct for s in wins) / len(wins) if wins else 0
        avg_loss = sum(s.outcome_pnl_pct for s in losses) / len(losses) if losses else 0

        gross_profit = sum(s.outcome_pnl_pct for s in wins)
        gross_loss = abs(sum(s.outcome_pnl_pct for s in losses))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf")

        return {
            "period_days": days,
            "total_signals": len(recent_signals),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": round(len(wins) / len(recent_signals) * 100, 1) if recent_signals else 0,
            "total_pnl_pct": round(total_pnl, 2),
            "avg_win_pct": round(avg_win, 2),
            "avg_loss_pct": round(avg_loss, 2),
            "profit_factor": round(profit_factor, 2),
            "consecutive_wins": self.system_state["consecutive_wins"],
            "consecutive_losses": self.system_state["consecutive_losses"],
            "best_streak": self.system_state["best_streak"],
            "worst_streak": abs(self.system_state["worst_streak"]),
        }

    def agent_scoreboard_summary(self) -> List[Dict]:
        """Get all agents sorted by dynamic weight (most trusted first)."""
        return sorted(
            [
                {
                    "agent": name,
                    "accuracy": round(agent.accuracy, 3),
                    "accuracy_10d": round(agent.accuracy_last_10, 3),
                    "total_votes": agent.total_votes,
                    "current_streak": agent.current_streak,
                    "best_streak": agent.best_streak,
                    "worst_streak": agent.worst_streak,
                    "dynamic_weight": agent.dynamic_weight,
                }
                for name, agent in self.agents.items()
            ],
            key=lambda x: x["dynamic_weight"],
            reverse=True,
        )

    def get_context_summary(self) -> str:
        """Generate a human-readable context summary for the orchestrator."""
        lines = []

        # System state
        lines.append("═══ SYSTEM STATE ═══")
        lines.append(f"Total signals generated: {self.system_state['total_signals_generated']}")
        lines.append(f"Total trades taken: {self.system_state['total_trades_taken']}")
        lines.append(f"Current win streak: {self.system_state['consecutive_wins']}")
        lines.append(f"Current loss streak: {self.system_state['consecutive_losses']}")
        lines.append(f"Best streak: W{self.system_state['best_streak']}")
        lines.append(f"Worst streak: L{abs(self.system_state['worst_streak'])}")
        lines.append("")

        # Recent performance
        perf = self.recent_performance(days=30)
        if perf["total_signals"] > 0:
            lines.append("═══ 30-DAY PERFORMANCE ═══")
            lines.append(f"Signals: {perf['total_signals']} | Wins: {perf['wins']} | Losses: {perf['losses']}")
            lines.append(f"Win rate: {perf['win_rate']}%")
            lines.append(f"Total PnL: {perf['total_pnl_pct']:+.1f}%")
            lines.append(f"Profit factor: {perf['profit_factor']}")
            lines.append("")

        # Agent scoreboard
        lines.append("═══ AGENT SCOREBOARD ═══")
        for agent in self.agent_scoreboard_summary():
            streak_icon = "🔥" if agent["current_streak"] > 2 else "❄️" if agent["current_streak"] < -2 else ""
            lines.append(
                f"  {agent['agent']}: {agent['accuracy']:.0%} accuracy "
                f"(10d: {agent['accuracy_10d']:.0%}) | "
                f"weight={agent['dynamic_weight']:.2f} | "
                f"streak={agent['current_streak']:+d} {streak_icon}"
            )
        lines.append("")

        # Market journal
        journal = self.market_journal
        if journal.entries:
            lines.append("═══ MARKET CONTEXT ═══")
            lines.append(f"Current regime: {journal.current_regime} ({journal.days_in_current_regime} days)")
            lines.append(f"Regime stability (10d): {journal.regime_stability:.0%}")

            drift = journal.detect_concept_drift()
            if drift["drift_detected"]:
                lines.append(f"⚠️ CONCEPT DRIFT DETECTED ({drift['signal_count']} signals):")
                for signal in drift["signals"]:
                    lines.append(f"   • {signal}")
            else:
                lines.append("✅ No concept drift detected")
        lines.append("")

        return "\n".join(lines)
