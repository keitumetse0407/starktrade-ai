"""
Ultra Instinct Error Handling
=========================
Robust error handling - no external APIs.

Features:
- OHLCV validation
- Numeric sanitization
- Spike/outlier detection
- Safe math utilities
"""

from typing import Dict, List, Any, Optional
import math


def validate_ohlcv(ohlcv: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validate and clean OHLCV data.
    """
    clean = []
    for bar in ohlcv:
        try:
            o = float(bar.get("open", 0.0))
            h = float(bar.get("high", 0.0))
            l = float(bar.get("low", 0.0))
            c = float(bar.get("close", 0.0))
            v = float(bar.get("volume", 0.0))
            
            # Skip invalid bars
            if o <= 0 or h <= 0 or l <= 0 or c <= 0 or v <= 0:
                continue
            
            # High should be highest, low should be lowest
            if h < l or h < o or h < c or l > o or l > c:
                continue
            
            clean.append({
                "open": o,
                "high": h,
                "low": l,
                "close": c,
                "volume": v
            })
        except (ValueError, TypeError):
            continue
    
    return clean


def sanitize_numeric(value: Any, default: float = 0.0) -> float:
    """
    Sanitize numeric value - handle NaN, Inf, None.
    """
    if value is None:
        return default
    
    try:
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return default
        return v
    except (ValueError, TypeError):
        return default


def sanitize_series(data: List[float], max_nan_frac: float = 0.3) -> List[float]:
    """
    Sanitize numeric series - handle NaN, fill forward.
    """
    if not data:
        return []
    
    clean = []
    nan_count = 0
    
    for v in data:
        if math.isnan(v) or math.isinf(v):
            nan_count += 1
            # Forward fill
            clean.append(clean[-1] if clean else 0.0)
        else:
            clean.append(v)
    
    # If too many NaN, return empty
    if nan_count / len(data) > max_nan_frac:
        return []
    
    return clean


def spike_check(data: List[float], z_thresh: float = 5.0) -> bool:
    """
    Detect price spikes using Z-score.
    """
    if len(data) < 20:
        return False
    
    recent = data[-20:]
    m = sum(recent) / len(recent)
    
    variance = sum((x - m) ** 2 for x in recent) / len(recent)
    s = variance ** 0.5
    
    if s == 0:
        return False
    
    z = abs(data[-1] - m) / s
    return z > z_thresh


def safe_divide(a: float, b: float, default: float = 0.0) -> float:
    """
    Safe division with fallback.
    """
    try:
        if b == 0:
            return default
        return a / b
    except (ValueError, TypeError, ZeroDivisionError):
        return default


def validate_input(data: Dict[str, Any]) -> bool:
    """
    Validate input data structure.
    """
    required = ["symbol", "current_price", "ohlcv"]
    
    for key in required:
        if key not in data:
            return False
    
    ohlcv = data.get("ohlcv", [])
    if not ohlcv or len(ohlcv) < 5:
        return False
    
    return True


def outlier_detection(
    price: float,
    historical_prices: List[float],
    threshold: float = 3.0
) -> tuple:
    """
    Detect outliers in price data.
    """
    if len(historical_prices) < 20:
        return False, price
    
    recent = historical_prices[-50:]
    m = sum(recent) / len(recent)
    
    variance = sum((x - m) ** 2 for x in recent) / len(recent)
    s = variance ** 0.5
    
    if s == 0:
        return False, price
    
    z = abs(price - m) / s
    return z > threshold, m