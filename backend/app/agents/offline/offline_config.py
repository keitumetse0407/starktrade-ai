"""
Ultra Instinct Configuration
====================
Default configuration for offline trading agents.
"""

DEFAULT_CONFIG = {
    # ===== INDICATORS =====
    "indicators": {
        "bb_period": 20,
        "bb_k": 2.0,
        "rsi_period": 14,
        "atr_period": 14,
        "vwap_window": "daily",
    },
    
    # ===== STRATEGIES =====
    "strategies": {
        "enable_mean_reversion": True,
        "enable_breakout": True,
        "enable_gap_fill": True,
        "enable_sr_bounce": True,
        "enable_ema_crossover": True,
        "enable_rsi_divergence": True,
    },
    
    # Strategy-specific configs
    "bb_rsi": {
        "bb_period": 20,
        "bb_k": 2.0,
        "rsi_period": 14,
        "rsi_low": 30,
        "rsi_high": 70,
    },
    "breakout": {
        "lookback": 20,
        "vol_mult": 1.5,
        "vwap_period": 20,
    },
    "gap": {
        "min_gap_pct": 0.5,
    },
    "sr": {
        "pivot_method": "floor",
        "tolerance_pct": 0.5,
    },
    "ema_trend": {
        "ema1": 9,
        "ema2": 21,
        "ema3": 55,
    },
    "divergence": {
        "lookback": 20,
        "rsi_period": 14,
    },
    
    # ===== REGIME =====
    "regime_cfg": {
        "ema_fast": 20,
        "ema_slow": 50,
        "adx_period": 14,
        "vol_period": 20,
    },
    
    # ===== POSITION SIZING =====
    "sizer_cfg": {
        "base_risk_pct": 1.0,
        "max_risk_pct": 3.0,
        "max_pos_pct": 25.0,
        "dd_reduction": 0.5,
        "vol_target": 0.15,
        "min_conf": 0.4,
    },
    
    # ===== DEBATE =====
    "debate_cfg": {
        "half_life": 3600.0,
        "min_debate_conf": 0.45,
    },
    
    # ===== BACKTEST =====
    "backtest_cfg": {
        "window": 200,
        "step": 20,
        "walk_forward": True,
        "exit_conf": 0.5,
    },
    
    # ===== ERROR HANDLING =====
    "error_cfg": {
        "spike_z": 5.0,
        "max_nan_frac": 0.3,
    },
    
    # ===== EMERGENCY STOPS =====
    "emergency_stop": {
        "max_drawdown_pct": 20.0,
        "max_daily_loss_pct": 5.0,
        "enabled": True,
    },
}


def get_config(key: str, default=None):
    """Get config value by key."""
    return DEFAULT_CONFIG.get(key, default)


def update_config(updates: dict):
    """Update config with new values."""
    DEFAULT_CONFIG.update(updates)