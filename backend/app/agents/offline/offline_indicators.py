"""
Ultra Instinct Enhanced Indicators Module
===================================
Professional-grade technical indicators - pure Python, no external APIs.

Indicators:
- VWAP (Volume Weighted Average Price)
- ATR (Average True Range)  
- Stochastic Oscillator
- ADX (Average Directional Index)
- Ichimoku Cloud
- Pivot Points (Floor, Woodie, Camarilla)
- Custom Momentum Oscillator
"""

import math
from typing import List, Dict, Optional, Tuple
from functools import reduce


# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def _safe_div(a: float, b: float, default: float = 0.0) -> float:
    """Safe division: returns default if b == 0 or inputs invalid."""
    try:
        if b == 0 or not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            return default
        return float(a) / float(b)
    except Exception:
        return default


def _mean(values: List[float]) -> float:
    """Pure Python mean."""
    n = len(values)
    if n == 0:
        return 0.0
    return sum(values) / n


def _std(values: List[float]) -> float:
    """Pure Python std (population)."""
    n = len(values)
    if n < 2:
        return 0.0
    m = _mean(values)
    variance = sum((v - m) ** 2 for v in values) / n
    return variance ** 0.5


def _median(values: List[float]) -> float:
    """Pure Python median."""
    n = len(values)
    if n == 0:
        return 0.0
    sorted_vals = sorted(values)
    mid = n // 2
    if n % 2 == 1:
        return sorted_vals[mid]
    return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2


# ============================================================
# BASIC INDICATORS (Enhanced with guards)
# ============================================================

def sma(data: List[float], period: int) -> List[float]:
    """Simple Moving Average."""
    out: List[float] = []
    if period <= 0 or len(data) < period:
        return out
    window_sum = 0.0
    for i, v in enumerate(data):
        window_sum += v
        if i >= period:
            window_sum -= data[i - period]
        if i >= period - 1:
            out.append(window_sum / period)
    return out


def ema(data: List[float], period: int) -> List[float]:
    """Exponential Moving Average."""
    out: List[float] = []
    if period <= 0 or len(data) < period:
        return out
    k = 2.0 / (period + 1.0)
    # Start with SMA
    start_mean = _mean(data[:period])
    out.append(start_mean)
    for i in range(period, len(data)):
        ema_val = data[i] * k + out[-1] * (1 - k)
        out.append(ema_val)
    return out


def rsi_(data: List[float], period: int = 14) -> List[float]:
    """Relative Strength Index."""
    out: List[float] = []
    if period <= 0 or len(data) < period + 1:
        return out
    
    gains: List[float] = []
    losses: List[float] = []
    for i in range(1, len(data)):
        diff = data[i] - data[i - 1]
        gains.append(max(diff, 0.0))
        losses.append(max(-diff, 0.0))
    
    # First RSI
    avg_gain = _mean(gains[:period])
    avg_loss = _mean(losses[:period])
    
    if avg_loss == 0:
        out.append(100.0)
    else:
        rs = avg_gain / avg_loss
        out.append(100.0 - (100.0 / (1.0 + rs)))
    
    # Subsequent RSI (Wilder's smoothing)
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            out.append(100.0)
        else:
            rs = avg_gain / avg_loss
            out.append(100.0 - (100.0 / (1.0 + rs)))
    return out


