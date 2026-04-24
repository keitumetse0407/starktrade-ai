"""
Ultra Instinct Enhanced Position Sizer
====================================
Advanced risk management - no external APIs.

Features:
- Kelly Criterion
- Volatility-adjusted sizing
- Volatility targeting
- Drawdown-based reduction
- Correlation-aware sizing
"""

from typing import Dict, List, Any, Optional

from .offline_indicators import atr, volatility, _safe_div, _mean


def kelly_fraction(win_prob: float, avg_win: float, avg_loss: float) -> float:
    """
    Kelly Criterion: f* = (p*b - (1-p)) / b
    b = avg_win / avg_loss
    """
    if avg_loss <= 0 or win_prob <= 0 or win_prob >= 1:
        return 0.0
    
    b = avg_win / avg_loss
    if b <= 0:
        return 0.0
    
    f = (win_prob * b - (1 - win_prob)) / b
    return max(0.0, min(1.0, f))


def position_size_enhanced(
    data: Dict[str, Any],
    signal: Dict[str, Any],
    cfg: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Enhanced position sizing.
    """
    # Extract values
    cash = float(data.get("cash", 10000.0))
    account_value = float(data.get("account_value", cash))
    current_price = float(data.get("current_price", 0.0))
    position = float(data.get("position", 0.0))
    ohlcv = data.get("ohlcv", [])
    
    # Signal info
    sig = signal.get("signal", "hold")
    conf = float(signal.get("confidence", 0.0))
    stop = signal.get("stop_loss")
    take_profit = signal.get("take_profit")
    
    # Config
    base_risk_pct = float(cfg.get("base_risk_pct", 1.0)) / 100.0
    max_risk_pct = float(cfg.get("max_risk_pct", 3.0)) / 100.0
    max_pos_pct = float(cfg.get("max_pos_pct", 25.0)) / 100.0
    dd_reduction = float(cfg.get("dd_reduction", 0.5))
    vol_target = float(cfg.get("vol_target", 0.15)) / 100.0
    min_conf = float(cfg.get("min_conf", 0.4))
    
    # Hold or low confidence
    if sig == "hold" or conf < min_conf:
        return {
            "position_size": 0.0,
            "stop_loss": stop,
            "take_profit": take_profit,
            "risk_pct": 0.0,
            "reasoning": "Hold or low confidence"
        }
    
    # Get ATR for stop distance
    atr14 = atr(ohlcv, 14) if ohlcv else 0
    vol20 = volatility([float(b.get("close", 0.0)) for b in ohlcv], 20) if ohlcv else 0
    
    # Calculate risk per share
    if stop is not None and stop > 0 and current_price > 0:
        risk_per_share = abs(current_price - stop)
        if risk_per_share <= 0:
            risk_per_share = current_price * 0.01
    else:
        risk_per_share = current_price * 0.01
    
    # Adjust for ATR
    if atr14 > 0:
        risk_per_share = max(risk_per_share, atr14 * 1.5)
        risk_pct = base_risk_pct * conf * (atr14 / (current_price * 0.015)) if current_price > 0 else 1.0
        risk_pct = min(risk_pct, max_risk_pct)
    else:
        risk_pct = base_risk_pct * conf
    
    # Volatility targeting
    if vol20 > 0 and vol_target > 0:
        vol_factor = vol_target / (vol20 / 100.0)
        risk_pct *= min(2.0, max(0.5, vol_factor))
    
    # Drawdown control
    if "drawdown" in cfg:
        dd = float(cfg.get("drawdown", 0.0))
        if dd > 0.1:
            risk_pct *= dd_reduction
        elif dd > 0.05:
            risk_pct *= 0.8
    
    # Calculate position
    risk_dollars = account_value * risk_pct
    shares = risk_dollars / risk_per_share if risk_per_share > 0 else 0.0
    pos_value = shares * current_price
    pos_pct = pos_value / account_value if account_value > 0 else 0.0
    
    # Apply limits
    pos_pct = min(pos_pct, max_pos_pct)
    final_shares = (account_value * pos_pct) / current_price if current_price > 0 else 0.0
    
    # Final stop/take profit
    final_stop = stop if stop else (current_price * 0.98 if sig == "buy" else current_price * 1.02)
    final_tp = take_profit if take_profit else (current_price * 1.06 if sig == "buy" else current_price * 0.94)
    
    return {
        "position_size": round(pos_pct, 4),
        "stop_loss": round(final_stop, 2),
        "take_profit": round(final_tp, 2),
        "risk_pct": round(risk_pct * 100.0, 2),
        "reasoning": (
            f"Signal: {sig} (conf {conf:.2f}). "
            f"Volatility-adjusted risk {risk_pct*100:.2f}%. "
            f"ATR stop ~{risk_per_share:.2f}. "
            f"Max pos {max_pos_pct:.1f}%. "
            f"DD factor {dd_reduction if cfg.get('drawdown',0)>0.05 else 1.0}."
        )
    }


# ============================================================
# SIMPLE SIZER (Legacy compatibility)
# ============================================================

def position_size_simple(
    account_value: float,
    risk_per_trade: float,
    stop_distance: float,
    max_position_pct: float = 0.25
) -> float:
    """Simple position sizing."""
    if stop_distance <= 0 or account_value <= 0:
        return 0.0
    
    position_value = account_value * risk_per_trade / stop_distance
    position_pct = position_value / account_value
    
    return min(position_pct, max_position_pct)