"""
Ultra Instinct Enhanced Strategies
====================================
Advanced trading strategies - no external APIs.

Strategies:
- BB + RSI Mean Reversion
- Breakout + Volume + VWAP
- Gap Fill
- Support/Resistance Bounce (pivot-based)
- 3-EMA Trend Continuation
- RSI Divergence Detection
- Regime-Aware Strategy Router
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .offline_indicators import (
    sma, ema, rsi_, macd, bollinger_bands, vwap, atr, stochastic, adx,
    ichimoku, pivot_points, rate_of_change, volatility, _safe_div, _mean, _std
)


@dataclass
class StrategySignal:
    name: str
    side: str  # buy/sell/hold
    strength: float  # 0..1
    confidence: float  # 0..1
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    meta: Optional[Dict[str, Any]] = None


def _last_or_default(seq: List[float], default: float = 0.0) -> float:
    """Get last value or default."""
    return seq[-1] if seq else default


# ============================================================
# STRATEGY 1: BB + RSI Mean Reversion
# ============================================================

def strategy_bb_rsi_mean_reversion(
    ohlcv: List[Dict[str, float]],
    closes: List[float],
    params: Dict[str, Any]
) -> StrategySignal:
    """Mean reversion with Bollinger Bands + RSI confirmation."""
    
    bb_period = int(params.get("bb_period", 20))
    bb_k = float(params.get("bb_k", 2.0))
    rsi_period = int(params.get("rsi_period", 14))
    rsi_low = float(params.get("rsi_low", 30.0))
    rsi_high = float(params.get("rsi_high", 70.0))
    
    if len(closes) < bb_period + rsi_period:
        return StrategySignal("BB+RSI", "hold", 0.0, 0.0)
    
    # Calculate indicators
    middle, upper, lower = bollinger_bands(closes, period=bb_period, k=bb_k)
    rsi_vals = rsi_(closes, period=rsi_period)
    
    if not middle or not rsi_vals:
        return StrategySignal("BB+RSI", "hold", 0.0, 0.0)
    
    price = closes[-1]
    rsi = rsi_vals[-1]
    bb_middle = middle[-1] if middle else 0
    bb_upper = upper[-1] if upper else 0
    bb_lower = lower[-1] if lower else 0
    
    if bb_upper == bb_lower:
        return StrategySignal("BB+RSI", "hold", 0.0, 0.0)
    
    side = "hold"
    strength = 0.0
    conf = 0.0
    stop = None
    tp = None
    
    # Buy signal: price below lower BB + RSI oversold
    if price <= bb_lower and rsi <= rsi_low:
        side = "buy"
        strength = min(1.0, (rsi_low - rsi) / rsi_low * 0.6 + (bb_lower - price) / (bb_middle - bb_lower + 0.001) * 0.4)
        conf = 0.7
        stop = bb_lower * 0.995
        tp = bb_middle
    
    # Sell signal: price above upper BB + RSI overbought
    elif price >= bb_upper and rsi >= rsi_high:
        side = "sell"
        strength = min(1.0, (rsi - rsi_high) / (100 - rsi_high) * 0.6 + (price - bb_upper) / (bb_upper - bb_middle + 0.001) * 0.4)
        conf = 0.7
        stop = bb_upper * 1.005
        tp = bb_middle
    
    return StrategySignal("BB+RSI", side, strength, conf, stop, tp, {"rsi": rsi, "bb": (bb_lower, bb_middle, bb_upper)})


# ============================================================
# STRATEGY 2: Breakout + Volume + VWAP
# ============================================================

def strategy_breakout_volume_vwap(
    ohlcv: List[Dict[str, float]],
    closes: List[float],
    params: Dict[str, Any]
) -> StrategySignal:
    """Breakout strategy with volume confirmation and VWAP anchor."""
    
    lookback = int(params.get("lookback", 20))
    vol_mult = float(params.get("vol_mult", 1.5))
    vwap_period = int(params.get("vwap_period", 20))
    
    if len(ohlcv) < lookback + 1:
        return StrategySignal("Breakout+Vol+VWAP", "hold", 0.0, 0.0)
    
    # Get data
    highs = [float(b.get("high", 0.0)) for b in ohlcv]
    lows = [float(b.get("low", 0.0)) for b in ohlcv]
    volumes = [float(b.get("volume", 0.0)) for b in ohlcv]
    
    price = closes[-1]
    prev_high = max(highs[-lookback:-1]) if len(highs) > 1 else 0
    prev_low = min(lows[-lookback:-1]) if len(lows) > 1 else 0
    avg_vol = _mean(volumes[-lookback:-1]) if len(volumes) > 1 else 0
    cur_vol = volumes[-1]
    vwap_now = vwap(ohlcv, period=vwap_period)
    atr_now = atr(ohlcv, 14)
    
    if prev_high == 0 or avg_vol == 0:
        return StrategySignal("Breakout+Vol+VWAP", "hold", 0.0, 0.0)
    
    side = "hold"
    strength = 0.0
    conf = 0.0
    stop = None
    tp = None
    
    vol_ratio = cur_vol / avg_vol
    
    # Bullish breakout
    if price > prev_high * 1.02 and vol_ratio > vol_mult and price > vwap_now:
        side = "buy"
        strength = min(1.0, 
            (price - prev_high) / prev_high * 0.4 + 
            vol_ratio / (vol_mult * 2) * 0.4 + 0.2)
        conf = 0.75
        stop = price - (atr_now if atr_now > 0 else price * 0.01)
        tp = price + 2 * (atr_now if atr_now > 0 else price * 0.02)
    
    # Bearish breakdown
    elif price < prev_low * 0.98 and vol_ratio > vol_mult and price < vwap_now:
        side = "sell"
        strength = min(1.0,
            (prev_low - price) / prev_low * 0.4 +
            vol_ratio / (vol_mult * 2) * 0.4 + 0.2)
        conf = 0.75
        stop = price + (atr_now if atr_now > 0 else price * 0.01)
        tp = price - 2 * (atr_now if atr_now > 0 else price * 0.02)
    
    return StrategySignal("Breakout+Vol+VWAP", side, strength, conf, stop, tp, 
                       {"prev_high": prev_high, "vol_ratio": vol_ratio})


# ============================================================
# STRATEGY 3: Gap Fill
# ============================================================

def strategy_gap_fill(
    ohlcv: List[Dict[str, float]],
    closes: List[float],
    params: Dict[str, Any]
) -> StrategySignal:
    """Gap-fill strategy for overnight gaps."""
    
    min_gap_pct = float(params.get("min_gap_pct", 0.5))
    
    if len(ohlcv) < 2:
        return StrategySignal("GapFill", "hold", 0.0, 0.0)
    
    prev_close = float(ohlcv[-2].get("close", 0.0))
    open_now = float(ohlcv[-1].get("open", 0.0))
    close_now = closes[-1]
    
    if prev_close == 0:
        return StrategySignal("GapFill", "hold", 0.0, 0.0)
    
    gap_pct = (open_now - prev_close) / prev_close * 100.0
    
    side = "hold"
    strength = 0.0
    conf = 0.0
    
    # Check if gap is significant
    if abs(gap_pct) < min_gap_pct:
        return StrategySignal("GapFill", "hold", 0.0, 0.0)
    
    # Upside gap being filled
    if gap_pct > 0 and close_now < open_now:
        side = "sell"
        strength = min(1.0, gap_pct / 5.0)
        conf = 0.6
    
    # Downside gap being filled
    elif gap_pct < 0 and close_now > open_now:
        side = "buy"
        strength = min(1.0, abs(gap_pct) / 5.0)
        conf = 0.6
    
    return StrategySignal("GapFill", side, strength, conf, prev_close, open_now, {"gap_pct": gap_pct})


# ============================================================
# STRATEGY 4: Support/Resistance Bounce
# ============================================================

def strategy_sr_bounce(
    ohlcv: List[Dict[str, float]],
    closes: List[float],
    params: Dict[str, Any]
) -> StrategySignal:
    """Support and resistance bounce using pivot points."""
    
    method = params.get("pivot_method", "floor")
    tolerance_pct = float(params.get("tolerance_pct", 0.5)) / 100.0
    
    if len(ohlcv) < 2:
        return StrategySignal("S/R Bounce", "hold", 0.0, 0.0)
    
    # Use previous bar for pivot calculation
    prev_bar = {
        "high": float(ohlcv[-2].get("high", 0.0)),
        "low": float(ohlcv[-2].get("low", 0.0)),
        "close": float(ohlcv[-2].get("close", 0.0))
    }
    
    pivots = pivot_points(prev_bar, method=method)
    
    if not pivots:
        return StrategySignal("S/R Bounce", "hold", 0.0, 0.0)
    
    price = closes[-1]
    
    side = "hold"
    strength = 0.0
    conf = 0.0
    stop = None
    tp = None
    
    # Check for support (S levels)
    for key, level in pivots.items():
        if key.startswith("s") or key.startswith("S"):
            dist_pct = abs(price - level) / price
            if dist_pct < tolerance_pct:
                side = "buy"
                strength = min(1.0, (tolerance_pct - dist_pct) / tolerance_pct * 0.7)
                conf = 0.65
                stop = level * 0.995
                tp = pivots.get("p", level * 1.01)
                return StrategySignal("S/R Bounce", side, strength, conf, stop, tp, 
                                 {"level": level, "type": key})
    
    # Check for resistance (R levels)
    for key, level in pivots.items():
        if key.startswith("r") or key.startswith("R"):
            dist_pct = abs(price - level) / price
            if dist_pct < tolerance_pct:
                side = "sell"
                strength = min(1.0, (tolerance_pct - dist_pct) / tolerance_pct * 0.7)
                conf = 0.65
                stop = level * 1.005
                tp = pivots.get("p", level * 0.99)
                return StrategySignal("S/R Bounce", side, strength, conf, stop, tp,
                               {"level": level, "type": key})
    
    return StrategySignal("S/R Bounce", "hold", 0.0, 0.0)


# ============================================================
# STRATEGY 5: 3-EMA Trend Continuation
# ============================================================

def strategy_ema_trend_continuation(
    closes: List[float],
    params: Dict[str, Any]
) -> StrategySignal:
    """Trend continuation using 3 EMA crossover."""
    
    ema1_period = int(params.get("ema1", 9))
    ema2_period = int(params.get("ema2", 21))
    ema3_period = int(params.get("ema3", 55))
    
    if len(closes) < ema3_period:
        return StrategySignal("3-EMA", "hold", 0.0, 0.0)
    
    ema1 = ema(closes, ema1_period)
    ema2 = ema(closes, ema2_period)
    ema3 = ema(closes, ema3_period)
    
    if not ema1 or not ema2 or not ema3:
        return StrategySignal("3-EMA", "hold", 0.0, 0.0)
    
    price = closes[-1]
    e1 = ema1[-1]
    e2 = ema2[-1]
    e3 = ema3[-1]
    
    side = "hold"
    strength = 0.0
    conf = 0.0
    stop = None
    tp = None
    
    # Bullish: ema1 > ema2 > ema3 AND price above all
    if e1 > e2 > e3 and price > e1:
        side = "buy"
        strength = min(1.0,
            (price - e2) / (e1 - e2 + 0.001) * 0.5 +
            (e1 - e3) / (e2 - e3 + 0.001) * 0.5)
        conf = 0.7
        stop = e2 * 0.995
        tp = price + (price - e2) * 1.5
    
    # Bearish: ema1 < ema2 < ema3 AND price below all
    elif e1 < e2 < e3 and price < e1:
        side = "sell"
        strength = min(1.0,
            (e2 - price) / (e2 - e1 + 0.001) * 0.5 +
            (e3 - e1) / (e3 - e2 + 0.001) * 0.5)
        conf = 0.7
        stop = e2 * 1.005
        tp = price - (e2 - price) * 1.5
    
    return StrategySignal("3-EMA", side, strength, conf, stop, tp, {"ema": (e1, e2, e3)})


# ============================================================
# STRATEGY 6: RSI Divergence
# ============================================================

def strategy_rsi_divergence(
    closes: List[float],
    params: Dict[str, Any]
) -> StrategySignal:
    """RSI divergence detection for trend reversals."""
    
    lookback = int(params.get("lookback", 20))
    rsi_period = int(params.get("rsi_period", 14))
    
    if len(closes) < lookback + rsi_period:
        return StrategySignal("RSI Divergence", "hold", 0.0, 0.0)
    
    rsi_vals = rsi_(closes, rsi_period)
    
    if len(rsi_vals) < lookback:
        return StrategySignal("RSI Divergence", "hold", 0.0, 0.0)
    
    prices = closes[-lookback:]
    rsis = rsi_vals[-lookback:]
    
    # Find price and RSI extremes
    price_max_idx = prices.index(max(prices))
    price_min_idx = prices.index(min(prices))
    rsi_max_idx = rsis.index(max(rsis))
    rsi_min_idx = rsis.index(min(rsis))
    
    price_now = closes[-1]
    rsi_now = rsis[-1]
    
    side = "hold"
    strength = 0.0
    conf = 0.0
    
    # Bearish divergence: price makes higher high but RSI makes lower high
    if price_max_idx > rsi_max_idx and price_now > prices[price_max_idx] and rsis[-1] > rsis[rsi_max_idx]:
        side = "sell"
        strength = 0.6
        conf = 0.65
    
    # Bullish divergence: price makes lower low but RSI makes higher low
    elif price_min_idx > rsi_min_idx and price_now < prices[price_min_idx] and rsis[-1] < rsis[rsi_min_idx]:
        side = "buy"
        strength = 0.6
        conf = 0.65
    
    return StrategySignal("RSI Divergence", side, strength, conf, None, None,
                         {"price_idx": price_min_idx, "rsi_idx": rsi_min_idx})


# ============================================================
# REGIME-AWARE STRATEGY ROUTER
# ============================================================

def generate_signals_enhanced(
    data: Dict[str, Any],
    regime: Dict[str, Any],
    cfg: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Enhanced signal generator with regime-aware strategy selection.
    """
    ohlcv = data.get("ohlcv", [])
    closes = [float(b.get("close", 0.0)) for b in ohlcv]
    
    if not ohlcv or not closes:
        return {
            "signal": "hold",
            "confidence": 0.0,
            "position_size": 0.0,
            "stop_loss": None,
            "take_profit": None,
            "reasoning": "No data"
        }
    
    current_price = float(data.get("current_price", closes[-1] if closes else 0.0))
    regime_type = regime.get("regime", "Sideways")
    regime_confidence = regime.get("confidence", 0.5)
    
    # Strategy configs
    bb_rsi_cfg = cfg.get("bb_rsi", {})
    breakout_cfg = cfg.get("breakout", {})
    gap_cfg = cfg.get("gap", {})
    sr_cfg = cfg.get("sr", {})
    ema_cfg = cfg.get("ema_trend", {})
    divergence_cfg = cfg.get("divergence", {})
    
    # Generate signals from all strategies
    strategies = [
        strategy_bb_rsi_mean_reversion(ohlcv, closes, bb_rsi_cfg),
        strategy_breakout_volume_vwap(ohlcv, closes, breakout_cfg),
        strategy_gap_fill(ohlcv, closes, gap_cfg),
        strategy_sr_bounce(ohlcv, closes, sr_cfg),
        strategy_ema_trend_continuation(closes, ema_cfg),
        strategy_rsi_divergence(closes, divergence_cfg),
    ]
    
    # Regime-based weights
    weights = {
        "BB+RSI": 1.0 if regime_type == "Sideways" else 0.6,
        "Breakout+Vol+VWAP": 1.0 if regime_type == "Bull" else 0.7,
        "GapFill": 0.8,
        "S/R Bounce": 1.0 if regime_type == "Sideways" else 0.6,
        "3-EMA": 1.0 if regime_type in ["Bull", "Bear"] else 0.5,
        "RSI Divergence": 0.9,
    }
    
    # Weighted voting
    votes = {"buy": 0.0, "sell": 0.0, "hold": 0.0}
    total_weight = 0.0
    explanations = []
    stop_losses = []
    take_profits = []
    
    for s in strategies:
        w = weights.get(s.name, 0.5)
        
        if s.side == "buy":
            votes["buy"] += s.strength * s.confidence * w
        elif s.side == "sell":
            votes["sell"] += s.strength * s.confidence * w
        else:
            votes["hold"] += (1 - max(s.strength, s.confidence)) * w * 0.3
        
        total_weight += w
        
        if s.stop_loss:
            stop_losses.append(s.stop_loss)
        if s.take_profit:
            take_profits.append(s.take_profit)
        
        explanations.append(f"{s.name}: {s.side} (str={s.strength:.2f}, conf={s.confidence:.2f})")
    
    if total_weight == 0:
        return {
            "signal": "hold",
            "confidence": 0.0,
            "position_size": 0.0,
            "stop_loss": None,
            "take_profit": None,
            "reasoning": "No valid strategies"
        }
    
    # Calculate final signal
    buy_w = votes["buy"] / total_weight
    sell_w = votes["sell"] / total_weight
    hold_w = votes["hold"] / total_weight
    
    final_signal = "hold"
    final_confidence = 0.3
    
    if buy_w >= sell_w and buy_w >= hold_w:
        final_signal = "buy"
        final_confidence = buy_w
    elif sell_w >= buy_w and sell_w >= hold_w:
        final_signal = "sell"
        final_confidence = sell_w
    
    # Stop loss and take profit
    if stop_losses:
        stop_loss = _mean(stop_losses)
    else:
        stop_loss = current_price * 0.98 if final_signal == "buy" else (current_price * 1.02 if final_signal == "sell" else None)
    
    if take_profits:
        take_profit = _mean(take_profits)
    else:
        take_profit = current_price * 1.06 if final_signal == "buy" else (current_price * 0.94 if final_signal == "sell" else None)
    
    reasoning = (
        f"Regime: {regime_type} (conf {regime_confidence:.2f}). "
        f"Votes: buy={buy_w:.2f}, sell={sell_w:.2f}, hold={hold_w:.2f}. "
        f"Strategies: {' | '.join(explanations)}"
    )
    
    return {
        "signal": final_signal,
        "confidence": float(final_confidence),
        "position_size": 0.0,  # Position sizer fills this
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "reasoning": reasoning,
        "regime": regime,
        "strategy_votes": {"buy": buy_w, "sell": sell_w, "hold": hold_w},
    }