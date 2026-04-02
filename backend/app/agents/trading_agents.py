"""
Real AI Trading Agents — OpenAI Integration
=============================================
Connects to OpenAI GPT-4o for real agent intelligence.
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


@dataclass
class TradeSignal:
    symbol: str
    direction: str  # "buy", "sell", "hold"
    confidence: float
    entry_price: float
    stop_loss: float
    take_profit: float
    reasoning: str
    agent: str


class TradingAgent:
    """Base class for AI trading agents."""
    
    def __init__(self, name: str, persona: str, system_prompt: str):
        self.name = name
        self.persona = persona
        self.system_prompt = system_prompt
        self.status = "idle"
    
    async def analyze(self, market_data: dict) -> dict:
        """Analyze market data and return recommendation."""
        if not OPENAI_API_KEY:
            return self._mock_analysis(market_data)
        
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
            
            prompt = f"""Analyze this market data and provide a trading recommendation.

Market Data:
{json.dumps(market_data, indent=2)}

Respond in JSON format:
{{
    "signal": "buy" | "sell" | "hold",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "entry_price": float,
    "stop_loss": float,
    "take_profit": float
}}"""

            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON from response
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0]
                    result = json.loads(json_str)
                else:
                    result = {"signal": "hold", "confidence": 0.5, "reasoning": content}
            
            return {
                "agent": self.name,
                "persona": self.persona,
                "signal": result.get("signal", "hold"),
                "confidence": result.get("confidence", 0.5),
                "reasoning": result.get("reasoning", ""),
                "entry_price": result.get("entry_price"),
                "stop_loss": result.get("stop_loss"),
                "take_profit": result.get("take_profit"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "agent": self.name,
                "signal": "hold",
                "confidence": 0,
                "reasoning": f"Error: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _mock_analysis(self, market_data: dict) -> dict:
        """Mock analysis when OpenAI is not configured."""
        import random
        signals = ["buy", "sell", "hold"]
        return {
            "agent": self.name,
            "persona": self.persona,
            "signal": random.choice(signals),
            "confidence": random.uniform(0.5, 0.9),
            "reasoning": f"{self.name} analysis complete (demo mode)",
            "timestamp": datetime.utcnow().isoformat()
        }


# Initialize agents
AGENTS = {
    "researcher": TradingAgent(
        name="The Researcher",
        persona="Bloomberg Terminal",
        system_prompt="""You are THE RESEARCHER — a financial news and sentiment analyst.
Analyze news, filings, and market sentiment. Be thorough but concise.
Focus on: news sentiment, SEC filings, insider activity, macro trends."""
    ),
    "strategist": TradingAgent(
        name="The Strategist",
        persona="Munger & Buffett",
        system_prompt="""You are THE STRATEGIST — modeled after Charlie Munger and Warren Buffett.
Focus on: intrinsic value, margin of safety (min 30%), economic moat, long-term thinking.
Only recommend trades with overwhelming odds in your favor."""
    ),
    "quant": TradingAgent(
        name="The Quant",
        persona="Jim Simons",
        system_prompt="""You are THE QUANT — modeled after Jim Simons' Renaissance Technologies.
Focus on: statistical patterns, mean reversion, momentum, Sharpe ratio optimization.
Be cold, data-driven. No emotions. Only probabilities."""
    ),
    "fundamentalist": TradingAgent(
        name="The Fundamentalist",
        persona="Forensic Accountant",
        system_prompt="""You are THE FUNDAMENTALIST — a forensic financial analyst.
Focus on: revenue quality, cash flow, debt levels, management quality, competitive moat.
Read between the lines of financial statements."""
    ),
    "risk_manager": TradingAgent(
        name="The Risk Manager",
        persona="Ray Dalio",
        system_prompt="""You are THE RISK MANAGER — Ray Dalio's shield.
You have FINAL VETO power on every trade.
Rules: Max 5% position, 8% max drawdown, 2:1 min risk/reward.
Never let a trade through that could blow up the portfolio."""
    ),
}


async def run_agent_council(symbol: str, market_data: dict) -> dict:
    """
    Run all agents in parallel and synthesize their recommendations.
    This is the core of the AI trading system.
    """
    # Run all agents in parallel
    tasks = []
    for agent_name, agent in AGENTS.items():
        if agent_name != "risk_manager":  # Risk manager goes last
            tasks.append(agent.analyze(market_data))
    
    agent_results = await asyncio.gather(*tasks)
    
    # Count signals
    buy_votes = sum(1 for r in agent_results if r.get("signal") == "buy")
    sell_votes = sum(1 for r in agent_results if r.get("signal") == "sell")
    hold_votes = sum(1 for r in agent_results if r.get("signal") == "hold")
    
    # Get average confidence
    avg_confidence = sum(r.get("confidence", 0) for r in agent_results) / len(agent_results)
    
    # Determine consensus
    total_agents = len(agent_results)
    if buy_votes > total_agents / 2:
        consensus = "buy"
    elif sell_votes > total_agents / 2:
        consensus = "sell"
    else:
        consensus = "hold"
    
    # Risk manager final check
    risk_data = {
        "symbol": symbol,
        "consensus": consensus,
        "confidence": avg_confidence,
        "agent_votes": {"buy": buy_votes, "sell": sell_votes, "hold": hold_votes},
        "individual_results": agent_results
    }
    
    risk_result = await AGENTS["risk_manager"].analyze(risk_data)
    
    # Final decision (risk manager has veto)
    if risk_result.get("signal") == "sell" and consensus == "buy":
        final_decision = "hold"
        reason = "Risk manager vetoed BUY signal"
    elif risk_result.get("signal") == "buy" and consensus == "sell":
        final_decision = "hold"
        reason = "Risk manager vetoed SELL signal"
    else:
        final_decision = consensus
        reason = f"Council consensus: {buy_votes}B/{sell_votes}S/{hold_votes}H"
    
    return {
        "symbol": symbol,
        "final_decision": final_decision,
        "confidence": avg_confidence,
        "reason": reason,
        "agent_results": list(agent_results) + [risk_result],
        "timestamp": datetime.utcnow().isoformat()
    }
