"""
Pure Algorithmic Signal Generator
Multi-strategy pattern recognition - No LLM needed
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
from .offline_indicators import TechnicalIndicators as TI

SignalType = Enum('SignalType', 'STRONG_BUY BUY HOLD SELL STRONG_SELL')

@dataclass
class TradingSignal:
    signal_type: SignalType
    confidence: float
    entry_price: float
    stop_loss: float
    take_profit: float
    position_size: float
    reasons: List[str]
    indicators: Dict[str, float]

class SignalGenerator:
    """Multi-Strategy Signal Generator"""
    
    def __init__(self):
        self.ti = TI()
        self.config = {
            'min_data': 150,
            'risk_reward': 2.0,
            'atr_multiplier': 2.0,
        }
    
    def generate(self, data: Dict) -> TradingSignal:
        """
        Generate trading signal from market data
        
        data = {
            'opens': [...],
            'highs': [...],
            'lows': [...],
            'closes': [...],
            'volumes': [...]
        }
        """
        closes = data.get('closes', [])
        highs = data.get('highs', [])
        lows = data.get('lows', [])
        volumes = data.get('volumes', [])
        
        if len(closes) < self.config['min_data']:
            return self._neutral_signal(closes[-1] if closes else 0, "Insufficient data")
        
        # Calculate indicators
        ind = self._calculate_all(closes, highs, lows, volumes)
        
        # Run strategies
        signals = [
            self._trend_strategy(closes, ind),
            self._mean_reversion_strategy(closes, ind),
            self._momentum_strategy(closes, ind),
            self._volume_strategy(closes, volumes, ind),
        ]
        
        # Aggregate
        return self._aggregate(signals, ind, closes[-1])
    
    def _calculate_all(self, closes, highs, lows, volumes) -> Dict[str, float]:
        ind = {}
        c = closes[-200:] if len(closes) >= 200 else closes
        h = highs[-200:] if len(highs) >= 200 else highs
        l = lows[-200:] if len(lows) >= 200 else lows
        v = volumes[-200:] if len(volumes) >= 200 else volumes
        
        ind['price'] = closes[-1]
        ind['sma_20'] = self.ti.sma(c, 20)
        ind['sma_50'] = self.ti.sma(c, 50)
        ind['sma_200'] = self.ti.sma(c, 200)
        ind['rsi'] = self.ti.rsi(c, 14)
        macd, signal, hist = self.ti.macd(c)
        ind['macd'] = macd
        ind['macd_hist'] = hist
        bb_u, bb_m, bb_l = self.ti.bollinger_bands(c, 20, 2.0)
        ind['bb_lower'] = bb_l
        ind['bb_upper'] = bb_u
        ind['atr'] = self.ti.atr(h, l, closes, 14)
        ind['volume_ratio'] = self.ti.volume_ratio(v, 20)
        ind['lr_slope'] = self.ti.linear_regression_slope(c, 14)
        support, resistance = self.ti.support_resistance(c, 20)
        ind['support'] = support
        ind['resistance'] = resistance
        
        return ind
    
    def _trend_strategy(self, closes, ind) -> Dict:
        score = 0.0
        reasons = []
        
        price = ind['price']
        sma20 = ind['sma_20']
        sma50 = ind['sma_50']
        sma200 = ind['sma_200']
        lr_slope = ind['lr_slope']
        
        if sma50 > sma200 and price > sma50:
            score += 0.4
            reasons.append("Golden cross pattern")
        elif sma50 < sma200 and price < sma50:
            score -= 0.4
            reasons.append("Death cross pattern")
        
        if price > sma20 > sma50:
            score += 0.3
            reasons.append("Strong uptrend")
        elif price < sma20 < sma50:
            score -= 0.3
            reasons.append("Strong downtrend")
        
        if lr_slope > 0.01:
            score += 0.3
            reasons.append("Positive trend slope")
        elif lr_slope < -0.01:
            score -= 0.3
            reasons.append("Negative trend slope")
        
        return {'score': score, 'reasons': reasons}
    
    def _mean_reversion_strategy(self, closes, ind) -> Dict:
        score = 0.0
        reasons = []
        
        price = ind['price']
        rsi = ind['rsi']
        bb_lower = ind['bb_lower']
        bb_upper = ind['bb_upper']
        
        rsi_oversold = rsi < 35
        rsi_overbought = rsi > 65
        
        if rsi_oversold:
            score += 0.5
            reasons.append(f"RSI oversold ({rsi:.1f})")
        elif rsi_overbought:
            score -= 0.5
            reasons.append(f"RSI overbought ({rsi:.1f})")
        
        # Near lower Bollinger Band = buy
        if bb_lower and price < bb_lower * 1.05:
            score += 0.4
            reasons.append("Near lower BB - potentially oversold")
        elif bb_upper and price > bb_upper * 0.95:
            score -= 0.4
            reasons.append("Near upper BB - potentially overbought")
        
        return {'score': score, 'reasons': reasons}
    
    def _momentum_strategy(self, closes, ind) -> Dict:
        score = 0.0
        reasons = []
        
        macd_hist = ind['macd_hist']
        rsi = ind['rsi']
        lr_slope = ind['lr_slope']
        
        if macd_hist > 0:
            score += 0.4
            reasons.append("Positive MACD histogram")
        else:
            score -= 0.4
            reasons.append("Negative MACD histogram")
        
        if 50 < rsi < 70:
            score += 0.2
            reasons.append(f"Bullish RSI zone ({rsi:.1f})")
        elif 30 < rsi < 50:
            score -= 0.2
            reasons.append(f"Bearish RSI zone ({rsi:.1f})")
        
        if lr_slope > 0.005:
            score += 0.2
            reasons.append("Strong upward momentum")
        elif lr_slope < -0.005:
            score -= 0.2
            reasons.append("Strong downward momentum")
        
        return {'score': score, 'reasons': reasons}
    
    def _volume_strategy(self, closes, volumes, ind) -> Dict:
        score = 0.0
        reasons = []
        
        vol_ratio = ind['volume_ratio']
        price_change = (closes[-1] - closes[-2]) / closes[-2] if len(closes) > 1 else 0
        
        if vol_ratio > 1.5 and price_change > 0:
            score += 0.4
            reasons.append(f"Buying pressure ({vol_ratio:.1f}x volume)")
        elif vol_ratio > 1.5 and price_change < 0:
            score -= 0.4
            reasons.append(f"Selling pressure ({vol_ratio:.1f}x volume)")
        
        return {'score': score, 'reasons': reasons}
    
    def _aggregate(self, signals: List[Dict], ind: Dict, price: float) -> TradingSignal:
        total_score = sum(s['score'] for s in signals)
        avg_score = total_score / len(signals)
        
        # Determine signal type
        if avg_score > 0.6:
            signal_type = SignalType.STRONG_BUY
        elif avg_score > 0.3:
            signal_type = SignalType.BUY
        elif avg_score < -0.6:
            signal_type = SignalType.STRONG_SELL
        elif avg_score < -0.3:
            signal_type = SignalType.SELL
        else:
            signal_type = SignalType.HOLD
        
        # Risk levels
        atr = ind['atr']
        stop = price - (self.config['atr_multiplier'] * atr) if signal_type in [SignalType.BUY, SignalType.STRONG_BUY] else price + (self.config['atr_multiplier'] * atr)
        reward = abs(self.config['risk_reward'] * (price - stop))
        
        if signal_type in [SignalType.SELL, SignalType.STRONG_SELL]:
            reward = price - reward
        else:
            reward = price + reward
        
        # Collect reasons
        all_reasons = []
        for s in signals:
            all_reasons.extend(s.get('reasons', []))
        
        return TradingSignal(
            signal_type=signal_type,
            confidence=min(abs(avg_score), 1.0),
            entry_price=price,
            stop_loss=stop,
            take_profit=reward,
            position_size=0.10,  # Will be refined by PositionSizer
            reasons=all_reasons[:5],
            indicators=ind
        )
    
    def _neutral_signal(self, price: float, reason: str) -> TradingSignal:
        return TradingSignal(
            signal_type=SignalType.HOLD,
            confidence=0.0,
            entry_price=price,
            stop_loss=price,
            take_profit=price,
            position_size=0,
            reasons=[reason],
            indicators={}
        )


__all__ = ['SignalGenerator', 'TradingSignal', 'SignalType']