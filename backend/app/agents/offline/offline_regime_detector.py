"""
Ultra Instinct Enhanced Regime Detector
==================================
Advanced market regime detection - no external APIs.

Detects:
- Trend: Bull / Bear / Neutral
- Volatility: Low / Medium / High / Crisis
- Correlation breakdown
- Confidence scoring
"""

from typing import Dict, List, Any

from .offline_indicators import (
    ema, adx, volatility, atr, rate_of_change, _mean, _std, _median
)


def detect_regime_enhanced(
    ohlcv: List[Dict[str, float]],
    closes: List[float],
    cfg: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Enhanced regime detection: trend + volatility + confidence + smoothed transitions.
    """
    out = {
        "regime": "Sideways",
        "trend": "Neutral",
        "volatility": "Medium",
        "confidence": 0.5,
        "details": {}
    }
    
    if len(closes) < 60:
        return out
    
    # === TREND DETECTION ===
    ema_fast = ema(closes, 20)
    ema_slow = ema(closes, 50)
    
    if not ema_fast or not ema_slow:
        return out
    
    price = closes[-1]
    e20 = ema_fast[-1]
    e50 = ema_slow[-1]
    
    # Calculate slopes
    slope_20 = (e20 - ema_fast[-5]) / 5.0 if len(ema_fast) >= 5 else 0.0
    slope_50 = (e50 - ema_slow[-5]) / 5.0 if len(ema_slow) >= 5 else 0.0
    
    trend = "Neutral"
    trend_score = 0.0
    
    if e20 > e50 and slope_20 > 0:
        trend = "Bull"
        trend_score = min(1.0, 
            (e20 - e50) / (e50 * 0.02) * 0.6 + 
            slope_20 / (e20 * 0.01) * 0.4)
    elif e20 < e50 and slope_20 < 0:
        trend = "Bear"
        trend_score = min(1.0,
            (e50 - e20) / (e50 * 0.02) * 0.6 +
            abs(slope_20) / (e20 * 0.01) * 0.4)
    else:
        trend = "Neutral"
        trend_score = 0.3
    
    # === ADX (Trend Strength) ===
    adx_now, plus_di, minus_di = adx(ohlcv, 14)
    adx_score = min(1.0, adx_now / 40.0) if adx_now > 0 else 0.5
    
    # === VOLATILITY REGIME ===
    vol_now = volatility(closes, 20)
    vol_hist = volatility(closes[:-20], 20) if len(closes) >= 40 else 0
    vol_med = _median(vol_now) if vol_now else 0
    
    vol_level = "Medium"
    vol_score = 0.5
    
    if vol_now and vol_hist:
        if vol_now < vol_hist * 0.7:
            vol_level = "Low"
            vol_score = 0.3
        elif vol_now > vol_hist * 1.5:
            vol_level = "High"
            vol_score = 0.8
        elif vol_now > vol_hist * 2.5:
            vol_level = "Crisis"
            vol_score = 0.95
    
    # === RATE OF CHANGE ===
    roc = rate_of_change(closes, 10)
    
    # === COMBINE FOR REGIME ===
    if trend == "Bull" and adx_score > 0.6 and vol_score < 0.7:
        regime = "Bull"
    elif trend == "Bear" and adx_score > 0.6 and vol_score < 0.7:
        regime = "Bear"
    elif vol_score >= 0.8 or (adx_score < 0.4 and abs(roc) < 2.0):
        regime = "Sideways"
    else:
        regime = "Sideways"
    
    # Confidence: combination of trend score, ADX, and inverse volatility
    confidence = (
        trend_score * 0.4 +
        adx_score * 0.3 +
        (1 - vol_score) * 0.3
    )
    confidence = min(1.0, max(0.0, confidence))
    
    out = {
        "regime": regime,
        "trend": trend,
        "volatility": vol_level,
        "confidence": round(confidence, 2),
        "details": {
            "ema20": round(e20, 2),
            "ema50": round(e50, 2),
            "slope20": round(slope_20, 4),
            "slope50": round(slope_50, 4),
            "adx": round(adx_now, 2),
            "vol_20d": round(vol_now, 2) if vol_now else 0,
            "roc_10d": round(roc, 2) if roc else 0,
        }
    }
    
    return out


# ============================================================
# SIMPLE REGIME (Legacy compatibility)
# ============================================================

def detect_regime_simple(closes: List[float], period: int = 20) -> str:
    """Simple regime detection for basic usage."""
    if len(closes) < period:
        return "Sideways"
    
    # Calculate returns
    recent = closes[-period:]
    returns = [(recent[i] - recent[i-1]) / recent[i-1] for i in range(1, len(recent))]
    
    avg_return = _mean(returns)
    std_return = _std(returns)
    
    if std_return == 0:
        return "Sideways"
    
    # Simple rules
    if avg_return > 0.01 and std_return < 0.02:
        return "Bull"
    elif avg_return < -0.01 and std_return < 0.02:
        return "Bear"
    elif std_return > 0.03:
        return "Crisis"
    else:
        return "Sideways"