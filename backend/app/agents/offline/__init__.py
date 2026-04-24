"""
Ultra Instinct Offline Trading Agents
================================
100% offline trading system - no external APIs required.

Modules:
- offline_indicators: Technical indicators
- offline_signal_generator: Trading strategies  
- offline_regime_detector: Market regime detection
- offline_position_sizer: Risk-based sizing
- offline_debate_simulator: Multi-agent debate
- offline_backtester: Backtesting framework
- offline_error_handling: Robust error handling
- offline_config: Configuration
- offline_orchestrator: Main coordinator
"""

from .offline_indicators import (
    # Indicators
    vwap, atr, stochastic, adx, ichimoku, pivot_points,
    bollinger_bands, rsi_, ema, sma, macd,
    rate_of_change, volatility, custom_momentum_oscillator,
    # Utilities
    _safe_div, _mean, _std, _median,
)

from .offline_signal_generator import (
    StrategySignal,
    strategy_bb_rsi_mean_reversion,
    strategy_breakout_volume_vwap,
    strategy_gap_fill,
    strategy_sr_bounce,
    strategy_ema_trend_continuation,
    strategy_rsi_divergence,
    generate_signals_enhanced,
)

from .offline_regime_detector import (
    detect_regime_enhanced,
    detect_regime_simple,
)

from .offline_position_sizer import (
    kelly_fraction,
    position_size_enhanced,
    position_size_simple,
)

from .offline_debate_simulator import (
    DebateAgent,
    debate_enhanced,
    debate_simple,
)

from .offline_backtester import (
    Trade,
    backtest,
    compute_metrics,
)

from .offline_error_handling import (
    validate_ohlcv,
    sanitize_numeric,
    sanitize_series,
    spike_check,
    safe_divide,
    validate_input,
    outlier_detection,
)

from .offline_config import (
    DEFAULT_CONFIG,
    get_config,
    update_config,
)

from .offline_orchestrator import (
    OfflineOrchestrator,
    process,
)


__all__ = [
    # Version
    "__version__",
    
    # Indicators
    "vwap", "atr", "stochastic", "adx", "ichimoku", "pivot_points",
    "bollinger_bands", "rsi_", "ema", "sma", "macd",
    "rate_of_change", "volatility", "custom_momentum_oscillator",
    
    # Utilities
    "_safe_div", "_mean", "_std", "_median",
    
    # Signals
    "StrategySignal",
    "strategy_bb_rsi_mean_reversion",
    "strategy_breakout_volume_vwap",
    "strategy_gap_fill",
    "strategy_sr_bounce",
    "strategy_ema_trend_continuation",
    "strategy_rsi_divergence",
    "generate_signals_enhanced",
    
    # Regime
    "detect_regime_enhanced",
    "detect_regime_simple",
    
    # Sizing
    "kelly_fraction",
    "position_size_enhanced",
    "position_size_simple",
    
    # Debate
    "DebateAgent",
    "debate_enhanced",
    "debate_simple",
    
    # Backtest
    "Trade",
    "backtest",
    "compute_metrics",
    
    # Error handling
    "validate_ohlcv",
    "sanitize_numeric",
    "sanitize_series",
    "spike_check",
    "safe_divide",
    "validate_input",
    "outlier_detection",
    
    # Config
    "DEFAULT_CONFIG",
    "get_config",
    "update_config",
    
    # Orchestrator
    "OfflineOrchestrator",
    "process",
]

__version__ = "2.0.0"