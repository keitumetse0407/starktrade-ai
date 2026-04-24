"""
Ultra Instinct Enhanced Orchestrator
==================================
Main coordinator - combines all offline modules.
"""

from typing import Dict, List, Any, Optional

from .offline_indicators import (
    vwap, atr, stochastic, adx, ichimoku, pivot_points,
    bollinger_bands, rsi_, ema
)
from .offline_signal_generator import generate_signals_enhanced, StrategySignal
from .offline_regime_detector import detect_regime_enhanced
from .offline_position_sizer import position_size_enhanced
from .offline_debate_simulator import debate_enhanced
from .offline_error_handling import (
    validate_ohlcv, sanitize_numeric, sanitize_series,
    spike_check, validate_input
)
from .offline_config import DEFAULT_CONFIG


class OfflineOrchestrator:
    """Main orchestrator for offline trading."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or DEFAULT_CONFIG
        self.peak_value = 10000.0
        self.trade_history = []
    
    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main processing pipeline.
        """
        # Validate input
        if not validate_input(input_data):
            return {
                "signal": "hold",
                "confidence": 0.0,
                "position_size": 0.0,
                "reasoning": "Invalid input data"
            }
        
        # Get OHLCV
        ohlcv = validate_ohlcv(input_data.get("ohlcv", []))
        if not ohlcv:
            return {
                "signal": "hold",
                "confidence": 0.0,
                "position_size": 0.0,
                "reasoning": "No valid OHLCV data"
            }
        
        closes = [float(b.get("close", 0.0)) for b in ohlcv]
        
        # Spike check
        if spike_check(closes, z_thresh=self.config.get("error_cfg", {}).get("spike_z", 5.0)):
            return {
                "signal": "hold",
                "confidence": 0.0,
                "position_size": 0.0,
                "reasoning": "Spike detected in price series — hold for safety"
            }
        
        # Step 1: Detect regime
        regime = detect_regime_enhanced(
            ohlcv,
            closes,
            self.config.get("regime_cfg", {})
        )
        
        # Step 2: Generate signals
        signal_result = generate_signals_enhanced(
            input_data,
            regime,
            self.config
        )
        
        # Step 3: Run debate
        debate_result = debate_enhanced(
            signal_result,
            regime,
            self.config.get("debate_cfg", {})
        )
        
        # Step 4: Position sizing
        sizer_cfg = self.config.get("sizer_cfg", {})
        sizer_cfg["drawdown"] = self._calculate_drawdown(input_data)
        
        position_result = position_size_enhanced(
            input_data,
            debate_result,
            sizer_cfg
        )
        
        # Step 5: Apply emergency stops
        if self._check_emergency_stops(input_data, position_result):
            return {
                "signal": "hold",
                "confidence": 0.0,
                "position_size": 0.0,
                "stop_loss": None,
                "take_profit": None,
                "reasoning": "Emergency stop triggered"
            }
        
        # Update peak value
        account_value = input_data.get("account_value", 10000.0)
        self.peak_value = max(self.peak_value, account_value)
        
        return {
            "signal": debate_result.get("final_signal", "hold"),
            "confidence": debate_result.get("confidence", 0.0),
            "position_size": position_result.get("position_size", 0.0),
            "stop_loss": position_result.get("stop_loss"),
            "take_profit": position_result.get("take_profit"),
            "reasoning": position_result.get("reasoning", ""),
            "regime": regime,
            "debate": debate_result,
        }
    
    def _calculate_drawdown(self, input_data: Dict[str, Any]) -> float:
        """Calculate current drawdown."""
        account_value = input_data.get("account_value", 10000.0)
        if self.peak_value <= 0:
            return 0.0
        return (self.peak_value - account_value) / self.peak_value
    
    def _check_emergency_stops(
        self,
        input_data: Dict[str, Any],
        position_result: Dict[str, Any]
    ) -> bool:
        """Check emergency stop conditions."""
        emergency = self.config.get("emergency_stop", {})
        
        if not emergency.get("enabled", True):
            return False
        
        # Drawdown check
        dd = self._calculate_drawdown(input_data)
        max_dd = emergency.get("max_drawdown_pct", 20.0) / 100.0
        if dd > max_dd:
            return True
        
        return False


# ============================================================
# SIMPLE PROCESS FUNCTION
# ============================================================

def process(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Simple one-shot processing."""
    orchestrator = OfflineOrchestrator()
    return orchestrator.process(input_data)