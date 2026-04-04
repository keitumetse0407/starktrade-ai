"""Gold Data Collector - Fetches and cleans XAU/USD data from yfinance"""
import requests as _req
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Yahoo Finance blocks default Python User-Agent — spoof a real browser
_yf_session = _req.Session()
_yf_session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
})


class GoldDataCollector:
    """Fetches and prepares historical gold price data."""

    def __init__(self, symbol: str = "GC=F"):
        self.symbol = symbol
        self._ticker = yf.Ticker(self.symbol, session=_yf_session)

    def get_historical_data(self, period: str = "2y", interval: str = "1d") -> pd.DataFrame:
        """
        Fetch historical gold data from yfinance.
        Returns DataFrame with clean columns: open, high, low, close, volume.
        """
        try:
            df = self._ticker.history(period=period, interval=interval)
            if df.empty:
                logger.warning(f"No data returned for {self.symbol} period={period}")
                return pd.DataFrame()

            df = self._clean_data(df)
            logger.info(f"Fetched {len(df)} rows for {self.symbol} ({period})")
            return df
        except Exception as e:
            logger.error(f"Failed to fetch gold data: {e}")
            return pd.DataFrame()

    def get_latest_price(self) -> Optional[dict]:
        """Get the most recent price snapshot."""
        df = self.get_historical_data(period="5d")
        if df.empty:
            return None

        latest = df.iloc[-1]
        return {
            "price": float(latest["close"]),
            "open": float(latest["open"]),
            "high": float(latest["high"]),
            "low": float(latest["low"]),
            "volume": int(latest["volume"]),
            "timestamp": str(latest.name),
        }

    def get_intraday_data(self, days: int = 5) -> pd.DataFrame:
        """Get intraday data (1-hour intervals for recent days)."""
        return self.get_historical_data(period=f"{days}d", interval="1h")

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize column names and types."""
        df = df.rename(columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        })
        df.index = pd.to_datetime(df.index)
        # Keep only needed columns, handle missing
        needed = ["open", "high", "low", "close", "volume"]
        for col in needed:
            if col not in df.columns:
                df[col] = 0.0
        return df[needed].dropna(subset=["close"])
