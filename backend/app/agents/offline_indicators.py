"""
Pure Python Technical Indicators Library
Zero dependencies except numpy - works fully offline
"""

import numpy as np
from typing import List, Tuple, Optional


class TechnicalIndicators:
    """Ultra-fast technical indicator calculations"""
    
    @staticmethod
    def validate_data(data: List[float], min_length: int = 1) -> np.ndarray:
        if not data or len(data) < min_length:
            raise ValueError(f"Insufficient data: need {min_length}, got {len(data) if data else 0}")
        return np.array(data, dtype=np.float64)
    
    # ============ MOVING AVERAGES ============
    
    def sma(self, prices: List[float], period: int) -> float:
        """Simple Moving Average"""
        data = self.validate_data(prices, period)
        return float(np.mean(data[-period:]))
    
    def ema(self, prices: List[float], period: int) -> float:
        """Exponential Moving Average"""
        data = self.validate_data(prices, period)
        multiplier = 2.0 / (period + 1)
        ema_val = data[0]
        for price in data[1:]:
            ema_val = (price * multiplier) + (ema_val * (1 - multiplier))
        return float(ema_val)
    
    # ============ MOMENTUM INDICATORS ============
    
    def rsi(self, prices: List[float], period: int = 14) -> float:
        """Relative Strength Index (0-100)"""
        data = self.validate_data(prices, period + 1)
        deltas = np.diff(data)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return float(100.0 - (100.0 / (1.0 + rs)))
    
    def macd(self, prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float, float]:
        """MACD - Returns (macd_line, signal_line, histogram)"""
        data = self.validate_data(prices, slow + signal)
        ema_fast = self._ema_array(data, fast)
        ema_slow = self._ema_array(data, slow)
        macd_line = ema_fast - ema_slow
        signal_line = self._ema_array(macd_line, signal)
        histogram = macd_line[-1] - signal_line[-1]
        return float(macd_line[-1]), float(signal_line[-1]), float(histogram)
    
    def _ema_array(self, prices: List[float], period: int) -> np.ndarray:
        data = self.validate_data(prices, period)
        multiplier = 2.0 / (period + 1)
        ema = np.zeros(len(data))
        ema[0] = data[0]
        for i in range(1, len(data)):
            ema[i] = (data[i] * multiplier) + (ema[i-1] * (1 - multiplier))
        return ema
    
    # ============ VOLATILITY INDICATORS ============
    
    def bollinger_bands(self, prices: List[float], period: int = 20, std_dev: float = 2.0) -> Tuple[float, float, float]:
        """Bollinger Bands - Returns (upper, middle, lower)"""
        data = self.validate_data(prices, period)
        middle = self.sma(data.tolist(), period)
        std = float(np.std(data[-period:]))
        upper = middle + (std_dev * std)
        lower = middle - (std_dev * std)
        return upper, middle, lower
    
    def atr(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
        """Average True Range"""
        h = self.validate_data(highs, period + 1)
        l = self.validate_data(lows, period + 1)
        c = self.validate_data(closes, period + 1)
        tr = np.zeros(len(h) - 1)
        for i in range(1, len(h)):
            hl = h[i] - l[i]
            hc = abs(h[i] - c[i-1])
            lc = abs(l[i] - c[i-1])
            tr[i-1] = max(hl, hc, lc)
        return float(np.mean(tr[-period:]))
    
    # ============ TREND INDICATORS ============
    
    def linear_regression_slope(self, prices: List[float], period: int = 14) -> float:
        """Linear Regression Slope"""
        data = self.validate_data(prices, period)
        y = data[-period:]
        x = np.arange(len(y))
        x_mean, y_mean = np.mean(x), np.mean(y)
        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)
        if denominator == 0:
            return 0.0
        return float(numerator / denominator)
    
    def support_resistance(self, prices: List[float], window: int = 20) -> Tuple[float, float]:
        """Support and Resistance levels"""
        data = self.validate_data(prices, window)
        recent = data[-window:]
        # Local minima
        supports = []
        for i in range(1, len(recent) - 1):
            if recent[i] < recent[i-1] and recent[i] < recent[i+1]:
                supports.append(recent[i])
        # Local maxima  
        resistances = []
        for i in range(1, len(recent) - 1):
            if recent[i] > recent[i-1] and recent[i] > recent[i+1]:
                resistances.append(recent[i])
        support = np.mean(supports) if supports else float(np.min(recent))
        resistance = np.mean(resistances) if resistances else float(np.max(recent))
        return support, resistance
    
    # ============ VOLUME INDICATORS ============
    
    def volume_ratio(self, volumes: List[float], period: int = 20) -> float:
        """Volume Ratio vs Average"""
        data = self.validate_data(volumes, period + 1)
        avg = np.mean(data[-period-1:-1])
        current = data[-1]
        if avg == 0:
            return 1.0
        return float(current / avg)
    
    def obv(self, closes: List[float], volumes: List[float]) -> float:
        """On-Balance Volume"""
        c = self.validate_data(closes, 2)
        v = self.validate_data(volumes, 2)
        obv = 0.0
        for i in range(1, len(c)):
            if c[i] > c[i-1]:
                obv += v[i]
            elif c[i] < c[i-1]:
                obv -= v[i]
        return float(obv)
    
    # ============ STOCHASTIC ============
    
    def stochastic_oscillator(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> Tuple[float, float]:
        """Stochastic Oscillator (%K, %D)"""
        h = self.validate_data(highs, period)
        l = self.validate_data(lows, period)
        c = self.validate_data(closes, period)
        recent_high = float(np.max(h[-period:]))
        recent_low = float(np.min(l[-period:]))
        current_close = c[-1]
        if recent_high == recent_low:
            k = 50.0
        else:
            k = 100.0 * (current_close - recent_low) / (recent_high - recent_low)
        return k, k  # Simplified


# ============ CONVENIENCE FUNCTIONS ============

TI = TechnicalIndicators()

def sma(prices: List[float], period: int) -> float:
    return TI.sma(prices, period)

def ema(prices: List[float], period: int) -> float:
    return TI.ema(prices, period)

def rsi(prices: List[float], period: int = 14) -> float:
    return TI.rsi(prices, period)

def macd(prices: List[float]) -> Tuple[float, float, float]:
    return TI.macd(prices)

def bollinger_bands(prices: List[float], period: int = 20, std: float = 2.0) -> Tuple[float, float, float]:
    return TI.bollinger_bands(prices, period, std)

def atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
    return TI.atr(highs, lows, closes, period)

def volume_ratio(volumes: List[float], period: int = 20) -> float:
    return TI.volume_ratio(volumes, period)

def linear_regression_slope(prices: List[float], period: int = 14) -> float:
    return TI.linear_regression_slope(prices, period)

def support_resistance(prices: List[float], window: int = 20) -> Tuple[float, float]:
    return TI.support_resistance(prices, window)

def obv(closes: List[float], volumes: List[float]) -> float:
    return TI.obv(closes, volumes)

def stochastic(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> Tuple[float, float]:
    return TI.stochastic_oscillator(highs, lows, closes, period)


__all__ = [
    'TechnicalIndicators', 'TI',
    'sma', 'ema', 'rsi', 'macd', 'bollinger_bands', 'atr',
    'volume_ratio', 'linear_regression_slope', 'support_resistance',
    'obv', 'stochastic'
]