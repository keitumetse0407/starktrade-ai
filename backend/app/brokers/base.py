"""
Multi-Broker Abstraction Layer
=============================
Unified interface for Alpaca, TD Ameritrade, Interactive Brokers.
Supports both paper and live trading modes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Any
import os
import httpx
import aiohttp
import xml.etree.ElementTree as ET


class BrokerType(Enum):
    ALPACA = "alpaca"
    TD_AMERITRADE = "td Ameritrade"
    INTERACTIVE_BROKERS = "ibkr"


class TradingMode(Enum):
    PAPER = "paper"
    LIVE = "live"


@dataclass
class BrokerConfig:
    """Configuration for a broker connection."""
    broker_type: BrokerType
    api_key: str
    api_secret: str
    base_url: str
    trading_mode: TradingMode = TradingMode.PAPER
    
    @property
    def is_live(self) -> bool:
        return self.trading_mode == TradingMode.LIVE


@dataclass
class Position:
    """Represents a broker position."""
    symbol: str
    quantity: float
    avg_entry_price: float
    market_value: float
    unrealized_pl: float
    unrealized_plpc: float
    
    
@dataclass
class Account:
    """Represents a broker account."""
    account_id: str
    buying_power: float
    cash: float
    portfolio_value: float
    equity: float
    day_trade_count: int
    pattern_day_trader: bool
    trading_mode: TradingMode
    
    
@dataclass
class Order:
    """Represents a broker order."""
    order_id: str
    symbol: str
    side: str  # buy | sell
    quantity: float
    order_type: str  # market | limit | stop | stop_limit
    time_in_force: str  # day | gtc | ioc | fok
    status: str  # new | partially_filled | filled | cancelled | rejected
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    filled_avg_price: Optional[float] = None
    
    
class BrokerBase(ABC):
    """Abstract base class for broker integrations."""
    
    def __init__(self, config: BrokerConfig):
        self.config = config
        self._session: Optional[httpx.AsyncClient] = None
        
    @abstractmethod
    async def connect(self) -> bool:
        """Test connection to broker."""
        pass
    
    @abstractmethod
    async def get_account(self) -> Account:
        """Get account details."""
        pass
    
    @abstractmethod
    async def get_positions(self) -> list[Position]:
        """Get current positions."""
        pass
    
    @abstractmethod
    async def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "market",
        time_in_force: str = "day",
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> Order:
        """Place an order."""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order."""
        pass
    
    @abstractmethod
    async def get_order_status(self, order_id: str) -> Order:
        """Get order status."""
        pass
    
    @abstractmethod
    async def close_all_positions(self, reason: str = "Kill switch triggered") -> list[Order]:
        """Close all positions (kill switch)."""
        pass
    
    async def get_day_trade_count(self) -> int:
        """Get number of day trades in current rolling 5-day period."""
        account = await self.get_account()
        return account.day_trade_count
    
    async def is_pattern_day_trader(self) -> bool:
        """Check if account is flagged as PDT."""
        account = await self.get_account()
        return account.pattern_day_trader
    
    async def can_place_day_trade(self, num_trades: int = 1) -> bool:
        """Check if placing a day trade is allowed."""
        account = await self.get_account()
        # PDT rule: 3 day trades in 5 business days = PDT flag
        # But check broker-specific rules
        if account.pattern_day_trader:
            # Pattern day trader has unlimited day trades
            return True
        # Otherwise, check buying power and day trade count
        return (account.day_trade_count + num_trades) <= 3