def macd(data: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[List[float], List[float], List[float]]:
    """MACD: macd_line, signal_line, histogram."""
    ema_fast = ema(data, fast)
    ema_slow = ema(data, slow)
    
    # Align lengths
    if len(ema_fast) < len(ema_slow):
        ema_slow = ema_slow[-len(ema_fast):]
    elif len(ema_slow) < len(ema_fast):
        ema_fast = ema_fast[-len(ema_slow):]
    
    macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
    sig_line = ema(macd_line, signal)
    
    # Align again
    if len(sig_line) < len(macd_line):
        macd_line = macd_line[-len(sig_line):]
    
    hist = [m - s for m, s in zip(macd_line, sig_line)]
    return macd_line, sig_line, hist


def bollinger_bands(data: List[float], period: int = 20, k: float = 2.0) -> Tuple[List[float], List[float], List[float]]:
    """Bollinger Bands: middle, upper, lower."""
    middle: List[float] = []
    upper: List[float] = []
    lower: List[float] = []
    
    if len(data) < period:
        return middle, upper, lower
    
    for i in range(period - 1, len(data)):
        window = data[i - period + 1: i + 1]
        m = _mean(window)
        s = _std(window)
        
        if s == 0:  # Avoid division issues
            continue
        
        middle.append(m)
        upper.append(m + k * s)
        lower.append(m - k * s)
    
    return middle, upper, lower


# ============================================================
# NEW ENHANCED INDICATORS
# ============================================================

def vwap(ohlcv: List[Dict[str, float]], period: Optional[int] = None) -> float:
    """
    Volume Weighted Average Price.
    ohlcv: [{'open': float, 'high': float, 'low': float, 'close': float, 'volume': float}, ...]
    If period is None: cumulative VWAP; else rolling VWAP.
    """
    if not ohlcv:
        return 0.0
    
    cum_pv = 0.0
    cum_vol = 0.0
    pv_history: List[float] = []
    vol_history: List[float] = []
    
    for bar in ohlcv:
        close = float(bar.get("close", 0.0))
        vol = float(bar.get("volume", 0.0))
        
        if vol <= 0:
            continue
        
        pv = close * vol
        
        if period is None:
            cum_pv += pv
            cum_vol += vol
            if cum_vol > 0:
                pv_history.append(cum_pv / cum_vol)
            else:
                pv_history.append(0.0)
        else:
            pv_history.append(pv)
            vol_history.append(vol)
            if len(pv_history) > period:
                pv_history.pop(0)
                vol_history.pop(0)
            
            sum_pv = sum(pv_history)
            sum_vol = sum(vol_history)
            if sum_vol > 0:
                pv_history[-1] = sum_pv / sum_vol
            else:
                pv_history[-1] = 0.0
    
    return pv_history[-1] if pv_history else 0.0


def atr(ohlcv: List[Dict[str, float]], period: int = 14) -> float:
    """
    Average True Range (ATR).
    Requires: 'high', 'low', 'close' keys.
    """
    if len(ohlcv) < 2:
        return 0.0
    
    tr_values: List[float] = []
    prev_close = float(ohlcv[0].get("close", 0.0))
    
    for i in range(1, len(ohlcv)):
        h = float(ohlcv[i].get("high", 0.0))
        l = float(ohlcv[i].get("low", 0.0))
        c = float(ohlcv[i].get("close", 0.0))
        
        if prev_close <= 0:
            tr = h - l
        else:
            tr = max(h - l, abs(h - prev_close), abs(l - prev_close))
        
        tr_values.append(tr)
        prev_close = c
    
    if len(tr_values) < period:
        return _mean(tr_values) if tr_values else 0.0
    
    # First ATR is SMA
    atr_val = _mean(tr_values[:period])
    
    # Subsequent ATR uses Wilder's smoothing
    for i in range(period, len(tr_values)):
        atr_val = (atr_val * (period - 1) + tr_values[i]) / period
    
    return atr_val


def stochastic(ohlcv: List[Dict[str, float]], k_period: int = 14, d_period: int = 3) -> Tuple[float, float]:
    """
    Stochastic Oscillator: %K and %D.
    Returns: (k_value, d_value)
    """
    if len(ohlcv) < k_period:
        return 50.0, 50.0
    
    k_values: List[float] = []
    
    for i in range(k_period - 1, len(ohlcv)):
        # Find highest high and lowest low in the period
        window = ohlcv[i - k_period + 1: i + 1]
        high = max(float(b.get("high", 0.0)) for b in window)
        low = min(float(b.get("low", 0.0)) for b in window)
        close = float(ohlcv[i].get("close", 0.0))
        
        if high == low:
            k_values.append(50.0)
        else:
            k = (close - low) / (high - low) * 100.0
            k_values.append(k)
    
    if not k_values:
        return 50.0, 50.0
    
    # %D is SMA of %K
    if len(k_values) < d_period:
        d = _mean(k_values)
    else:
        d = _mean(k_values[-d_period:])
    
    return k_values[-1], d


def adx(ohlcv: List[Dict[str, float]], period: int = 14) -> Tuple[float, float, float]:
    """
    Average Directional Index (ADX), +DI, -DI.
    Returns: (adx, plus_di, minus_di)
    """
    if len(ohlcv) < 3:
        return 0.0, 0.0, 0.0
    
    dm_plus: List[float] = []
    dm_minus: List[float] = []
    tr_list: List[float] = []
    
    prev_h = float(ohlcv[0].get("high", 0.0))
    prev_l = float(ohlcv[0].get("low", 0.0))
    prev_c = float(ohlcv[0].get("close", 0.0))
    
    for i in range(1, len(ohlcv)):
        h = float(ohlcv[i].get("high", 0.0))
        l = float(ohlcv[i].get("low", 0.0))
        c = float(ohlcv[i].get("close", 0.0))
        
        up_move = h - prev_h
        down_move = prev_l - l
        
        if up_move > down_move and up_move > 0:
            dm_plus.append(up_move)
        else:
            dm_plus.append(0.0)
        
        if down_move > up_move and down_move > 0:
            dm_minus.append(down_move)
        else:
            dm_minus.append(0.0)
        
        tr = max(h - l, abs(h - prev_c), abs(l - prev_c))
        tr_list.append(tr)
        
        prev_h, prev_l, prev_c = h, l, c
    
    if len(tr_list) < period:
        return 0.0, 0.0, 0.0
    
    # First values are SMA
    atr_val = _mean(tr_list[:period])
    pdm = _mean(dm_plus[:period])
    mdm = _mean(dm_minus[:period])
    
    if atr_val == 0:
        return 0.0, 0.0, 0.0
    
    plus_di = pdm / atr_val * 100.0
    minus_di = mdm / atr_val * 100.0
    dx = abs(plus_di - minus_di) / (plus_di + minus_di + 0.0001) * 100.0
    
    adx_val = dx
    
    # Subsequent values use Wilder's smoothing
    for i in range(period, len(tr_list)):
        if tr_list[i] <= 0:
            continue
        atr_val = (atr_val * (period - 1) + tr_list[i]) / period
        pdm = (pdm * (period - 1) + dm_plus[i]) / period
        mdm = (mdm * (period - 1) + dm_minus[i]) / period
        
        if atr_val > 0:
            plus_di = pdm / atr_val * 100.0
            minus_di = mdm / atr_val * 100.0
            dx = abs(plus_di - minus_di) / (plus_di + minus_di + 0.0001) * 100.0
            adx_val = (adx_val * (period - 1) + dx) / period
    
    return adx_val, plus_di, minus_di


def ichimoku(ohlcv: List[Dict[str, float]], tenkan: int = 9, kijun: int = 26, senkou_b: int = 52) -> Dict[str, float]:
    """
    Ichimoku Cloud components.
    Returns: tenkan, kijun, senkou_a, senkou_b, chikou
    """
    if len(ohlcv) < max(tenkan, kijun, senkou_b):
        return {"tenkan": 0.0, "kijun": 0.0, "senkou_a": 0.0, "senkou_b": 0.0, "chikou": 0.0}
    
    highs = [float(b.get("high", 0.0)) for b in ohlcv]
    lows = [float(b.get("low", 0.0)) for b in ohlcv]
    closes = [float(b.get("close", 0.0)) for b in ohlcv]
    
    # Tenkan-sen (Conversion Line)
    h9 = max(highs[-tenkan:])
    l9 = min(lows[-tenkan:])
    tenkan_sen = (h9 + l9) / 2.0
    
    # Kijun-sen (Base Line)
    h26 = max(highs[-kijun:])
    l26 = min(lows[-kijun:])
    kijun_sen = (h26 + l26) / 2.0
    
    # Senkou Span A (Leading Span A)
    senkou_a = (tenkan_sen + kijun_sen) / 2.0
    
    # Senkou Span B (Leading Span B)
    h52 = max(highs[-senkou_b:])
    l52 = min(lows[-senkou_b:])
    senkou_span_b = (h52 + l52) / 2.0
    
    # Chikou Span (Lagging Span) - 26 periods back
    chikou = closes[-26] if len(closes) >= 26 else closes[-1]
    
    return {
        "tenkan": round(tenkan_sen, 2),
        "kijun": round(kijun_sen, 2),
        "senkou_a": round(senkou_a, 2),
        "senkou_b": round(senkou_span_b, 2),
        "chikou": round(chikou, 2)
    }


def pivot_points(bar: Dict[str, float], method: str = "floor") -> Dict[str, float]:
    """
    Pivot points for a single bar.
    Methods: floor, woodie, camarilla
    """
    h = float(bar.get("high", 0.0))
    l = float(bar.get("low", 0.0))
    c = float(bar.get("close", 0.0))
    
    if h == 0 or l == 0:
        return {}
    
    if method == "floor":
        p = (h + l + c) / 3.0
        r1 = 2 * p - l
        s1 = 2 * p - h
        r2 = p + (h - l)
        s2 = p - (h - l)
        r3 = h + 2 * (p - l)
        s3 = l - 2 * (h - p)
        return {"p": p, "r1": r1, "s1": s1, "r2": r2, "s2": s2, "r3": r3, "s3": s3}
    
    elif method == "woodie":
        p = (h + l + 2 * c) / 4.0
        r1 = 2 * p - l
        s1 = 2 * p - h
        r2 = p + (h - l)
        s2 = p - (h - l)
        return {"p": p, "r1": r1, "s1": s1, "r2": r2, "s2": s2}
    
    elif method == "camarilla":
        range_ = h - l
        r1 = c + range_ * 1.1 / 12
        r2 = c + range_ * 1.1 / 6
        r3 = c + range_ * 1.1 / 4
        r4 = c + range_ * 1.1 / 2
        s1 = c - range_ * 1.1 / 12
        s2 = c - range_ * 1.1 / 6
        s3 = c - range_ * 1.1 / 4
        s4 = c - range_ * 1.1 / 2
        return {"p": c, "r1": r1, "s1": s1, "r2": r2, "s2": s2, "r3": r3, "s3": s3, "r4": r4, "s4": s4}
    
    return {}


def rate_of_change(data: List[float], period: int = 10) -> float:
    """Rate of change (%) over period."""
    if len(data) < period + 1:
        return 0.0
    roc = (data[-1] - data[-period - 1]) / data[-period - 1] * 100.0
    return roc


def volatility(data: List[float], period: int = 20) -> float:
    """Rolling volatility (std of returns)."""
    if len(data) < period + 1:
        return 0.0
    
    returns: List[float] = []
    for i in range(1, len(data)):
        if data[i - 1] != 0:
            r = (data[i] - data[i - 1]) / data[i - 1]
            returns.append(r)
    
    if len(returns) < period:
        return 0.0
    
    return _std(returns[-period:]) * 100.0


def custom_momentum_oscillator(ohlcv: List[Dict[str, float]], period: int = 10) -> float:
    """Volume-weighted momentum oscillator."""
    if len(ohlcv) < period + 1:
        return 0.0
    
    prices = [float(b.get("close", 0.0)) for b in ohlcv[-period-1:]]
    volumes = [float(b.get("volume", 0.0)) for b in ohlcv[-period:]]
    
    raw_momentum = []
    for i in range(1, len(prices)):
        if prices[i - 1] != 0:
            m = (prices[i] - prices[i - 1]) / prices[i - 1]
            raw_momentum.append(m)
    
    if not raw_momentum or not volumes:
        return 0.0
    
    # Volume-weighted momentum
    vol_weighted = sum(m * v for m, v in zip(raw_momentum, volumes)) / sum(volumes)
    
    # Sigmoid scaling to [-1, 1]
    return 2 / (1 + math.exp(-5 * vol_weighted)) - 1