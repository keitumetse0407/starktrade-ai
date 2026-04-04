"""Regime Detector — Classifies market state so the right strategy applies.

Uses ADX (trend strength), Bollinger Band width (volatility regime),
ATR state (volatility acceleration), and EMA alignment (trend direction).

Four regimes:
  TRENDING    — ADX > 25, price moving with EMA alignment
  BREAKOUT    — BB squeeze releasing, volume spike
  RANGE       — ADX < 20, BB narrow, no clear direction
  ROTATIONAL  — transitioning between regimes, low confidence

No external dependencies. Pure pandas/numpy.
"""

import pandas as pd
import numpy as np
import logging
from enum import Enum
from typing import Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class MarketRegime(Enum):
    TRENDING = "trending"
    BREAKOUT = "breakout"
    RANGE = "range"
    ROTATIONAL = "rotational"


@dataclass
class RegimeResult:
    """Complete regime classification."""
    regime: MarketRegime
    trend_direction: str  # "bullish" | "bearish" | "neutral"
    trend_strength: float  # 0.0 - 1.0 (ADX normalized)
    volatility_state: str  # "expanding" | "normal" | "contracting"
    volatility_pct: float  # Where current BB width sits in 20-day range (0-1)
    atr_state: str  # "rising" | "falling" | "stable"
    atr_ratio: float  # Current ATR / 20-day avg ATR
    volume_state: str  # "surge" | "above_avg" | "normal" | "below_avg"
    volume_ratio: float  # Current volume / 20-day avg
    confidence: float  # How confident we are in this classification (0-1)
    signal: str  # Human-readable summary


