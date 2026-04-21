"""
Autotrading Engine
====================
Combines AI agents, broker API, and risk management
into an autonomous trading loop.
"""

import os
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from dataclasses import dataclass, field

import httpx
from app.agents.trading_agents import run_agent_council, AGENTS


@dataclass
class TradingConfig:
    """Configuration for autotrading."""
    enabled: bool = False
    strategy: str = "all_weather"
    risk_tolerance: int = 5  # 1-10
    max_position_pct: float = 5.0  # Max 5% per trade
    max_daily_loss_pct: float = 3.0  # Stop after 3% daily loss
    max_drawdown_pct: float = 8.0  # Stop after 8% total drawdown
    symbols: List[str] = field(default_factory=lambda: ["GLD", "SPY", "QQQ", "AAPL", "MSFT"])  # GLD for gold exposure
    check_interval_seconds: int = 300  # Check every 5 minutes


class AutotradingEngine:
    """Main autotrading engine."""
    
    def __init__(self, config: TradingConfig = None):
        self.config = config or TradingConfig()
        self.is_running = False
        self.daily_pnl = 0.0
        self.total_pnl = 0.0
        self.starting_balance = 100000.0
        self.positions: Dict[str, dict] = {}
        self.trade_history: List[dict] = []
        self.last_check = None
    
    async def start(self):
        """Start the autotrading loop."""
        if self.is_running:
            return {"status": "already_running"}
        
        self.is_running = True
        self.daily_pnl = 0.0
        
        # Start the trading loop in background
        asyncio.create_task(self._trading_loop())
        
        return {"status": "started", "config": self.config.__dict__}
    
    async def stop(self):
        """Stop the autotrading loop."""
        self.is_running = False
        return {"status": "stopped"}
    
    async def _trading_loop(self):
        """Main trading loop."""
        while self.is_running:
            try:
                # Check risk limits
                if not self._check_risk_limits():
                    print("Risk limits hit — pausing trading")
                    await asyncio.sleep(3600)  # Wait 1 hour
                    continue
                
                # Check each symbol
                for symbol in self.config.symbols:
                    if not self.is_running:
                        break
                    
                    await self._analyze_and_trade(symbol)
                    
                    # Small delay between symbols
                    await asyncio.sleep(2)
                
                self.last_check = datetime.utcnow()
                
                # Wait for next check
                await asyncio.sleep(self.config.check_interval_seconds)
                
            except Exception as e:
                print(f"Trading loop error: {e}")
                await asyncio.sleep(60)
    
    async def _analyze_and_trade(self, symbol: str):
        """Analyze a symbol and potentially trade."""
        # Get market data (mock for now, would use Alpaca in production)
        market_data = await self._get_market_data(symbol)
        
        # Run AI agent council
        result = await run_agent_council(symbol, market_data)
        
        decision = result.get("final_decision", "hold")
        confidence = result.get("confidence", 0)
        
        # Only trade if confidence > threshold
        min_confidence = 0.6 + (self.config.risk_tolerance / 100)
        
        if decision == "hold" or confidence < min_confidence:
            return
        
        # Calculate position size based on risk
        position_size = self._calculate_position_size(symbol, confidence)
        
        if position_size <= 0:
            return
        
        # Execute trade by creating a database record and queuing for execution
        from app.db.models import Trade
        from app.db.session import async_session_factory
        from uuid import uuid4

        trade_record = Trade(
            id=uuid4(),
            symbol=symbol,
            side=decision,
            quantity=position_size,
            status="pending",
            reasoning=result.get("reason", ""),
        )

        try:
            async with async_session_factory() as db:
                db.add(trade_record)
                await db.commit()
                await db.refresh(trade_record)

                # Queue for execution via Celery
                from app.services.execution import queue_trade_execution
                await queue_trade_execution(trade_record.id)
                print(f"TRADE QUEUED: {decision.upper()} {symbol} | Confidence: {confidence:.0%} | {result.get('reason', '')}")
        except Exception as e:
            print(f"Failed to queue trade: {e}")
    
    def _check_risk_limits(self) -> bool:
        """Check if we're within risk limits."""
        # Daily loss limit
        if abs(self.daily_pnl) > (self.starting_balance * self.config.max_daily_loss_pct / 100):
            return False
        
        # Total drawdown limit
        drawdown_pct = (self.starting_balance - (self.starting_balance + self.total_pnl)) / self.starting_balance * 100
        if drawdown_pct > self.config.max_drawdown_pct:
            return False
        
        return True
    
    def _calculate_position_size(self, symbol: str, confidence: float) -> float:
        """Calculate position size based on Kelly Criterion and risk tolerance."""
        # Base position size from config
        max_size = self.config.max_position_pct / 100
        
        # Adjust by confidence
        adjusted_size = max_size * confidence
        
        # Adjust by risk tolerance
        risk_multiplier = self.config.risk_tolerance / 10
        
        final_size = adjusted_size * risk_multiplier
        
        # Convert to shares using actual market price
        portfolio_value = self.starting_balance + self.total_pnl
        position_value = portfolio_value * final_size
        
        # Get current market price for accurate share calculation
        # For now using a reasonable default, in production this would call market data API
        # Using 200 as fallback for stock prices, but this should be improved with real data
        avg_price = 200.0  # Fallback price - should be replaced with real market data
        shares = position_value / avg_price
        
        return max(1, int(shares))
    
    async def _get_market_data(self, symbol: str) -> dict:
        """Get market data for analysis."""
        # Mock data — in production, use Alpaca API
        import random
        
        price = 100 + random.uniform(-10, 10)
        
        return {
            "symbol": symbol,
            "price": round(price, 2),
            "change_pct": round(random.uniform(-3, 3), 2),
            "volume": random.randint(100000, 10000000),
            "high": round(price * 1.02, 2),
            "low": round(price * 0.98, 2),
            "open": round(price * 0.99, 2),
            "vwap": round(price * 1.001, 2),
            "rsi": round(random.uniform(30, 70), 1),
            "macd": round(random.uniform(-2, 2), 2),
            "ema_20": round(price * 0.99, 2),
            "ema_50": round(price * 0.98, 2),
            "news_sentiment": round(random.uniform(-1, 1), 2),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_status(self) -> dict:
        """Get current engine status."""
        return {
            "enabled": self.config.enabled,
            "running": self.is_running,
            "strategy": self.config.strategy,
            "risk_tolerance": self.config.risk_tolerance,
            "symbols": self.config.symbols,
            "daily_pnl": self.daily_pnl,
            "total_pnl": self.total_pnl,
            "positions": len(self.positions),
            "trades_today": len([t for t in self.trade_history if t["timestamp"][:10] == datetime.utcnow().strftime("%Y-%m-%d")]),
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "risk_limits_ok": self._check_risk_limits(),
        }
    
    def update_config(self, **kwargs):
        """Update trading configuration."""
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
        return self.config.__dict__


# Global engine instance
engine = AutotradingEngine()
