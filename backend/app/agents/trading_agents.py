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
KILO_API_KEY = os.getenv("KILO_API_KEY", "")
KILO_API_URL = os.getenv("KILO_API_URL", "https://api.kilocode.ai/v1")


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
        # Try Kilo Code first (free), then OpenAI, then smart mock
        if KILO_API_KEY:
            try:
                return await self._kilo_analysis(market_data)
            except Exception as e:
                print(f"Kilo failed for {self.name}: {e}")
        
        if OPENAI_API_KEY:
            try:
                return await self._openai_analysis(market_data)
            except Exception as e:
                print(f"OpenAI failed for {self.name}: {e}")
        
        return self._smart_mock_analysis(market_data)
    
    async def _kilo_analysis(self, market_data: dict) -> dict:
        """Kilo Code API analysis."""
        import httpx
        
        prompt = f"""Analyze this market data and provide a trading recommendation.

Market Data:
{json.dumps(market_data, indent=2)}

Respond ONLY with JSON:
{{"signal": "buy" | "sell" | "hold", "confidence": 0.0-1.0, "reasoning": "brief"}}"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{KILO_API_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {KILO_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "anthropic/claude-3.5-haiku-latest",
                    "messages": [
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 200
                },
                timeout=30
            )
            
            data = response.json()
            
            if data.get("choices"):
                content = data["choices"][0]["message"]["content"]
            else:
                raise Exception(f"Kilo API error: {data}")
        
        try:
            result = json.loads(content)
        except:
            if "```json" in content:
                result = json.loads(content.split("```json")[1].split("```")[0])
            else:
                result = {"signal": "hold", "confidence": 0.5, "reasoning": content}
        
        return {
            "agent": self.name,
            "persona": self.persona,
            "signal": result.get("signal", "hold"),
            "confidence": result.get("confidence", 0.5),
            "reasoning": result.get("reasoning", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _openai_analysis(self, market_data: dict) -> dict:
        """Real OpenAI analysis."""
        from groq import AsyncGroq
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        
        prompt = f"""Analyze this market data and provide a trading recommendation.

Market Data:
{json.dumps(market_data, indent=2)}

Respond ONLY with JSON:
{{"signal": "buy" | "sell" | "hold", "confidence": 0.0-1.0, "reasoning": "brief"}}"""

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=200
        )
        
        content = response.choices[0].message.content
        
        try:
            result = json.loads(content)
        except:
            if "```json" in content:
                result = json.loads(content.split("```json")[1].split("```")[0])
            else:
                result = {"signal": "hold", "confidence": 0.5, "reasoning": content}
        
        return {
            "agent": self.name,
            "persona": self.persona,
            "signal": result.get("signal", "hold"),
            "confidence": result.get("confidence", 0.5),
            "reasoning": result.get("reasoning", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
            
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
    
    def _smart_mock_analysis(self, market_data: dict) -> dict:
        """Smart mock analysis using technical indicators."""
        import random
        
        # Use market data to make intelligent decisions
        price = market_data.get("price", 100)
        change = market_data.get("change_pct", 0)
        rsi = market_data.get("rsi", 50)
        volume = market_data.get("volume", 1000000)
        
        # Agent-specific logic
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
            # Simplified fundamental check
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
        
        return {
            "agent": self.name,
            "persona": self.persona,
            "signal": signal,
            "confidence": min(confidence, 0.9),
            "reasoning": reasoning + " (technical analysis mode)",
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
