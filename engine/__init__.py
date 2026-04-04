"""StarkTrade AI — Multi-agent signal generation for Gold (XAU/USD)"""
from engine.data_collector import GoldDataCollector
from engine.indicators import TechnicalIndicators
from engine.quant_agent import QuantAgent
from engine.sentiment_agent import SentimentAgent
from engine.pattern_agent import PatternAgent
from engine.risk_agent import RiskAgent, TradePlan, OpenPosition
from engine.regime_detector import RegimeDetector, MarketRegime, RegimeResult
from engine.orchestrator import SignalOrchestrator, FinalSignal, ConsensusResult, AgentVote

__all__ = [
    "GoldDataCollector",
    "TechnicalIndicators",
    "QuantAgent",
    "SentimentAgent",
    "PatternAgent",
    "RiskAgent",
    "TradePlan",
    "OpenPosition",
    "RegimeDetector",
    "MarketRegime",
    "RegimeResult",
    "SignalOrchestrator",
    "FinalSignal",
    "ConsensusResult",
    "AgentVote",
]
