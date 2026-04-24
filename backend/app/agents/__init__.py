"""
StarkTrade AI - Offline Trading Agents

All agents work 100% offline - NO external APIs required.
Based on pure algorithmic/technical analysis.
"""

from .offline_indicators import (
    TechnicalIndicators, TI,
    sma, ema, rsi, macd, bollinger_bands, atr,
    volume_ratio, linear_regression_slope, support_resistance,
    obv, stochastic
)

from .offline_signal_generator import (
    SignalGenerator, TradingSignal, SignalType
)

from .offline_regime_detector import (
    RegimeDetector, RegimeAnalysis, MarketRegime
)

from .offline_position_sizer import (
    PositionSizer, PositionSize
)

from .offline_orchestrator import OfflineOrchestrator

__all__ = [
    # Indicators
    'TechnicalIndicators', 'TI',
    'sma', 'ema', 'rsi', 'macd', 'bollinger_bands', 'atr',
    'volume_ratio', 'linear_regression_slope', 'support_resistance',
    'obv', 'stochastic',
    
    # Signal Generator
    'SignalGenerator', 'TradingSignal', 'SignalType',
    
    # Regime Detector
    'RegimeDetector', 'RegimeAnalysis', 'MarketRegime',
    
    # Position Sizer
    'PositionSizer', 'PositionSize',
    
    # Orchestrator
    'OfflineOrchestrator',
]


__version__ = "1.0.0"
__description__ = "Pure algorithmic trading agents - No external APIs needed"


# Easy import
def create_orchestrator():
    """Create ready-to-use offline trading orchestrator"""
    return OfflineOrchestrator()


def analyze_market(data, account=100000):
    """Quick market analysis"""
    orch = OfflineOrchestrator()
    return orch.analyze(data, account)


if __name__ == '__main__':
    # Example usage
    import numpy as np
    
    # Generate sample data
    np.random.seed(42)
    closes = 100 * np.exp(np.cumsum(np.random.randn(200) * 0.02))
    opens = closes * (1 + np.random.randn(200) * 0.005)
    highs = np.maximum(opens, closes) * (1 + abs(np.random.randn(200) * 0.01))
    lows = np.minimum(opens, closes) * (1 - abs(np.random.randn(200) * 0.01))
    volumes = np.random.lognormal(15, 0.5, 200).astype(int)
    
    result = analyze_market({
        'opens': opens.tolist(),
        'highs': highs.tolist(),
        'lows': lows.tolist(),
        'closes': closes.tolist(),
        'volumes': volumes.tolist()
    })
    
    print(f"Signal: {result['signal']['type']} ({result['signal']['confidence']:.0%})")
    print(f"Regime: {result['regime']['type']} ({result['regime']['thesis']})")
    print(f"Position: {result['position']['shares']:.0f} shares")
    print(f"Entry: ${result['signal']['entry']:.2f}, Stop: ${result['signal']['stop_loss']:.2f}")