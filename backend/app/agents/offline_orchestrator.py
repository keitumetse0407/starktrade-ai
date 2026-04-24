"""
Position Sizer & Risk Manager
Pure mathematical position sizing
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, Optional

@dataclass
class PositionSize:
    shares: float
    risk_amount: float
    portfolio_pct: float

class PositionSizer:
    def __init__(self):
        self.config = {
            'max_position': 0.20,  # 20% max
            'max_risk': 0.02,       # 2% max risk
            'min_position': 0.01,   # 1% min
            'kelly_fraction': 0.25,
        }
    
    def calculate(self, account: float, entry: float, stop: float, 
                  win_rate: float = 0.5, avg_win: float = 1.0, avg_loss: float = 1.0,
                  confidence: float = 0.5, volatility: float = 0.02) -> PositionSize:
        
        risk_per_share = abs(entry - stop)
        if risk_per_share == 0:
            return PositionSize(0, 0, 0)
        
        # Kelly Criterion
        if avg_loss == 0: avg_loss = 1.0
        wl_ratio = avg_win / avg_loss
        kelly = ((win_rate * wl_ratio) - (1 - win_rate)) / wl_ratio
        kelly_fraction = max(0, kelly * self.config['kelly_fraction'])
        
        # Calculate max shares by risk
        max_risk_dollars = account * self.config['max_risk']
        max_shares_risk = max_risk_dollars / risk_per_share
        
        # Calculate max shares by allocation
        max_shares_alloc = (account * self.config['max_position']) / entry
        
        # Adjust by confidence
        confidence_factor = 0.5 + (confidence * 0.5)
        
        # Volatility adjustment
        vol_factor = 1.0
        if volatility > 0.03:
            vol_factor = 0.7
        elif volatility < 0.015:
            vol_factor = 1.2
        
        # Final position
        shares = min(max_shares_risk, max_shares_alloc) * confidence_factor * vol_factor
        shares = max(shares, (account * self.config['min_position']) / entry)
        
        risk_amount = shares * risk_per_share
        portfolio_pct = shares * entry / account
        
        return PositionSize(shares, risk_amount, portfolio_pct)


"""
Main Orchestrator - Combines All Offline Agents
"""

from .offline_indicators import TechnicalIndicators as TI
from .offline_signal_generator import SignalGenerator, TradingSignal
from .offline_regime_detector import RegimeDetector, RegimeAnalysis

class OfflineOrchestrator:
    """Master offline trading system"""
    
    def __init__(self):
        self.ti = TI()
        self.signal_gen = SignalGenerator()
        self.regime_det = RegimeDetector()
        self.position_sizer = PositionSizer()
    
    def analyze(self, data: Dict, account_balance: float = 100000) -> Dict:
        """
        Complete market analysis
        
        data = {'opens': [...], 'highs': [...], 'lows': [...], 'closes': [...], 'volumes': [...]}
        
        Returns:
        {
            'signal': {...},
            'regime': {...},
            'position': {...},
            'analysis': 'complete'
        }
        """
        # Get regime
        regime = self.regime_det.detect(
            data['closes'],
            data['highs'], 
            data['lows'],
            data['volumes']
        )
        
        # Get signal
        signal = self.signal_gen.generate(data)
        
        # Calculate position
        if signal.signal_type.value in ['STRONG_BUY', 'BUY', 'STRONG_SELL', 'SELL']:
            confidence = signal.confidence
            win_rate = 0.55 if 'BUY' in signal.signal_type.value else 0.50
            avg_risk = abs(signal.entry_price - signal.stop_loss) / signal.entry_price
            
            position = self.position_sizer.calculate(
                account_balance,
                signal.entry_price,
                signal.stop_loss,
                win_rate=win_rate,
                avg_win=avg_risk * 2,
                avg_loss=avg_risk,
                confidence=confidence,
                volatility=regime.risk_level * 0.03
            )
        else:
            # Position 0 for HOLD/no clear signal
            position = PositionSize(0, 0, 0)
        
        return {
            'signal': {
                'type': signal.signal_type.value,
                'confidence': signal.confidence,
                'entry': signal.entry_price,
                'stop_loss': signal.stop_loss,
                'take_profit': signal.take_profit,
                'reasons': signal.reasons
            },
            'regime': {
                'type': regime.regime.value,
                'confidence': regime.confidence,
                'thesis': regime.thesis,
                'risk_level': regime.risk_level,
                'strategies': regime.strategies
            },
            'position': {
                'shares': position.shares,
                'risk': position.risk_amount,
                'portfolio_pct': position.portfolio_pct
            },
            'indicators': signal.indicators,
            'analysis': 'complete'
        }


__all__ = ['OfflineOrchestrator', 'PositionSizer', 'PositionSize']