class AlpacaBroker(BrokerBase):
    """Alpaca broker integration."""
    
    def __init__(self, config: BrokerConfig):
        super().__init__(config)
        self.base_url = config.base_url
        self.headers = {
            "APCA-API-KEY-ID": config.api_key,
            "APCA-API-SECRET-KEY": config.api_secret,
            "Content-Type": "application/json"
        }
        
    async def connect(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/v2/account", headers=self.headers)
                return resp.status_code == 200
        except Exception:
            return False
    
    async def get_account(self) -> Account:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/v2/account", headers=self.headers)
            data = resp.json()
            
            return Account(
                account_id=data.get("id", ""),
                buying_power=float(data.get("buying_power", 0)),
                cash=float(data.get("cash", 0)),
                portfolio_value=float(data.get("portfolio_value", 0)),
                equity=float(data.get("equity", 0)),
                day_trade_count=int(data.get("daytrade_count", 0)),
                pattern_day_trader=data.get("pattern_day_trader", False),
                trading_mode=self.config.trading_mode,
            )
    
    async def get_positions(self) -> list[Position]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/v2/positions", headers=self.headers)
            if resp.status_code != 200:
                return []
            
            positions = []
            for p in resp.json():
                positions.append(Position(
                    symbol=p.get("symbol", ""),
                    quantity=float(p.get("qty", 0)),
                    avg_entry_price=float(p.get("avg_entry_price", 0)),
                    market_value=float(p.get("market_value", 0)),
                    unrealized_pl=float(p.get("unrealized_pl", 0)),
                    unrealized_plpc=float(p.get("unrealized_plpc", 0)),
                ))
            return positions
    
    async def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "market",
        time_in_force: str = "day",
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> Order:
        order_data = {
            "symbol": symbol,
            "qty": str(quantity),
            "side": side,
            "type": order_type,
            "time_in_force": time_in_force,
        }
        
        if limit_price:
            order_data["limit_price"] = str(limit_price)
        if stop_price:
            order_data["stop_price"] = str(stop_price)
            
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/v2/orders",
                headers=self.headers,
                json=order_data
            )
            
            if resp.status_code not in [200, 201]:
                raise Exception(f"Order failed: {resp.text}")
            
            data = resp.json()
            return Order(
                order_id=data.get("id", ""),
                symbol=data.get("symbol", ""),
                side=data.get("side", ""),
                quantity=float(data.get("qty", 0)),
                order_type=data.get("type", ""),
                time_in_force=data.get("time_in_force", ""),
                status=data.get("status", ""),
                limit_price=float(data.get("limit_price", 0)) if data.get("limit_price") else None,
                stop_price=float(data.get("stop_price", 0)) if data.get("stop_price") else None,
                filled_avg_price=float(data.get("filled_avg_price", 0)) if data.get("filled_avg_price") else None,
            )
    
    async def cancel_order(self, order_id: str) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.base_url}/v2/orders/{order_id}",
                headers=self.headers
            )
            return resp.status_code in [200, 204]
    
    async def get_order_status(self, order_id: str) -> Order:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/v2/orders/{order_id}",
                headers=self.headers
            )
            data = resp.json()
            return Order(
                order_id=data.get("id", ""),
                symbol=data.get("symbol", ""),
                side=data.get("side", ""),
                quantity=float(data.get("qty", 0)),
                order_type=data.get("type", ""),
                time_in_force=data.get("time_in_force", ""),
                status=data.get("status", ""),
            )
    
    async def close_all_positions(self, reason: str = "Kill switch triggered") -> list[Order]:
        """Close all positions - KILL SWITCH."""
        positions = await self.get_positions()
        closed = []
        
        for pos in positions:
            if pos.quantity > 0:
                order = await self.place_order(
                    symbol=pos.symbol,
                    side="sell",
                    quantity=pos.quantity,
                    order_type="market",
                    time_in_force="ioc",  # Immediate or cancel
                )
                closed.append(order)
                
        return closed


class TDAmeritradeBroker(BrokerBase):
    """TD Ameritrade broker integration via API."""
    
    def __init__(self, config: BrokerConfig):
        super().__init__(config)
        self.access_token: Optional[str] = None
        
    async def connect(self) -> bool:
        # OAuth flow required - complex, simplified for now
        return False
    
    async def get_account(self) -> Account:
        raise NotImplementedError("TD Ameritrade requires OAuth flow")
    
    async def get_positions(self) -> list[Position]:
        raise NotImplementedError("TD Ameritrade requires OAuth flow")
    
    async def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "market",
        time_in_force: str = "day",
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> Order:
        raise NotImplementedError("TD Ameritrade requires OAuth flow")
    
    async def cancel_order(self, order_id: str) -> bool:
        raise NotImplementedError("TD Ameritrade requires OAuth flow")
    
    async def get_order_status(self, order_id: str) -> Order:
        raise NotImplementedError("TD Ameritrade requires OAuth flow")
    
    async def close_all_positions(self, reason: str = "Kill switch triggered") -> list[Order]:
        raise NotImplementedError("TD Ameritrade requires OAuth flow")


class IBKRBroker(BrokerBase):
    """Interactive Brokers via Gateway API."""
    
    def __init__(self, config: BrokerConfig):
        super().__init__(config)
        self.port = int(os.getenv("IB_GATEWAY_PORT", "4002"))
        self.host = os.getenv("IB_GATEWAY_HOST", "localhost")
        
    async def connect(self) -> bool:
        # Requires IB Gateway running
        return False
    
    async def get_account(self) -> Account:
        raise NotImplementedError("IBKR requires Gateway")
    
    async def get_positions(self) -> list[Position]:
        raise NotImplementedError("IBKR requires Gateway")
    
    async def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "market",
        time_in_force: str = "day",
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
    ) -> Order:
        raise NotImplementedError("IBKR requires Gateway")
    
    async def cancel_order(self, order_id: str) -> bool:
        raise NotImplementedError("IBKR requires Gateway")
    
    async def get_order_status(self, order_id: str) -> Order:
        raise NotImplementedError("IBKR requires Gateway")
    
    async def close_all_positions(self, reason: str = "Kill switch triggered") -> list[Order]:
        raise NotImplementedError("IBKR requires Gateway")


def create_broker(config: BrokerConfig) -> BrokerBase:
    """Factory function to create broker instance."""
    brokers = {
        BrokerType.ALPACA: AlpacaBroker,
        BrokerType.TD_AMERITRADE: TDAmeritradeBroker,
        BrokerType.INTERACTIVE_BROKERS: IBKRBroker,
    }
    
    broker_class = brokers.get(config.broker_type)
    if not broker_class:
        raise ValueError(f"Unknown broker: {config.broker_type}")
    
    return broker_class(config)