class RegimeDetector:
    """
    Classifies the current market regime using multiple confirmations.

    Philosophy: Don't apply the same strategy to every market.
    - TRENDING: Follow the trend, higher position sizes, wider stops
    - BREAKOUT: Catch the move early, tight stops, smaller size until confirmed
    - RANGE: Fade the edges, mean reversion, smaller targets
    - ROTATIONAL: Stay out or minimal size — regime is unclear
    """

    def __init__(
        self,
        adx_threshold_trending: float = 25.0,
        adx_threshold_ranging: float = 20.0,
        bb_width_percentile_squeeze: float = 25.0,
        bb_width_percentile_expansion: float = 75.0,
        atr_rise_threshold: float = 1.2,
        atr_fall_threshold: float = 0.8,
        volume_surge_threshold: float = 1.5,
    ):
        self.adx_trending = adx_threshold_trending
        self.adx_ranging = adx_threshold_ranging
        self.bb_squeeze = bb_width_percentile_squeeze
        self.bb_expand = bb_width_percentile_expansion
        self.atr_rise = atr_rise_threshold
        self.atr_fall = atr_fall_threshold
        self.vol_surge = volume_surge_threshold

    def detect(self, df: pd.DataFrame) -> RegimeResult:
        """
        Classify the regime for the latest bar.

        Args:
            df: OHLCV DataFrame with at least 200 rows (needs EMA200 + ADX14 lookback)

        Returns:
            RegimeResult with regime classification and all sub-signals
        """
        if len(df) < 50:
            return self._uncertain("Insufficient data (< 50 bars)")

        # Calculate all regime indicators
        adx = self._calculate_adx(df)
        bb_width = df["bb_width"] if "bb_width" in df.columns else self._bb_width(df)
        atr = df["atr_14"] if "atr_14" in df.columns else self._atr(df)
        volume_ratio = df["volume_ratio"] if "volume_ratio" in df.columns else df["volume"] / df["volume"].rolling(20).mean()

        # Get latest values
        latest_adx = adx.iloc[-1]
        latest_bb_width = bb_width.iloc[-1]
        latest_atr = atr.iloc[-1]
        latest_vol_ratio = volume_ratio.iloc[-1]

        # --- 1. Trend strength (ADX) ---
        if latest_adx > self.adx_trending:
            trend_strength = "strong"
        elif latest_adx > self.adx_ranging:
            trend_strength = "moderate"
        else:
            trend_strength = "weak"

        # --- 2. Trend direction (EMA alignment) ---
        ema_20 = df["ema_20"].iloc[-1] if "ema_20" in df.columns else df["close"].rolling(20).mean().iloc[-1]
        ema_50 = df["ema_50"].iloc[-1] if "ema_50" in df.columns else df["close"].rolling(50).mean().iloc[-1]
        ema_200 = df["ema_200"].iloc[-1] if "ema_200" in df.columns else df["close"].rolling(200).mean().iloc[-1]
        current_price = df["close"].iloc[-1]

        if current_price > ema_20 > ema_50 > ema_200:
            trend_direction = "bullish"
            ema_alignment_score = 1.0
        elif current_price < ema_20 < ema_50 < ema_200:
            trend_direction = "bearish"
            ema_alignment_score = 1.0
        elif current_price > ema_200:
            trend_direction = "bullish"
            ema_alignment_score = 0.5
        elif current_price < ema_200:
            trend_direction = "bearish"
            ema_alignment_score = 0.5
        else:
            trend_direction = "neutral"
            ema_alignment_score = 0.3

        # --- 3. Volatility regime (BB width percentile) ---
        bb_width_20d = bb_width.tail(20)
        bb_min = bb_width_20d.min()
        bb_max = bb_width_20d.max()
        bb_range = bb_max - bb_min
        if bb_range > 0:
            bb_percentile = (latest_bb_width - bb_min) / bb_range
        else:
            bb_percentile = 0.5

        if bb_percentile < 0.25:
            volatility_state = "contracting"
        elif bb_percentile > 0.75:
            volatility_state = "expanding"
        else:
            volatility_state = "normal"

        # --- 4. ATR state (acceleration/deceleration) ---
        atr_5d_avg = atr.tail(5).mean()
        atr_20d_avg = atr.tail(20).mean()
        atr_ratio = atr_5d_avg / atr_20d_avg if atr_20d_avg > 0 else 1.0

        if atr_ratio > self.atr_rise:
            atr_state = "rising"
        elif atr_ratio < self.atr_fall:
            atr_state = "falling"
        else:
            atr_state = "stable"

        # --- 5. Volume state ---
        if latest_vol_ratio > self.vol_surge:
            volume_state = "surge"
        elif latest_vol_ratio > 1.2:
            volume_state = "above_avg"
        elif latest_vol_ratio > 0.8:
            volume_state = "normal"
        else:
            volume_state = "below_avg"

        # --- 6. Regime classification (voting logic) ---
        regime, confidence = self._classify_regime(
            adx=latest_adx,
            bb_percentile=bb_percentile,
            atr_ratio=atr_ratio,
            volume_state=volume_state,
            ema_alignment_score=ema_alignment_score,
        )

        # --- 7. Build signal string ---
        signal = self._format_signal(
            regime=regime,
            trend_direction=trend_direction,
            trend_strength=trend_strength,
            volatility_state=volatility_state,
            atr_state=atr_state,
            volume_state=volume_state,
            adx=latest_adx,
            atr_ratio=atr_ratio,
            bb_percentile=bb_percentile,
        )

        return RegimeResult(
            regime=regime,
            trend_direction=trend_direction,
            trend_strength=self._strength_float(trend_strength, latest_adx),
            volatility_state=volatility_state,
            volatility_pct=bb_percentile,
            atr_state=atr_state,
            atr_ratio=atr_ratio,
            volume_state=volume_state,
            volume_ratio=latest_vol_ratio,
            confidence=confidence,
            signal=signal,
        )

    def _classify_regime(
        self,
        adx: float,
        bb_percentile: float,
        atr_ratio: float,
        volume_state: str,
        ema_alignment_score: float,
    ) -> tuple[MarketRegime, float]:
        """
        Vote-based regime classification.

        Each indicator votes for a regime. Majority wins.
        Confidence = how many indicators agree.
        """
        votes = {
            MarketRegime.TRENDING: 0,
            MarketRegime.BREAKOUT: 0,
            MarketRegime.RANGE: 0,
            MarketRegime.ROTATIONAL: 0,
        }

        # ADX votes
        if adx > 25:
            votes[MarketRegime.TRENDING] += 2  # ADX is the primary trend indicator
        elif adx < 20:
            votes[MarketRegime.RANGE] += 2
        else:
            votes[MarketRegime.ROTATIONAL] += 1

        # BB width votes
        if bb_percentile < 0.15:
            # Extreme squeeze — breakout imminent
            votes[MarketRegime.BREAKOUT] += 2
        elif bb_percentile < 0.25:
            votes[MarketRegime.BREAKOUT] += 1
        elif bb_percentile > 0.75:
            votes[MarketRegime.TRENDING] += 1  # Wide bands = established trend
        else:
            votes[MarketRegime.ROTATIONAL] += 1

        # ATR acceleration votes
        if atr_ratio > 1.3:
            votes[MarketRegime.BREAKOUT] += 1  # Volatility rising fast
        elif atr_ratio < 0.7:
            votes[MarketRegime.RANGE] += 1  # Volatility dying
        else:
            votes[MarketRegime.ROTATIONAL] += 1

        # Volume votes
        if volume_state == "surge":
            votes[MarketRegime.BREAKOUT] += 2
        elif volume_state == "below_avg":
            votes[MarketRegime.RANGE] += 1

        # EMA alignment votes
        if ema_alignment_score >= 0.8:
            votes[MarketRegime.TRENDING] += 2
        elif ema_alignment_score < 0.4:
            votes[MarketRegime.RANGE] += 1

        # Winner takes all
        winner = max(votes, key=votes.get)
        total_votes = sum(votes.values())
        confidence = votes[winner] / total_votes if total_votes > 0 else 0.25

        return winner, confidence

    def _calculate_adx(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """
        Average Directional Index — measures trend STRENGTH, not direction.
        ADX > 25 = strong trend. ADX < 20 = ranging.
        """
        high = df["high"]
        low = df["low"]
        close = df["close"]

        # +DM and -DM
        high_diff = high.diff()
        low_diff = low.diff()

        plus_dm = high_diff.where((high_diff > low_diff) & (high_diff > 0), 0)
        minus_dm = low_diff.where((low_diff > high_diff) & (low_diff > 0), 0)

        # Smoothed averages
        atr = self._atr(df, period)
        plus_di = 100 * plus_dm.rolling(window=period).mean() / atr
        minus_di = 100 * minus_dm.rolling(window=period).mean() / atr

        # DX and ADX
        dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
        adx = dx.rolling(window=period).mean()

        return adx

    def _bb_width(self, df: pd.DataFrame, window: int = 20, num_std: float = 2.0) -> pd.Series:
        """Calculate BB width if not already present."""
        sma = df["close"].rolling(window=window).mean()
        std = df["close"].rolling(window=window).std()
        upper = sma + (std * num_std)
        lower = sma - (std * num_std)
        return (upper - lower) / sma

    def _atr(self, df: pd.DataFrame, window: int = 14) -> pd.Series:
        """Calculate ATR if not already present."""
        high_low = df["high"] - df["low"]
        high_close = (df["high"] - df["close"].shift()).abs()
        low_close = (df["low"] - df["close"].shift()).abs()
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        return true_range.rolling(window=window).mean()

    def _uncertain(self, reason: str) -> RegimeResult:
        """Return uncertain regime with low confidence."""
        return RegimeResult(
            regime=MarketRegime.ROTATIONAL,
            trend_direction="neutral",
            trend_strength=0.0,
            volatility_state="normal",
            volatility_pct=0.5,
            atr_state="stable",
            atr_ratio=1.0,
            volume_state="normal",
            volume_ratio=1.0,
            confidence=0.1,
            signal=f"⚠️ UNCERTAIN: {reason}",
        )

    def _strength_float(self, strength: str, adx: float) -> float:
        """Convert strength label to 0-1 float."""
        if strength == "strong":
            return min(adx / 50, 1.0)
        elif strength == "moderate":
            return 0.5 + (adx - 20) / 100
        else:
            return adx / 40

    def _format_signal(
        self,
        regime: MarketRegime,
        trend_direction: str,
        trend_strength: str,
        volatility_state: str,
        atr_state: str,
        volume_state: str,
        adx: float,
        atr_ratio: float,
        bb_percentile: float,
    ) -> str:
        """Human-readable regime summary."""
        parts = []

        # Regime headline
        emoji = {
            MarketRegime.TRENDING: "📈" if trend_direction == "bullish" else "📉",
            MarketRegime.BREAKOUT: "🚀",
            MarketRegime.RANGE: "🔄",
            MarketRegime.ROTATIONAL: "⚠️",
        }
        parts.append(f"{emoji.get(regime, '❓')} Regime: {regime.value.upper()}")

        # Trend
        if trend_direction != "neutral":
            parts.append(f"  Trend: {trend_direction} ({trend_strength}, ADX={adx:.1f})")
        else:
            parts.append(f"  Trend: NEUTRAL (ADX={adx:.1f})")

        # Volatility
        parts.append(f"  Volatility: {volatility_state} (ATR {atr_state}, ratio={atr_ratio:.2f})")
        parts.append(f"  BB Width: {bb_percentile*100:.0f}th percentile of 20d range")

        # Volume
        parts.append(f"  Volume: {volume_state}")

        # Strategy hint
        if regime == MarketRegime.TRENDING:
            parts.append(f"  → Strategy: Follow trend, {'higher' if trend_direction == 'bullish' else 'lower'} highs expected")
        elif regime == MarketRegime.BREAKOUT:
            parts.append(f"  → Strategy: Catch early, tight stops, wait for confirmation")
        elif regime == MarketRegime.RANGE:
            parts.append(f"  → Strategy: Fade edges, mean reversion, smaller targets")
        elif regime == MarketRegime.ROTATIONAL:
            parts.append(f"  → Strategy: Reduce size or stay out — regime unclear")

        return "\n".join(parts)
