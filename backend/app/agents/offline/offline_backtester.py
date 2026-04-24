"""
Ultra Instinct Backtester
=====================
Rolling/walk-forward backtest + performance metrics.

Features:
- Rolling window backtest
- Walk-forward analysis  
- Performance metrics (Sharpe, Sortino, Calmar, MaxDD)
- Trade-by-trade logging
- Equity curve generation
"""

from typing import Dict, List, Any, Callable, Optional
from dataclasses import dataclass, field
import math


@dataclass
class Trade:
    entry_time: int
    exit_time: int
    side: str
    entry_price: float
    exit_price: float
    qty: float
    pnl: float
    pnl_pct: float
    stop: float
    take_profit: float
    reason: str


def backtest(
    ohlcv: List[Dict[str, float]],
    signal_fn: Callable,
    initial_cash: float = 10000.0,
    window: int = 200,
    step: int = 20,
    walk_forward: bool = True,
) -> Dict[str, Any]:
    """
    Offline backtest with rolling/walk-forward windows.
    """
    cash = initial_cash
    equity_curve: List[float] = [initial_cash]
    trades: List[Trade] = []
    current_pos = 0.0
    entry_price = 0.0
    entry_idx = 0
    stop = 0.0
    take_profit = 0.0
    
    for i in range(window, len(ohlcv), step if walk_forward else 1):
        window_data = ohlcv[i - window:i]
        bar = ohlcv[i]
        price = float(bar.get("close", 0.0))
        
        if price <= 0:
            continue
        
        # Prepare data for signal generation
        data = {
            "symbol": "TEST",
            "current_price": price,
            "ohlcv": window_data,
            "position": current_pos,
            "cash": cash,
            "account_value": equity_curve[-1],
        }
        
        # Get signal
        sig = signal_fn(data)
        signal = sig.get("signal", "hold")
        conf = float(sig.get("confidence", 0.0))
        pos_pct = float(sig.get("position_size", 0.0))
        stop = sig.get("stop_loss", price * 0.98)
        take_profit = sig.get("take_profit", price * 1.06)
        
        # Entry
        if current_pos == 0.0 and signal == "buy" and pos_pct > 0.0:
            qty = (equity_curve[-1] * pos_pct) / price
            if qty > 0.0:
                current_pos = qty
                entry_price = price
                entry_idx = i
                cash -= qty * price
        
        # Exit on signal
        elif current_pos > 0.0 and signal == "sell" and conf > 0.5:
            pnl = (price - entry_price) * current_pos
            pnl_pct = (price - entry_price) / entry_price * 100.0
            trades.append(Trade(
                entry_idx, i, "buy", entry_price, price, current_pos,
                pnl, pnl_pct, stop, take_profit, sig.get("reasoning", "")
            ))
            cash += current_pos * price
            current_pos = 0.0
        
        # Exit on stop/take profit
        elif current_pos > 0.0 and (price <= stop or price >= take_profit):
            exit_price = stop if price <= stop else take_profit
            pnl = (exit_price - entry_price) * current_pos
            pnl_pct = (exit_price - entry_price) / entry_price * 100.0
            reason = "stop" if price <= stop else "take_profit"
            trades.append(Trade(
                entry_idx, i, "buy", entry_price, exit_price, current_pos,
                pnl, pnl_pct, stop, take_profit, reason
            ))
            cash += current_pos * exit_price
            current_pos = 0.0
        
        # Update equity
        equity = cash + current_pos * price
        equity_curve.append(equity)
    
    # Calculate metrics
    metrics = compute_metrics(equity_curve, trades)
    
    return {
        "equity_curve": equity_curve,
        "trades": trades,
        "metrics": metrics,
    }


def compute_metrics( equity_curve: List[float], trades: List[Trade]) -> Dict[str, Any]:
    """Compute performance metrics."""
    
    # Returns series
    returns: List[float] = []
    for i in range(1, len(equity_curve)):
        if equity_curve[i - 1] > 0:
            r = (equity_curve[i] - equity_curve[i - 1]) / equity_curve[i - 1]
            returns.append(r)
    
    #基础指标
    total_return = (equity_curve[-1] - equity_curve[0]) / equity_curve[0] if equity_curve[0] > 0 else 0
    
    # Max drawdown
    peak = equity_curve[0]
    max_dd = 0.0
    for e in equity_curve:
        if e > peak:
            peak = e
        dd = (peak - e) / peak if peak > 0 else 0
        max_dd = max(max_dd, dd)
    
    # Sharpe
    mean_ret = _mean(returns) if returns else 0
    std_ret = _std(returns) if len(returns) >= 2 else 0
    sharpe = (math.sqrt(252) * mean_ret / std_ret) if std_ret > 0 else 0
    
    # Sortino (downside)
    downside = [r for r in returns if r < 0]
    down_std = _std(downside) if downside else 0
    sortino = (math.sqrt(252) * mean_ret / down_std) if down_std > 0 else 0
    
    # Calmar
    calmar = total_return / max_dd if max_dd > 0 else 0
    
    # Win rate
    wins = [t for t in trades if t.pnl > 0]
    losses = [t for t in trades if t.pnl < 0]
    win_rate = len(wins) / len(trades) if trades else 0
    
    # Avg win/loss
    avg_win = _mean([t.pnl_pct for t in wins]) if wins else 0
    avg_loss = _mean([t.pnl_pct for t in losses]) if losses else 0
    
    # Profit factor
    gross_profit = sum(t.pnl for t in wins) if wins else 0
    gross_loss = abs(sum(t.pnl for t in losses)) if losses else 0
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
    
    return {
        "total_return": round(total_return, 4),
        "sharpe": round(sharpe, 2),
        "sortino": round(sortino, 2),
        "calmar": round(calmar, 2),
        "max_drawdown": round(max_dd, 4),
        "win_rate": round(win_rate, 2),
        "avg_win_pct": round(avg_win, 2),
        "avg_loss_pct": round(avg_loss, 2),
        "profit_factor": round(profit_factor, 2),
        "num_trades": len(trades),
    }


def _mean(vals: List[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _std(vals: List[float]) -> float:
    n = len(vals)
    if n < 2:
        return 0.0
    m = _mean(vals)
    variance = sum((v - m) ** 2 for v in vals) / n
    return variance ** 0.5