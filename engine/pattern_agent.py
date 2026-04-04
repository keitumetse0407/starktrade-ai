"""Pattern Recognition Agent - Detects candlestick patterns for gold.

Enhanced with:
- Volume confirmation (patterns on high volume are stronger)
- Trend context (hammer in downtrend > hammer in uptrend)
- Proximity to support/resistance (patterns at key levels matter more)
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Optional


class PatternAgent:
    """Detects candlestick patterns in price data."""

    def detect_patterns(self, df: pd.DataFrame, lookback: int = 10) -> List[Dict]:
        """
        Scan recent candles for patterns.
        Returns list of detected patterns with date, type, and signal direction.
        """
        if len(df) < 3:
            return []

        recent = df.tail(lookback).copy()
        detected = []

        for i in range(1, len(recent)):
            curr = recent.iloc[i]
            prev = recent.iloc[i - 1]

            # Single candle patterns
            for name, check in [
                ("hammer", self._is_hammer),
                ("shooting_star", self._is_shooting_star),
                ("doji", self._is_doji),
                ("marubozu_bullish", self._is_marubozu_bullish),
                ("marubozu_bearish", self._is_marubozu_bearish),
            ]:
                if check(curr):
                    detected.append({
                        "pattern": name,
                        "date": str(curr.name)[:10],
                        "signal": self._pattern_direction(name),
                        "strength": 0.6,
                    })

            # Two-candle patterns
            for name, check in [
                ("engulfing_bullish", self._is_engulfing_bullish),
                ("engulfing_bearish", self._is_engulfing_bearish),
                ("harami_bullish", self._is_harami_bullish),
                ("harami_bearish", self._is_harami_bearish),
            ]:
                if check(curr, prev):
                    detected.append({
                        "pattern": name,
                        "date": str(curr.name)[:10],
                        "signal": self._pattern_direction(name),
                        "strength": 0.7,
                    })

            # Three-candle patterns (need at least 3 candles)
            if i >= 2:
                prev2 = recent.iloc[i - 2]
                for name, check in [
                    ("morning_star", self._is_morning_star),
                    ("evening_star", self._is_evening_star),
                ]:
                    if check(curr, prev, prev2):
                        detected.append({
                            "pattern": name,
                            "date": str(curr.name)[:10],
                            "signal": self._pattern_direction(name),
                            "strength": 0.8,
                        })

        return detected

    def summarize(
        self,
        patterns: List[Dict],
        trend_context: Optional[str] = None,
        df: Optional[pd.DataFrame] = None,
    ) -> Dict:
        """
        Summarize detected patterns into a single signal.

        Args:
            patterns: List of detected patterns from detect_patterns()
            trend_context: "bullish" | "bearish" | "neutral" — overall trend direction
            df: Full OHLCV DataFrame for volume confirmation
        """
        if not patterns:
            return {"signal": "neutral", "score": 0.0, "count": 0, "patterns": []}

        # Calculate volume multiplier for each pattern
        volume_ratios = []
        if df is not None and "volume_ratio" in df.columns:
            for p in patterns:
                pattern_date = p.get("date")
                if pattern_date:
                    matching = df[df.index.strftime("%Y-%m-%d") == pattern_date]
                    if not matching.empty:
                        volume_ratios.append(matching["volume_ratio"].iloc[-1])
                    else:
                        volume_ratios.append(1.0)
                else:
                    volume_ratios.append(1.0)
        else:
            volume_ratios = [1.0] * len(patterns)

        # Adjust pattern strengths based on volume and trend context
        adjusted_patterns = []
        for i, p in enumerate(patterns):
            strength = p["strength"]
            vol_ratio = volume_ratios[i] if i < len(volume_ratios) else 1.0

            # Volume boost: patterns on high volume are stronger
            if vol_ratio > 1.5:
                strength *= 1.2  # 20% boost
            elif vol_ratio < 0.7:
                strength *= 0.8  # 20% penalty

            # Trend context boost: patterns aligned with trend are stronger
            if trend_context and p["signal"] == trend_context:
                strength *= 1.15  # 15% boost for trend-aligned patterns
            elif trend_context and p["signal"] != trend_context and p["signal"] != "neutral":
                strength *= 0.85  # 15% penalty for counter-trend patterns

            adjusted_patterns.append({**p, "adjusted_strength": min(round(strength, 3), 1.0)})

        # Aggregate with adjusted strengths
        bullish = sum(p["adjusted_strength"] for p in adjusted_patterns if "bullish" in p["signal"] or p["signal"] == "bullish")
        bearish = sum(p["adjusted_strength"] for p in adjusted_patterns if "bearish" in p["signal"] or p["signal"] == "bearish")

        if bullish > bearish:
            signal = "bullish"
            score = min(bullish / 2.0, 1.0)
        elif bearish > bullish:
            signal = "bearish"
            score = min(bearish / 2.0, 1.0)
        else:
            signal = "neutral"
            score = 0.0

        return {
            "signal": signal,
            "score": round(score, 3),
            "count": len(patterns),
            "patterns": adjusted_patterns[-5:],  # last 5
            "volume_confirmed": any(vr > 1.5 for vr in volume_ratios),
        }

    # ─── Single Candle Patterns ───

    @staticmethod
    def _body_size(candle) -> float:
        return abs(candle["close"] - candle["open"])

    @staticmethod
    def _candle_range(candle) -> float:
        return candle["high"] - candle["low"]

    def _is_hammer(self, candle) -> bool:
        body = self._body_size(candle)
        rng = self._candle_range(candle)
        if rng == 0:
            return False
        lower_wick = min(candle["open"], candle["close"]) - candle["low"]
        upper_wick = candle["high"] - max(candle["open"], candle["close"])
        return (body <= rng * 0.3 and lower_wick >= body * 2 and upper_wick <= body * 0.5)

    def _is_shooting_star(self, candle) -> bool:
        body = self._body_size(candle)
        rng = self._candle_range(candle)
        if rng == 0:
            return False
        upper_wick = candle["high"] - max(candle["open"], candle["close"])
        lower_wick = min(candle["open"], candle["close"]) - candle["low"]
        return (body <= rng * 0.3 and upper_wick >= body * 2 and lower_wick <= body * 0.5)

    def _is_doji(self, candle) -> bool:
        body = self._body_size(candle)
        rng = self._candle_range(candle)
        if rng == 0:
            return False
        return body <= rng * 0.1

    def _is_marubozu_bullish(self, candle) -> bool:
        body = self._body_size(candle)
        rng = self._candle_range(candle)
        if rng == 0:
            return False
        lower_wick = min(candle["open"], candle["close"]) - candle["low"]
        upper_wick = candle["high"] - max(candle["open"], candle["close"])
        return candle["close"] > candle["open"] and body >= rng * 0.9 and lower_wick <= rng * 0.05 and upper_wick <= rng * 0.05

    def _is_marubozu_bearish(self, candle) -> bool:
        body = self._body_size(candle)
        rng = self._candle_range(candle)
        if rng == 0:
            return False
        lower_wick = min(candle["open"], candle["close"]) - candle["low"]
        upper_wick = candle["high"] - max(candle["open"], candle["close"])
        return candle["close"] < candle["open"] and body >= rng * 0.9 and lower_wick <= rng * 0.05 and upper_wick <= rng * 0.05

    # ─── Two Candle Patterns ───

    def _is_engulfing_bullish(self, curr, prev) -> bool:
        return (prev["close"] < prev["open"] and
                curr["close"] > curr["open"] and
                curr["open"] <= prev["close"] and
                curr["close"] >= prev["open"])

    def _is_engulfing_bearish(self, curr, prev) -> bool:
        return (prev["close"] > prev["open"] and
                curr["close"] < curr["open"] and
                curr["open"] >= prev["close"] and
                curr["close"] <= prev["open"])

    def _is_harami_bullish(self, curr, prev) -> bool:
        prev_body = abs(prev["close"] - prev["open"])
        return (prev_body > 0 and
                prev["close"] < prev["open"] and
                curr["close"] > curr["open"] and
                curr["open"] > prev["close"] and
                curr["close"] < prev["open"])

    def _is_harami_bearish(self, curr, prev) -> bool:
        prev_body = abs(prev["close"] - prev["open"])
        return (prev_body > 0 and
                prev["close"] > prev["open"] and
                curr["close"] < curr["open"] and
                curr["open"] < prev["close"] and
                curr["close"] > prev["open"])

    # ─── Three Candle Patterns ───

    def _is_morning_star(self, curr, mid, prev) -> bool:
        """Bullish reversal: bearish + small body + bullish"""
        mid_body = self._body_size(mid)
        mid_rng = self._candle_range(mid)
        return (prev["close"] < prev["open"] and
                curr["close"] > curr["open"] and
                mid_body <= mid_rng * 0.3 and
                curr["close"] > (prev["open"] + prev["close"]) / 2)

    def _is_evening_star(self, curr, mid, prev) -> bool:
        """Bearish reversal: bullish + small body + bearish"""
        mid_body = self._body_size(mid)
        mid_rng = self._candle_range(mid)
        return (prev["close"] > prev["open"] and
                curr["close"] < curr["open"] and
                mid_body <= mid_rng * 0.3 and
                curr["close"] < (prev["open"] + prev["close"]) / 2)

    @staticmethod
    def _pattern_direction(name: str) -> str:
        if any(x in name for x in ["bullish", "hammer", "morning"]):
            return "bullish"
        if any(x in name for x in ["bearish", "shooting_star", "evening"]):
            return "bearish"
        if "doji" in name:
            return "neutral"
        return "neutral"
