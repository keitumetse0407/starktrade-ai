"""Signal Orchestrator — The brain that coordinates all 4 agents.

Architecture:
  1. Load context memory — recent performance, agent scores, market journal
  2. RegimeDetector classifies market state (TRENDING/BREAKOUT/RANGE/ROTATIONAL)
  3. All 4 agents run: Quant, Sentiment, Pattern, Regime
  4. ConsensusEngine: votes weighted by agent dynamic performance
  5. RiskAgent builds TradePlan with entry/SL/TP/position size
  6. SignalFormatter outputs Telegram-ready signal message
  7. Save signal + regime to context memory for future learning

No LLM. No external API. Pure Python, pandas, sklearn.
Learns from every outcome.
"""

import uuid
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List
from dataclasses import dataclass, field

from engine.regime_detector import RegimeDetector, MarketRegime, RegimeResult
from engine.quant_agent import QuantAgent
from engine.sentiment_agent import SentimentAgent
from engine.pattern_agent import PatternAgent
from engine.risk_agent import RiskAgent, TradePlan
from engine.indicators import TechnicalIndicators
from engine.data_collector import GoldDataCollector
from engine.context_memory import (
    ContextMemory,
    SignalEntry,
    RegimeEntry,
    AgentPerformance,
)

logger = logging.getLogger(__name__)


# ─── Vote Types ───────────────────────────────────────────────────────────

@dataclass
class AgentVote:
    """One agent's vote on direction."""
    agent: str
    vote: str           # "bullish" | "bearish" | "neutral" | "no_trade"
    confidence: float   # 0.0 - 1.0
    reasoning: str      # Why this vote


@dataclass
class ConsensusResult:
    """The consensus from all agent votes."""
    direction: str          # "BUY" | "SELL" | "WATCH" | "NO_TRADE"
    votes: List[AgentVote]
    bullish_count: int
    bearish_count: int
    neutral_count: int
    avg_confidence: float
    regime: RegimeResult
    rationale: str


@dataclass
class FinalSignal:
    """The final formatted signal ready for delivery."""
    symbol: str
    date: str
    regime: str
    direction: str
    entry: float
    stop_loss: float
    take_profit_1: float
    take_profit_2: float
    position_size_pct: float
    risk_amount: float
    rrr: float
    confidence: float
    consensus_score: str  # e.g. "3/4 bullish"
    agent_votes: List[AgentVote]
    rationale: str
    invalidation: str
    message: str  # Telegram-formatted message


# ─── Orchestrator ─────────────────────────────────────────────────────────

