"""Signal Delivery Service - Telegram + Database"""
import os
import asyncio
import aiohttp
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

class SignalDelivery:
    """Handles signal delivery to Telegram and database persistence"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def send_telegram_signal(self, signal_data: dict) -> bool:
        """Send signal to Telegram channel"""
        if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
            print("[SignalDelivery] Telegram not configured, skipping...")
            return False
        
        message = self._format_telegram_message(signal_data)
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"}
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    if resp.status == 200:
                        print(f"[SignalDelivery] Signal sent to Telegram: {signal_data.get('symbol')}")
                        return True
                    else:
                        print(f"[SignalDelivery] Telegram error: {resp.status}")
                        return False
        except Exception as e:
            print(f"[SignalDelivery] Error: {e}")
            return False
    
    def _format_telegram_message(self, signal: dict) -> str:
        """Format signal as Telegram message"""
        emoji = "🟢" if signal.get("action") == "BUY" else "🔴"
        return f"""🤖 <b>STARKTRADE SIGNAL</b>

📊 {signal.get('symbol', 'N/A')} | {signal.get('action', 'N/A')}
💡 Confidence: {signal.get('confidence', 'N/A')}%
🎯 Entry: {signal.get('entry_price', 'N/A')}
🛡️ Stop Loss: {signal.get('stop_loss', 'N/A')}
🎯 Take Profit: {signal.get('take_profit', 'N/A')}
📈 Regime: {signal.get('regime', 'N/A')}

📝 {signal.get('reasoning', 'Analysis complete')}

⚠️ <i>Not financial advice. Trade at your own risk.</i>"""
    
    async def save_signal_to_db(self, signal_data: dict) -> bool:
        """Save signal to PostgreSQL signals table"""
        try:
            query = text("""
                INSERT INTO signals (symbol, action, entry_price, stop_loss, take_profit, confidence, regime, reasoning, created_at)
                VALUES (:symbol, :action, :entry_price, :stop_loss, :take_profit, :confidence, :regime, :reasoning, :created_at)
            """)
            await self.db.execute(query, {
                "symbol": signal_data.get("symbol"),
                "action": signal_data.get("action"),
                "entry_price": signal_data.get("entry_price"),
                "stop_loss": signal_data.get("stop_loss"),
                "take_profit": signal_data.get("take_profit"),
                "confidence": signal_data.get("confidence"),
                "regime": signal_data.get("regime"),
                "reasoning": signal_data.get("reasoning"),
                "created_at": datetime.utcnow()
            })
            await self.db.commit()
            print(f"[SignalDelivery] Signal saved to DB: {signal_data.get('symbol')}")
            return True
        except Exception as e:
            print(f"[SignalDelivery] DB save error: {e}")
            await self.db.rollback()
            return False
    
    async def deliver_signal(self, signal_data: dict) -> dict:
        """Full delivery: Telegram + DB"""
        telegram_sent = await self.send_telegram_signal(signal_data)
        db_saved = await self.save_signal_to_db(signal_data)
        
        return {
            "telegram": telegram_sent,
            "database": db_saved,
            "symbol": signal_data.get("symbol"),
            "action": signal_data.get("action")
        }


class MarketPulse:
    """Broadcast market data to WebSocket clients"""
    
    def __init__(self, ws_manager):
        self.ws_manager = ws_manager
    
    async def broadcast_market_data(self, market_data: dict):
        """Broadcast market pulse to all WS clients"""
        message = {
            "type": "market_pulse",
            "timestamp": datetime.utcnow().isoformat(),
            "data": market_data
        }
        await self.ws_manager.broadcast(message)
    
    async def broadcast_signal(self, signal_data: dict):
        """Broadcast new signal to all WS clients"""
        message = {
            "type": "new_signal",
            "timestamp": datetime.utcnow().isoformat(),
            "data": signal_data
        }
        await self.ws_manager.broadcast(message)
    
    async def broadcast_trade(self, trade_data: dict):
        """Broadcast trade execution to all WS clients"""
        message = {
            "type": "trade_execution",
            "timestamp": datetime.utcnow().isoformat(),
            "data": trade_data
        }
        await self.ws_manager.broadcast(message)
