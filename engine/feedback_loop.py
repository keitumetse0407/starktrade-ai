"""Feedback Loop — Auto-closes signals and updates agent confidence priors.

This is the LEARNING mechanism. Without it, the system never improves.

Flow (runs daily after signal generation):
  1. Check all active signals — did they hit TP, SL, or are they still open?
  2. Calculate actual PnL for closed signals
  3. Record outcomes in ContextMemory
  4. Update agent accuracy scores
  5. Detect concept drift
  6. Save memory to disk

Can also be run manually:
  python3 -m engine.feedback_loop --resolve
"""

import logging
import argparse
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd

from engine.context_memory import ContextMemory, SignalEntry
from engine.data_collector import GoldDataCollector
from engine.indicators import TechnicalIndicators

logger = logging.getLogger(__name__)


class FeedbackLoop:
    """
    Closes signals based on current market prices and updates agent scores.

    A signal is considered CLOSED when:
    - Price hit stop loss → loss (pnl = -(entry - SL) / entry * 100)
    - Price hit take profit 1 → partial win (pnl = (TP1 - entry) / entry * 100)
    - Price hit take profit 2 → full win (pnl = (TP2 - entry) / entry * 100)
    - Signal is older than 2 days and neither hit → evaluate at current price

    After closing, each agent's vote is scored:
    - Vote matched actual direction → correct
    - Vote opposed actual direction → wrong
    - Vote was neutral → no score (didn't commit)
    """

    def __init__(self, memory: Optional[ContextMemory] = None):
        self.memory = memory or ContextMemory.load()
        self.data = GoldDataCollector("GLD")
        self.indicators = TechnicalIndicators()

    def resolve_active_signalss(self) -> List[Dict]:
        """
        Check all active signals against current market prices.
        Returns list of resolution results.
        """
        # Fetch current price
        raw = self.data.get_historical_data(period="5d", interval="1d")
        if raw.empty:
            logger.warning("Cannot resolve signals — failed to fetch current data")
            return []

        df = self.indicators.calculate_all(raw)
        current_price = df["close"].iloc[-1]
        atr = df["atr_14"].iloc[-1]

        logger.info(f"Resolving signals against current price: {current_price:.2f}, ATR: {atr:.2f}")

        resolutions = []
        active_signals = [s for s in self.memory.signals if s.status in ("generated", "active", "sent")]

        for signal in active_signals:
            # Skip signals that have no trade levels (WATCH or NO_TRADE)
            if signal.direction not in ("BUY", "SELL"):
                continue

            # Skip signals that are too recent (give them time to play out)
            signal_date = datetime.fromisoformat(signal.date.replace(" UTC", "+00:00"))
            hours_old = (datetime.now(timezone.utc) - signal_date).total_seconds() / 3600
            if hours_old < 12:
                logger.debug(f"Signal {signal.id} is too recent ({hours_old:.0f}h old), skipping")
                continue

            # Check if signal is stale (>48h) — resolve at current price
            is_stale = hours_old > 48

            result = self._resolve_signal(signal, current_price, atr, is_stale)
            if result:
                resolutions.append(result)

        # Save memory after all resolutions
        if resolutions:
            self.memory.save()
            logger.info(f"Resolved {len(resolutions)} signals")

        return resolutions

    def _resolve_signal(
        self,
        signal: SignalEntry,
        current_price: float,
        atr: float,
        is_stale: bool = False,
    ) -> Optional[Dict]:
        """
        Resolve one signal. Returns resolution dict if closed, None if still active.
        """
        direction = signal.direction
        entry = signal.entry_price
        sl = signal.stop_loss
        tp1 = signal.take_profit_1
        tp2 = signal.take_profit_2

        if not all([entry, sl]):
            logger.warning(f"Signal {signal.id} missing entry/SL, marking as invalid")
            signal.status = "invalid"
            signal.outcome_notes = "Missing entry or stop loss"
            self.memory.record_outcome(signal.id, pnl_pct=0.0, notes="Invalid signal — missing levels")
            return {"signal_id": signal.id, "status": "invalid", "pnl_pct": 0.0}

        pnl_pct = None
        exit_reason = None

        if direction == "BUY":
            # Check if SL hit
            if current_price <= sl:
                pnl_pct = -(entry - sl) / entry * 100
                exit_reason = "stop_loss"
            # Check if TP2 hit (full win)
            elif current_price >= tp2:
                pnl_pct = (tp2 - entry) / entry * 100
                exit_reason = "take_profit_2"
            # Check if TP1 hit (partial win — count as 50% of full R:R)
            elif current_price >= tp1:
                pnl_pct = (tp1 - entry) / entry * 100
                exit_reason = "take_profit_1"
            # Stale signal — resolve at current price
            elif is_stale:
                pnl_pct = (current_price - entry) / entry * 100
                exit_reason = "stale_close"

        elif direction == "SELL":
            # Check if SL hit
            if current_price >= sl:
                pnl_pct = -(sl - entry) / entry * 100
                exit_reason = "stop_loss"
            # Check if TP2 hit (full win)
            elif current_price <= tp2:
                pnl_pct = (entry - tp2) / entry * 100
                exit_reason = "take_profit_2"
            # Check if TP1 hit (partial win)
            elif current_price <= tp1:
                pnl_pct = (entry - tp1) / entry * 100
                exit_reason = "take_profit_1"
            # Stale signal
            elif is_stale:
                pnl_pct = (entry - current_price) / entry * 100
                exit_reason = "stale_close"

        if pnl_pct is None:
            # Signal still active
            signal.status = "active"
            return None

        # Close the signal
        signal.outcome_pnl_pct = round(pnl_pct, 4)
        signal.outcome_notes = f"Exit: {exit_reason} at {current_price:.2f}"
        signal.status = "closed_win" if pnl_pct > 0 else "closed_loss"
        signal.closed_at = datetime.now(timezone.utc).isoformat()

        # Update context memory
        self.memory.record_outcome(
            signal_id=signal.id,
            pnl_pct=round(pnl_pct, 4),
            notes=f"Exit: {exit_reason} at {current_price:.2f}",
        )

        result = {
            "signal_id": signal.id,
            "date": signal.date,
            "direction": direction,
            "entry": entry,
            "exit_price": current_price,
            "exit_reason": exit_reason,
            "pnl_pct": round(pnl_pct, 4),
            "result": "WIN" if pnl_pct > 0 else "LOSS",
        }

        logger.info(
            f"Signal {signal.id}: {direction} @ {entry:.2f} → "
            f"{exit_reason} @ {current_price:.2f} = {pnl_pct:+.2f}% ({result['result']})"
        )

        return result

    def run_full_cycle(self) -> Dict:
        """
        Run the complete feedback cycle:
        1. Resolve active signals
        2. Detect concept drift
        3. Save memory
        4. Return summary
        """
        logger.info("Starting feedback loop cycle...")

        # Step 1: Resolve active signals
        resolutions = self.resolve_active_signals()

        # Step 2: Detect concept drift
        drift = self.memory.market_journal.detect_concept_drift()

        # Step 3: Get current context summary
        context = self.memory.get_context_summary()

        # Step 4: Save
        self.memory.save()

        return {
            "resolved_count": len(resolutions),
            "resolutions": resolutions,
            "concept_drift": drift,
            "context_summary": context,
        }

    def generate_daily_report(self, days: int = 30) -> Dict:
        """Generate a performance report for the last N days."""
        perf = self.memory.recent_performance(days=days)
        scoreboard = self.memory.agent_scoreboard_summary()
        drift = self.memory.market_journal.detect_concept_drift()

        return {
            "performance": perf,
            "agent_scoreboard": scoreboard,
            "market_context": {
                "current_regime": self.memory.market_journal.current_regime,
                "days_in_regime": self.memory.market_journal.days_in_current_regime,
                "regime_stability": self.memory.market_journal.regime_stability,
                "concept_drift": drift,
            },
            "system_state": self.memory.system_state,
        }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="StarkTrade AI Feedback Loop")
    parser.add_argument("--resolve", action="store_true", help="Resolve active signals")
    parser.add_argument("--report", action="store_true", help="Generate performance report")
    parser.add_argument("--days", type=int, default=30, help="Report period in days")
    parser.add_argument("--summary", action="store_true", help="Print context summary")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )

    loop = FeedbackLoop()

    if args.resolve:
        result = loop.run_full_cycle()
        if result["resolutions"]:
            print(f"\nResolved {result['resolved_count']} signals:")
            for r in result["resolutions"]:
                print(f"  {r['direction']} {r['entry']:.2f} → {r['exit_reason']} @ {r['exit_price']:.2f} = {r['pnl_pct']:+.2f}% ({r['result']})")
        else:
            print("No signals to resolve.")

        if result["concept_drift"]["drift_detected"]:
            print(f"\n⚠️ Concept drift detected:")
            for s in result["concept_drift"]["signals"]:
                print(f"  • {s}")

    if args.report:
        report = loop.generate_daily_report(days=args.days)
        perf = report["performance"]
        print(f"\n═══ {args.days}-DAY PERFORMANCE ═══")
        print(f"Signals: {perf.get('total_signals', 0)}")
        print(f"Wins: {perf.get('wins', 0)} | Losses: {perf.get('losses', 0)}")
        print(f"Win rate: {perf.get('win_rate', 0):.1f}%")
        print(f"Total PnL: {perf.get('total_pnl_pct', 0):+.2f}%")
        print(f"Profit factor: {perf.get('profit_factor', 0):.2f}")
        print(f"Win streak: {perf.get('consecutive_wins', 0)} | Loss streak: {perf.get('consecutive_losses', 0)}")

        print(f"\n═══ AGENT SCOREBOARD ═══")
        for agent in report["agent_scoreboard"]:
            print(f"  {agent['agent']}: {agent['accuracy']:.0%} (10d: {agent['accuracy_10d']:.0%}) | weight={agent['dynamic_weight']:.2f} | streak={agent['current_streak']:+d}")

    if args.summary:
        print(loop.memory.get_context_summary())

    if not args.resolve and not args.report and not args.summary:
        parser.print_help()


if __name__ == "__main__":
    main()