class SignalOrchestrator:
    """
    Coordinates all 4 agents to produce a single validated signal.

    Flow:
      1. Fetch data → calculate indicators
      2. Run RegimeDetector → classify market state
      3. Run QuantAgent → ML prediction
      4. Run SentimentAgent → news sentiment
      5. Run PatternAgent → candlestick patterns
      6. Vote → consensus → trade plan → formatted signal
    """

    def __init__(self, account_balance: float = 100_000):
        self.data = GoldDataCollector("GLD")
        self.indicators = TechnicalIndicators()
        self.regime = RegimeDetector()
        self.quant = QuantAgent()
        self.sentiment = SentimentAgent()
        self.pattern = PatternAgent()
        self.risk = RiskAgent(account_balance=account_balance)

        # Load context memory — survives across runs
        self.memory = ContextMemory.load()

        # Load trained models if available
        if not self.quant.load():
            logger.warning("No trained quant models found. Signals will use default weights.")

    def generate_signal(self, df: Optional[pd.DataFrame] = None) -> FinalSignal:
        """
        Generate a complete signal from raw data to formatted output.

        Args:
            df: Optional pre-fetched OHLCV DataFrame. If None, fetches live data.

        Returns:
            FinalSignal with entry/SL/TP/rationale/Telegram message
        """
        # Step 1: Fetch data and calculate indicators
        if df is None:
            logger.info("Fetching live data from Yahoo Finance...")
            raw = self.data.get_historical_data(period="2y", interval="1d")
            if raw.empty:
                return self._error_signal("Failed to fetch market data")
        else:
            raw = df

        logger.info(f"Calculating indicators on {len(raw)} bars...")
        df = self.indicators.calculate_all(raw)

        # Drop rows with NaN from indicators (first 200 bars for EMA200)
        df = df.dropna()
        if len(df) < 50:
            return self._error_signal(f"Insufficient clean data ({len(df)} bars after indicator calc)")

        current_price = df["close"].iloc[-1]
        atr = df["atr_14"].iloc[-1]

        logger.info(f"Current price: {current_price:.2f}, ATR(14): {atr:.2f}")

        # Step 2: Run all agents
        logger.info("Running regime detector...")
        regime_result = self.regime.detect(df)

        logger.info("Running quant agent...")
        quant_result = self.quant.predict(df) or {
            "agent": "QuantAgent",
            "signal": "HOLD",
            "confidence": 0.5,
            "p_up": 0.5,
            "p_down": 0.5,
        }

        logger.info("Running sentiment agent...")
        sentiment_result = self.sentiment.get_sentiment()

        logger.info("Running pattern agent...")
        patterns = self.pattern.detect_patterns(df, lookback=10)
        pattern_result = self.pattern.summarize(
            patterns,
            trend_context=regime_result.trend_direction,
            df=df,
        )

        # Step 3: Convert agent outputs to votes
        votes = self._collect_votes(
            regime=regime_result,
            quant=quant_result,
            sentiment=sentiment_result,
            pattern=pattern_result,
            current_price=current_price,
        )

        # Step 3b: Apply dynamic weights from context memory
        votes = self._apply_dynamic_weights(votes)
        logger.info(
            f"Dynamic weights applied: "
            + ", ".join(
                f"{v.agent}={self.memory.agents.get(v.agent, AgentPerformance(v.agent)).dynamic_weight:.2f}"
                for v in votes
            )
        )

        # Step 4: Reach consensus
        consensus = self._reach_consensus(
            votes=votes,
            regime=regime_result,
        )

        # Step 5: Build trade plan (if consensus warrants it)
        trade_plan = None
        if consensus.direction in ("BUY", "SELL"):
            rationale = self._build_rationale(consensus, regime_result)
            trade_plan = self.risk.build_trade_plan(
                direction=consensus.direction,
                entry=current_price,
                atr=atr,
                confidence=consensus.avg_confidence,
                rationale=rationale,
            )

        # Step 6: Format final signal
        signal = self._format_signal(
            consensus=consensus,
            regime=regime_result,
            trade_plan=trade_plan,
            current_price=current_price,
            atr=atr,
            quant=quant_result,
            sentiment=sentiment_result,
            pattern=pattern_result,
            patterns=patterns,
        )

        # Step 7: Record to context memory (persistent learning)
        signal_id = str(uuid.uuid4())[:8]
        signal_entry = SignalEntry(
            id=signal_id,
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            symbol=signal.symbol,
            direction=signal.direction,
            entry_price=signal.entry,
            stop_loss=signal.stop_loss,
            take_profit_1=signal.take_profit_1,
            take_profit_2=signal.take_profit_2,
            confidence=signal.confidence,
            consensus_score=signal.consensus_score,
            regime=signal.regime,
            trend_direction=regime_result.trend_direction,
            agent_votes=[
                {"agent": v.agent, "vote": v.vote, "confidence": v.confidence, "reasoning": v.reasoning}
                for v in signal.agent_votes
            ],
            status="generated",
        )
        self.memory.add_signal(signal_entry)

        # Record regime in market journal
        regime_entry = RegimeEntry(
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            regime=regime_result.regime.value,
            trend_direction=regime_result.trend_direction,
            trend_strength=regime_result.trend_strength,
            volatility_state=regime_result.volatility_state,
            atr_state=regime_result.atr_state,
            atr_ratio=regime_result.atr_ratio,
            volume_state=regime_result.volume_state,
            volume_ratio=regime_result.volume_ratio,
            adx=regime_result.trend_strength * 50,  # Approximate ADX from strength
            price=current_price,
        )
        self.memory.add_regime_entry(regime_entry)

        # Save memory to disk
        self.memory.save()

        logger.info(
            f"Signal {signal_id}: {signal.direction} | Consensus: {signal.consensus_score} | "
            f"Memory: {len(self.memory.signals)} total signals, "
            f"regime={regime_result.regime.value} ({self.memory.market_journal.days_in_current_regime}d)"
        )
        return signal

    def _collect_votes(
        self,
        regime: RegimeResult,
        quant: Dict,
        sentiment: Dict,
        pattern: Dict,
        current_price: float,
    ) -> List[AgentVote]:
        """Convert each agent's output into a standardized vote."""
        votes = []

        # ── Regime Agent Vote ──
        # Regime doesn't vote direction directly — it votes based on trend
        if regime.regime == MarketRegime.ROTATIONAL:
            votes.append(AgentVote(
                agent="RegimeDetector",
                vote="no_trade",
                confidence=regime.confidence,
                reasoning=f"Regime unclear ({regime.regime.value}). Stay out.",
            ))
        elif regime.regime == MarketRegime.RANGE:
            # Range = mean reversion bias — slight contrarian lean
            votes.append(AgentVote(
                agent="RegimeDetector",
                vote="neutral",
                confidence=regime.confidence * 0.5,
                reasoning=f"Range market (ADX={regime.trend_strength:.0f}). Fade edges only.",
            ))
        else:
            # TRENDING or BREAKOUT — vote with trend direction
            votes.append(AgentVote(
                agent="RegimeDetector",
                vote=regime.trend_direction if regime.trend_direction != "neutral" else "neutral",
                confidence=regime.confidence,
                reasoning=f"{regime.regime.value.upper()} market, {regime.trend_direction} trend (ADX={regime.trend_strength:.0f}).",
            ))

        # ── Quant Agent Vote ──
        if quant["signal"] == "BUY":
            votes.append(AgentVote(
                agent="QuantAgent",
                vote="bullish",
                confidence=quant["confidence"],
                reasoning=f"ML ensemble predicts UP (p_up={quant['p_up']:.3f}, p_down={quant['p_down']:.3f}).",
            ))
        elif quant["signal"] == "SELL":
            votes.append(AgentVote(
                agent="QuantAgent",
                vote="bearish",
                confidence=quant["confidence"],
                reasoning=f"ML ensemble predicts DOWN (p_up={quant['p_up']:.3f}, p_down={quant['p_down']:.3f}).",
            ))
        else:
            votes.append(AgentVote(
                agent="QuantAgent",
                vote="neutral",
                confidence=max(quant["p_up"], quant["p_down"]),
                reasoning=f"ML ensemble: no clear direction (p_up={quant['p_up']:.3f}, p_down={quant['p_down']:.3f}). 200 EMA filter active.",
            ))

        # ── Sentiment Agent Vote ──
        pol = sentiment.get("polarity", 0)
        if sentiment["overall_sentiment"] == "bullish":
            votes.append(AgentVote(
                agent="SentimentAgent",
                vote="bullish",
                confidence=min(abs(pol) * 2, 1.0),  # Scale polarity to 0-1
                reasoning=f"News sentiment bullish ({sentiment.get('positive', 0)} pos, {sentiment.get('negative', 0)} neg, {sentiment.get('articles_count', 0)} articles).",
            ))
        elif sentiment["overall_sentiment"] == "bearish":
            votes.append(AgentVote(
                agent="SentimentAgent",
                vote="bearish",
                confidence=min(abs(pol) * 2, 1.0),
                reasoning=f"News sentiment bearish ({sentiment.get('positive', 0)} pos, {sentiment.get('negative', 0)} neg, {sentiment.get('articles_count', 0)} articles).",
            ))
        else:
            votes.append(AgentVote(
                agent="SentimentAgent",
                vote="neutral",
                confidence=0.3,
                reasoning=f"News sentiment neutral ({sentiment.get('articles_count', 0)} articles, polarity={pol:.3f}).",
            ))

        # ── Pattern Agent Vote ──
        if pattern["signal"] == "bullish":
            votes.append(AgentVote(
                agent="PatternAgent",
                vote="bullish",
                confidence=pattern["score"],
                reasoning=f"{pattern['count']} candlestick patterns detected ({pattern.get('patterns', [])[-1]['pattern'] if pattern.get('patterns') else 'none'} most recent).",
            ))
        elif pattern["signal"] == "bearish":
            votes.append(AgentVote(
                agent="PatternAgent",
                vote="bearish",
                confidence=pattern["score"],
                reasoning=f"{pattern['count']} candlestick patterns detected ({pattern.get('patterns', [])[-1]['pattern'] if pattern.get('patterns') else 'none'} most recent).",
            ))
        else:
            votes.append(AgentVote(
                agent="PatternAgent",
                vote="neutral",
                confidence=0.2,
                reasoning=f"No significant candlestick patterns ({pattern['count']} detected, none dominant).",
            ))

        return votes

    def _apply_dynamic_weights(self, votes: List[AgentVote]) -> List[AgentVote]:
        """
        Adjust each vote's confidence by the agent's dynamic weight.

        An agent with weight=1.3 gets its confidence boosted 30%.
        An agent with weight=0.7 gets its confidence reduced 30%.

        This is how the system LEARNs — agents on hot streaks get more
        influence, agents on cold streaks get less.
        """
        weighted_votes = []
        for vote in votes:
            agent_name = vote.agent
            if agent_name in self.memory.agents:
                weight = self.memory.agents[agent_name].dynamic_weight
                adjusted_confidence = min(vote.confidence * weight, 1.0)
                vote.confidence = round(adjusted_confidence, 3)
            weighted_votes.append(vote)
        return weighted_votes

    def _reach_consensus(
        self,
        votes: List[AgentVote],
        regime: RegimeResult,
    ) -> ConsensusResult:
        """
        Voting logic:
          - Count bullish vs bearish vs neutral votes
          - ≥3 of 4 bullish → BUY
          - ≥3 of 4 bearish → SELL
          - 2 bullish + 2 bearish → WATCH (conflict)
          - ≤1 directional → NO_TRADE
          - Regime ROTATIONAL overrides to NO_TRADE regardless of votes
        """
        bullish = [v for v in votes if v.vote == "bullish"]
        bearish = [v for v in votes if v.vote == "bearish"]
        neutral = [v for v in votes if v.vote in ("neutral", "no_trade")]

        bullish_count = len(bullish)
        bearish_count = len(bearish)
        neutral_count = len(neutral)

        # Calculate average confidence of directional votes
        directional_votes = bullish + bearish
        avg_conf = (
            np.mean([v.confidence for v in directional_votes])
            if directional_votes
            else 0.0
        )

        # Determine direction
        if regime.regime == MarketRegime.ROTATIONAL:
            direction = "NO_TRADE"
            rationale = "⚠️ Regime is ROTATIONAL — market state is unclear. Reducing risk."
        elif bullish_count >= 3:
            direction = "BUY"
            rationale = f"Strong bullish consensus ({bullish_count}/4 agents agree)."
        elif bearish_count >= 3:
            direction = "SELL"
            rationale = f"Strong bearish consensus ({bearish_count}/4 agents agree)."
        elif bullish_count == 2 and bearish_count == 2:
            direction = "WATCH"
            rationale = "⚖️ Split decision — 2 bullish, 2 bearish. Watch for breakout."
        elif bullish_count >= 2 and regime.regime == MarketRegime.TRENDING and regime.trend_direction == "bullish":
            direction = "BUY"
            rationale = f"Bullish lean ({bullish_count}/4) confirmed by trending regime."
        elif bearish_count >= 2 and regime.regime == MarketRegime.TRENDING and regime.trend_direction == "bearish":
            direction = "SELL"
            rationale = f"Bearish lean ({bearish_count}/4) confirmed by trending regime."
        elif bullish_count >= 2 and regime.regime == MarketRegime.BREAKOUT:
            direction = "WATCH"
            rationale = "🚀 Breakout detected but consensus not strong enough. Wait for confirmation."
        elif bearish_count >= 2 and regime.regime == MarketRegime.BREAKOUT:
            direction = "WATCH"
            rationale = "🚀 Breakout detected but bearish — could be false breakout. Wait for confirmation."
        else:
            direction = "NO_TRADE"
            rationale = "No clear edge. Insufficient consensus."

        return ConsensusResult(
            direction=direction,
            votes=votes,
            bullish_count=bullish_count,
            bearish_count=bearish_count,
            neutral_count=neutral_count,
            avg_confidence=round(float(avg_conf), 3),
            regime=regime,
            rationale=rationale,
        )

    def _build_rationale(self, consensus: ConsensusResult, regime: RegimeResult) -> str:
        """Build a concise human-readable rationale for the signal."""
        lines = [consensus.rationale]
        lines.append(f"Regime: {regime.regime.value.upper()} — {regime.trend_direction} trend (strength: {regime.trend_strength:.2f})")
        lines.append(f"Volatility: {regime.volatility_state} (ATR {regime.atr_state}, ratio={regime.atr_ratio:.2f})")
        lines.append(f"Volume: {regime.volume_state} ({regime.volume_ratio:.1f}x average)")

        # Add key agent reasoning
        for vote in consensus.votes:
            if vote.vote in ("bullish", "bearish") and vote.confidence > 0.5:
                lines.append(f"  • {vote.agent}: {vote.reasoning}")

        return "\n".join(lines)

    def _format_signal(
        self,
        consensus: ConsensusResult,
        regime: RegimeResult,
        trade_plan: Optional[TradePlan],
        current_price: float,
        atr: float,
        quant: Dict,
        sentiment: Dict,
        pattern: Dict,
        patterns: list,
    ) -> FinalSignal:
        """Format the final signal as a Telegram-ready message."""
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        consensus_str = f"{consensus.bullish_count}B/{consensus.bearish_count}S/{consensus.neutral_count}N"

        if trade_plan:
            entry = trade_plan.entry
            sl = trade_plan.stop_loss
            tp1 = trade_plan.take_profit_1
            tp2 = trade_plan.take_profit_2
            pos_pct = trade_plan.position_size_pct
            risk_amt = trade_plan.risk_amount
            rrr = trade_plan.risk_reward
            direction_emoji = "🟢 LONG" if trade_plan.direction == "BUY" else "🔴 SHORT"

            # Invalidation condition
            if trade_plan.direction == "BUY":
                invalidation = f"Price closes below {sl:.2f} on daily timeframe"
            else:
                invalidation = f"Price closes above {sl:.2f} on daily timeframe"
        else:
            entry = current_price
            sl = 0.0
            tp1 = 0.0
            tp2 = 0.0
            pos_pct = 0.0
            risk_amt = 0.0
            rrr = 0.0
            direction_emoji = "⚪ NO TRADE" if consensus.direction == "NO_TRADE" else "👀 WATCH"
            invalidation = "No trade — monitoring only"

        # Build the message
        lines = [
            f"{'='*48}",
            f"🔔 STARKTRADE AI — XAUUSD Daily Signal",
            f"{'='*48}",
            f"📅 {now}",
            f"",
            f"{direction_emoji} {consensus.direction}",
            f"📊 Regime: {regime.regime.value.upper()}",
            f"📈 Trend: {regime.trend_direction} (strength: {regime.trend_strength:.2f})",
            f"📉 Consensus: {consensus_str} | Confidence: {consensus.avg_confidence:.0%}",
            f"",
        ]

        if trade_plan:
            lines += [
                f"{'─'*48}",
                f"🎯 Entry: {entry:.2f}",
                f"🛑 Stop Loss: {sl:.2f} ({atr*1.5:.2f} risk, 1.5x ATR)",
                f"💰 Take Profit 1: {tp1:.2f} (1:{rrr*0.57:.1f} R:R)",
                f"💰 Take Profit 2: {tp2:.2f} (1:{rrr:.1f} R:R)",
                f"📐 Risk: {pos_pct:.1f}% of account (${risk_amt:.0f})",
                f"📊 R:R Ratio: 1:{rrr:.1f}",
                f"",
                f"⚠️ Invalidation: {invalidation}",
                f"",
            ]
        else:
            lines += [
                f"{'─'*48}",
                f"📍 Watching at: {current_price:.2f}",
                f"⚠️ Action: {consensus.rationale}",
                f"",
            ]

        # Agent breakdown
        lines += [
            f"{'─'*48}",
            f"🤖 Agent Votes:",
        ]
        for vote in consensus.votes:
            emoji = "🟢" if vote.vote == "bullish" else "🔴" if vote.vote == "bearish" else "⚪"
            lines.append(f"  {emoji} {vote.agent}: {vote.vote} ({vote.confidence:.0%})")

        lines += [
            f"",
            f"{'─'*48}",
            f"📊 Technical Context:",
            f"  ATR(14): {atr:.2f}",
            f"  Volatility: {regime.volatility_state} (ATR {regime.atr_state})",
            f"  Volume: {regime.volume_state} ({regime.volume_ratio:.1f}x avg)",
            f"  BB Width: {regime.volatility_pct:.0%} of 20d range",
        ]

        if sentiment.get("articles_count", 0) > 0:
            lines += [
                f"",
                f"📰 Sentiment: {sentiment['overall_sentiment'].upper()} "
                f"(polarity={sentiment.get('polarity', 0):.3f}, "
                f"{sentiment.get('articles_count', 0)} articles)",
            ]

        if pattern.get("count", 0) > 0:
            lines.append(f"🕯️  Patterns: {pattern['count']} detected ({pattern['signal']}, score={pattern['score']:.2f})")

        # Context memory summary
        if self.memory.system_state["total_signals_generated"] > 0:
            perf = self.memory.recent_performance(days=30)
            lines += [
                f"",
                f"{'─'*48}",
                f"🧠 System Memory:",
                f"  Signals generated: {self.memory.system_state['total_signals_generated']}",
                f"  Trades taken: {self.memory.system_state['total_trades_taken']}",
            ]
            if perf.get("total_signals", 0) > 0:
                lines += [
                    f"  Recent win rate: {perf['win_rate']}% ({perf['wins']}W/{perf['losses']}L)",
                    f"  Recent PnL: {perf['total_pnl_pct']:+.1f}%",
                    f"  Current streak: {'W' if perf['consecutive_wins'] else 'L'}{max(perf['consecutive_wins'], perf['consecutive_losses'])}",
                ]
            else:
                lines.append(f"  Live track record: Building... (first signal)")

        lines += [
            f"",
            f"{'─'*48}",
            f"🧠 Rationale:",
            f"  {consensus.rationale.replace(chr(10), chr(10) + '  ')}",
            f"",
            f"⚠️ Disclaimer: Educational purposes only. Not financial advice.",
            f"   Risk max 1-2% per trade. Past performance ≠ future results.",
            f"{'='*48}",
        ]

        message = "\n".join(lines)

        return FinalSignal(
            symbol="XAUUSD",
            date=now,
            regime=regime.regime.value,
            direction=consensus.direction,
            entry=entry,
            stop_loss=sl,
            take_profit_1=tp1,
            take_profit_2=tp2,
            position_size_pct=pos_pct,
            risk_amount=risk_amt,
            rrr=rrr,
            confidence=consensus.avg_confidence,
            consensus_score=consensus_str,
            agent_votes=consensus.votes,
            rationale=consensus.rationale,
            invalidation=invalidation,
            message=message,
        )

    def _error_signal(self, error: str) -> FinalSignal:
        """Generate an error signal when something fails."""
        logger.error(f"Signal generation failed: {error}")
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        message = (
            f"{'='*48}\n"
            f"⚠️ STARKTRADE AI — Signal Unavailable\n"
            f"{'='*48}\n"
            f"📅 {now}\n"
            f"❌ Error: {error}\n"
            f"\n"
            f"🔄 We'll retry shortly. No action needed.\n"
            f"{'='*48}"
        )
        return FinalSignal(
            symbol="XAUUSD",
            date=now,
            regime="error",
            direction="ERROR",
            entry=0.0, stop_loss=0.0,
            take_profit_1=0.0, take_profit_2=0.0,
            position_size_pct=0.0, risk_amount=0.0, rrr=0.0,
            confidence=0.0, consensus_score="0/0",
            agent_votes=[],
            rationale=error,
            invalidation="N/A",
            message=message,
        )
