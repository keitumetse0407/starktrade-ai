"""
Real AI Trading Agents — Groq LLM Integration
=============================================
Uses Groq's llama-3.1 models for real-time AI trading decisions.
Free tier: 60 calls/min, fully sufficient for retail trading.

Models available (fastest inference):
- llama-3.1-70b-versatile (best reasoning)
- llama-3.1-8b-instant (fastest, good for high frequency)
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


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
    """Base class for AI trading agents using Groq LLM."""
    
    def __init__(self, name: str, persona: str, system_prompt: str):
        self.name = name
        self.persona = persona
        self.system_prompt = system_prompt
        self.status = "idle"
    
    async def analyze(self, market_data: dict) -> dict:
        """Analyze market data using Groq LLM."""
        if not GROQ_API_KEY:
            return self._smart_mock_analysis(market_data)
        
        try:
            return await self._groq_analysis(market_data)
        except Exception as e:
            print(f"[Agent {self.name}] Groq API error: {e}")
            return self._smart_mock_analysis(market_data)
    
    async def _groq_analysis(self, market_data: dict) -> dict:
        """Real Groq LLM analysis."""
        from groq import AsyncGroq
        
        client = AsyncGroq(api_key=GROQ_API_KEY)
        
        prompt = f"""You are {self.name} ({self.persona}).

Analyze this market data and provide a trading recommendation.

Market Data:
{json.dumps(market_data, indent=2)}

Respond ONLY with valid JSON (no markdown):
{{"signal": "buy", "confidence": 0.85, "reasoning": "brief explanation"}}"""

        response = await client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=300
        )
        
        content = response.choices[0].message.content
        
        # Parse JSON response
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            # Try extracting from markdown code block
            if "```json" in content:
                result = json.loads(content.split("```json")[1].split("```")[0])
            elif "```" in content:
                result = json.loads(content.split("```")[1].split("```")[0])
            else:
                # Fallback - try to extract signal from text
                content_lower = content.lower()
                signal = "hold"
                if "buy" in content_lower and "sell" not in content_lower:
                    signal = "buy"
                elif "sell" in content_lower and "buy" not in content_lower:
                    signal = "sell"
                result = {"signal": signal, "confidence": 0.5, "reasoning": content[:200]}
        
        return {
            "agent": self.name,
            "persona": self.persona,
            "signal": result.get("signal", "hold"),
            "confidence": result.get("confidence", 0.5),
            "reasoning": result.get("reasoning", "")[:300],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _smart_mock_analysis(self, market_data: dict) -> dict:
        """Fallback technical analysis when LLM unavailable."""
        import random
        
        price = market_data.get("price", 100)
        change = market_data.get("change_pct", 0)
        rsi = market_data.get("rsi", 50)
        volume = market_data.get("volume", 1000000)
        
        signal = "hold"
        confidence = 0.5
        reasoning = ""
        
        if self.name == "The Researcher":
            sentiment = market_data.get("news_sentiment", 0)
            if sentiment > 0.3:
                signal = "buy"
                confidence = 0.6 + sentiment * 0.3
                reasoning = "Positive news sentiment detected"
            elif sentiment < -0.3:
                signal = "sell"
                confidence = 0.6 + abs(sentiment) * 0.3
                reasoning = "Negative news sentiment detected"
            else:
                reasoning = "Neutral sentiment - watching"
                
        elif self.name == "The Strategist":
            if change > 2 and rsi < 70:
                signal = "buy"
                confidence = 0.7
                reasoning = "Strong momentum with room to run"
            elif change < -2 and rsi > 30:
                signal = "sell"
                confidence = 0.65
                reasoning = "Downward momentum confirmed"
            else:
                reasoning = "No clear value opportunity"
                
        elif self.name == "The Quant":
            ema20 = market_data.get("ema_20", price * 0.99)
            if price > ema20 * 1.01 and rsi < 65:
                signal = "buy"
                confidence = 0.75
                reasoning = "Price above EMA20, RSI not overbought"
            elif price < ema20 * 0.99 and rsi > 35:
                signal = "sell"
                confidence = 0.7
                reasoning = "Price below EMA20, RSI not oversold"
            else:
                reasoning = "No statistical edge detected"
                
        elif self.name == "The Fundamentalist":
            if change > 1 and volume > 1500000:
                signal = "buy"
                confidence = 0.6
                reasoning = "Strong buying volume confirms trend"
            elif change < -1 and volume > 1500000:
                signal = "sell"
                confidence = 0.6
                reasoning = "Heavy selling pressure"
            else:
                reasoning = "Volume doesn't confirm price action"
        
        elif self.name == "The Risk Manager":
            # Always enforce risk rules
            position_size = market_data.get("position_size_pct", 0)
            if position_size > 5:
                signal = "sell"
                confidence = 0.95
                reasoning = "Position exceeds 5% max - REJECTED"
            elif market_data.get("daily_loss_pct", 0) > 3:
                signal = "sell"
                confidence = 0.99
                reasoning = "Daily loss limit exceeded - STOP TRADING"
            else:
                confidence = 0.8
                reasoning = "Risk checks passed"
        
        else:
            # Default: random but data-informed
            signal = random.choice(["buy", "hold", "sell"])
            confidence = 0.5 + random.random() * 0.3
            reasoning = f"Analysis complete ({self.name})"

        return {
            "agent": self.name,
            "persona": self.persona,
            "signal": signal,
            "confidence": min(confidence, 0.95),
            "reasoning": reasoning + " (technical fallback)",
            "timestamp": datetime.utcnow().isoformat()
        }


# Initialize the 7 HRM agents
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
    Run all 7 agents in parallel and synthesize their recommendations.
    This is the core of the AI trading system using Groq LLM.
    """
    # Run all agents in parallel
    tasks = []
    for agent_name, agent in AGENTS.items():
        if agent_name != "risk_manager":  # Risk manager goes last
            tasks.append(agent.analyze(market_data))
    
    agent_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results (handle any exceptions)
    valid_results = []
    for i, r in enumerate(agent_results):
        if isinstance(r, Exception):
            print(f"Agent error: {r}")
        else:
            valid_results.append(r)
    
    # Count signals
    buy_votes = sum(1 for r in valid_results if r.get("signal") == "buy")
    sell_votes = sum(1 for r in valid_results if r.get("signal") == "sell")
    hold_votes = sum(1 for r in valid_results if r.get("signal") == "hold")
    
    # Get average confidence
    avg_confidence = sum(r.get("confidence", 0) for r in valid_results) / max(len(valid_results), 1)
    
    # Determine consensus
    total_agents = len(valid_results)
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
        "individual_results": valid_results,
        "position_size_pct": market_data.get("position_size_pct", 0),
        "daily_loss_pct": market_data.get("daily_loss_pct", 0),
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
        "agent_results": valid_results + [risk_result],
        "timestamp": datetime.utcnow().isoformat()
    }