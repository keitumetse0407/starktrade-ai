"""
Market Regime Detector
Pure algorithmic regime detection - No LLM
"""

import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum
from .offline_indicators import TechnicalIndicators as TI

MarketRegime = Enum('MarketRegime', 'BULL BEAR SIDEWAYS CRISIS RECOVERY UNCERTAINTY')

@dataclass
class RegimeAnalysis:
    regime: MarketRegime
    confidence: float
    thesis: str
    risk_level: float
    strategies: List[str]

class RegimeDetector:
    """Multi-Factor Market Regime Detection"""
    
    def __init__(self):
        self.ti = TI()
    
    def detect(self, closes: List[float], highs: List[float], lows: List[float], volumes: List[float]) -> RegimeAnalysis:
        if len(closes) < 200:
            return RegimeAnalysis(MarketRegime.UNCERTAINTY, 0.0, "Insufficient data", 0.5, ['defensive'])
        
        # Calculate factors
        trend = self._analyze_trend(closes)
        volatility = self._analyze_volatility(highs, lows, closes)
        momentum = self._analyze_momentum(closes)
        drawdown = self._analyze_drawdown(closes)
        
        # Score regimes
        scores = {MarketRegime.BULL: 0, MarketRegime.BEAR: 0, MarketRegime.SIDEWAYS: 0, 
                  MarketRegime.CRISIS: 0, MarketRegime.RECOVERY: 0}
        
        # Bull
        if trend > 0.4 and momentum > 0.3 and volatility < 0.5:
            scores[MarketRegime.BULL] += 0.8
        
        # Bear
        if trend < -0.4 and momentum < -0.3:
            scores[MarketRegime.BEAR] += 0.8
        
        # Sideways
        if abs(trend) < 0.3 and abs(momentum) < 0.3:
            scores[MarketRegime.SIDEWAYS] += 0.7
        
        # Crisis
        if volatility > 0.7 or drawdown < -0.15:
            scores[MarketRegime.CRISIS] += 0.9
        
        # Recovery
        if drawdown < -0.08 and trend > 0.1 and momentum > 0.2:
            scores[MarketRegime.RECOVERY] += 0.7
        
        # Find dominant
        regime = max(scores.keys(), key=lambda r: scores[r])
        confidence = min(scores[regime] / sum(scores.values()) * 1.5, 1.0) if scores[regime] > 0 else 0.5
        
        # Generate thesis
        thesis = self._generate_thesis(regime, trend, volatility, momentum, drawdown)
        
        # Risk level
        risk_map = {MarketRegime.BULL: 0.3, MarketRegime.BEAR: 0.6, MarketRegime.SIDEWAYS: 0.4,
                   MarketRegime.CRISIS: 0.9, MarketRegime.RECOVERY: 0.5, MarketRegime.UNCERTAINTY: 0.7}
        risk_level = risk_map.get(regime, 0.5)
        
        # Recommended strategies
        strategy_map = {
            MarketRegime.BULL: ['trend_following', 'momentum'],
            MarketRegime.BEAR: ['shorting', 'defensive'],
            MarketRegime.SIDEWAYS: ['mean_reversion', 'range_trading'],
            MarketRegime.CRISIS: ['defensive', 'cash'],
            MarketRegime.RECOVERY: ['momentum', 'trend_following'],
            MarketRegime.UNCERTAINTY: ['defensive']
        }
        strategies = strategy_map.get(regime, ['defensive'])
        
        return RegimeAnalysis(regime, confidence, thesis, risk_level, strategies)
    
    def _analyze_trend(self, closes: List[float]) -> float:
        c = np.array(closes[-50:])
        price = closes[-1]
        
        sma20 = self.ti.sma(closes, 20)
        sma50 = self.ti.sma(closes, 50)
        sma200 = self.ti.sma(closes, 50)  # Use 50 if insufficient for 200
        
        score = 0.0
        if price > sma20: score += 0.3
        if price > sma50: score += 0.4
        if price > sma200: score += 0.3
        if sma20 > sma50: score += 0.2
        
        lr = self.ti.linear_regression_slope(closes, 20)
        score += np.tanh(lr * 10) * 0.3
        
        return np.clip(score - 0.5, -1.0, 1.0)  # Center around 0
    
    def _analyze_volatility(self, highs, lows, closes) -> float:
        atr = self.ti.atr(highs, lows, closes, 14)
        price = closes[-1]
        ratio = atr / price if price > 0 else 0.02
        return np.clip(ratio * 20, 0.0, 1.0)
    
    def _analyze_momentum(self, closes) -> float:
        rsi = self.ti.rsi(closes, 14)
        rsi_score = (rsi - 50) / 50
        
        macd, sig, hist = self.ti.macd(closes)
        macd_score = np.tanh(hist * 10)
        
        return (rsi_score * 0.5 + macd_score * 0.5)
    
    def _analyze_drawdown(self, closes) -> float:
        running_max = np.maximum.accumulate(closes)
        drawdowns = (closes - running_max) / running_max
        return float(np.min(drawdowns[-50:]))
    
    def _generate_thesis(self, regime, trend, volatility, momentum, drawdown) -> str:
        theses = {
            MarketRegime.BULL: f"Bull trend ({trend:.2f}). Momentum {momentum:.2f}. Low risk.",
            MarketRegime.BEAR: f"Bear trend ({trend:.2f}). Negative momentum. Caution required.",
            MarketRegime.SIDEWAYS: "Range-bound market. Wait for breakout.",
            MarketRegime.CRISIS: f"High volatility ({volatility:.2f}). Drawdown {drawdown:.1%}. Defensive only.",
            MarketRegime.RECOVERY: f"Recovering from {drawdown:.1%} drawdown. Positive momentum.",
            MarketRegime.UNCERTAINTY: "Mixed signals - low conviction."
        }
        return theses.get(regime, "Market unclear")


__all__ = ['RegimeDetector', 'RegimeAnalysis', 'MarketRegime']