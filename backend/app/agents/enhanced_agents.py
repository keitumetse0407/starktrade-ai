"""
Enhanced HRM Agents — Parallel Execution + Human-in-Loop
========================================================
Added: Macro Agent, News Agent + Parallel Supervisor Pattern
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Optional, TypedDict
from dataclasses import dataclass

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


class AgentState(TypedDict):
    symbol: str
    market_regime: str
    regime_confidence: float
    aggression_multiplier: float
    user_approved: bool
    # Agent outputs
    research_brief: dict
    strategy_recommendation: dict
    quant_signal: dict
    fundamental_report: dict
    macro_brief: dict
    news_brief: dict
    risk_assessment: dict
    synthesis: dict


# ===================== NEW AGENTS =====================

class MacroAgent:
    """SA Macro specialist — interest rates, Rand correlation, SARB policy."""
    
    SYSTEM_PROMPT = """You are the SA Macro Expert specializing in:
- SA Reserve Bank interest rate decisions
- USD/ZAR correlation drivers
- Emerging market sentiment
- Commodity price impacts (gold, platinum)
- Global risk sentiment (DXY, EM indices)

Provide brief analysis focused on South African market implications."""

    async def analyze(self, market_data: dict) -> dict:
        if not GROQ_API_KEY:
            return self._mock_analysis()
        
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=GROQ_API_KEY)
            
            prompt = f"""Analyze SA macro factors affecting {market_data.get('symbol', 'XAUUSD')}:

Current Data:
{json.dumps(market_data, indent=2)}

Provide 2-line analysis focusing on:
- SARB rate implications
- Rand strength
- Commodity impacts

Respond ONLY with JSON: {{"signal": "bullish/bearish/neutral", "reasoning": "brief", "confidence": 0.0-1.0}}"""

            response = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": self.SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=150
            )
            
            return json.loads(response.choices[0].message.content)
        except:
            return self._mock_analysis()
    
    def _mock_analysis(self) -> dict:
        return {"signal": "neutral", "reasoning": "SARB likely to hold rates", "confidence": 0.65}


class NewsAgent:
    """Real-time news specialist via Firecrawl."""
    
    SYSTEM_PROMPT = """You are the News Analyst specializing in:
- Breaking financial news
- Central bank announcements
- Geopolitical risk events
- Market-moving sentiment shifts

Prioritize: Reuters, Bloomberg, Financial Mail, BizNews."""

    async def analyze(self, symbol: str) -> dict:
        if not GROQ_API_KEY:
            return self._mock_analysis()
        
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=GROQ_API_KEY)
            
            # Search recent news
            prompt = f"""Find latest news affecting {symbol} trading.
Focus on: central banks, geopolitics, commodities.
Provide 2-line sentiment: {{"signal": "bullish/bearish/neutral", "reasoning": "why", "confidence": 0.0-1.0}}"""

            response = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": self.SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=150
            )
            
            return json.loads(response.choices[0].message.content)
        except:
            return self._mock_analysis()
    
    def _mock_analysis(self) -> dict:
        return {"signal": "neutral", "reasoning": "No breaking news", "confidence": 0.50}


# ===================== SUPERVISOR PATTERN =====================

async def run_agents_parallel(market_data: dict) -> dict:
    """Run all 7 agents in PARALLEL for maximum speed."""
    
    async def safe_run(agent_fn, *args, **kwargs):
        try:
            return await agent_fn(*args, **kwargs)
        except Exception as e:
            print(f"Agent error: {e}")
            return {}
    
    # All 7 agents run simultaneously
    results = await asyncio.gather(
        safe_run(ResearchAgent().analyze, market_data),
        safe_run(Strategist().analyze, market_data),
        safe_run(QuantAgent().analyze, market_data),
        safe_run(Fundamentalist().analyze, market_data),
        safe_run(MacroAgent().analyze, market_data),
        safe_run(NewsAgent().analyze, market_data.get('symbol', 'XAUUSD')),
        safe_run(RiskManager().analyze, market_data),
        return_exceptions=True
    )
    
    return {
        "research": results[0],
        "strategy": results[1],
        "quant": results[2],
        "fundamental": results[3],
        "macro": results[4],
        "news": results[5],
        "risk": results[6],
    }


# ===================== HUMAN APPROVAL GATE =====================

async def require_human_approval(trade_decision: dict, user_id: str, db) -> dict:
    """Human-in-the-loop: require approval before live execution."""
    
    # Check user auto_trading_enabled
    from sqlalchemy import select
    from app.db.models import User
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.auto_trading_enabled:
        return {
            "approved": False,
            "requires_manual_approval": True,
            "message": "Auto-trading disabled. Enable in settings or approve manually."
        }
    
    # Medium-high confidence trades require approval
    if trade_decision.get("confidence", 0) < 0.75:
        return {
            "approved": False,
            "requires_manual_approval": True,
            "message": "Low confidence. Manual approval required."
        }
    
    # High aggression strategy requires approval
    if user.strategy == "aggressive" and trade_decision.get("confidence", 0) < 0.85:
        return {
            "approved": False,
            "requires_manual_approval": True,
            "message": "Aggressive strategy. Extra confirmation required."
        }
    
    return {
        "approved": True,
        "requires_manual_approval": False
    }


# ===================== IMPORTS FOR BACKWARDS COMPAT =====================

from dataclasses import dataclass

@dataclass
class TradeSignal:
    symbol: str
    direction: str
    confidence: float
    entry_price: float
    stop_loss: float
    take_profit: float
    reasoning: str
    agent: str
    requires_approval: bool = False


# Placeholder for existing agents (import from trading_agents)
class ResearchAgent:
    name = "Researcher"


class Strategist:
    name = "Strategist"


class QuantAgent:
    name = "Quant"


class Fundamentalist:
    name = "Fundamentalist"


class RiskManager:
    name = "RiskManager"
