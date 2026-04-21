"""Gold Data Collector — Yahoo v8 API (direct) + Twelve Data fallback"""
import requests
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)

TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY", "")
TWELVE_BASE = "https://api.twelvedata.com"

# Yahoo v8 chart API with full browser headers
_YAHOO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/',
}
_YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"

# Yahoo symbol → Twelve Data symbol mapping
_TWELVE_MAP = {
    "GLD": "XAU/USD",
    "XAUUSD=X": "XAU/USD",
    "SI=F": "XAG/USD",
    "CL=F": "WTI/USD",
}


def _fetch_yahoo_v8(symbol: str, period: str = "2y", interval: str = "1d") -> pd.DataFrame:
    """Fetch OHLCV directly from Yahoo Finance v8 chart API (no yfinance library)."""
    range_map = {"5d": "5d", "1mo": "1mo", "3mo": "3mo", "6mo": "6mo", "1y": "1y", "2y": "2y"}
    interval_map = {"1d": "1d", "1h": "1h", "1wk": "1wk"}

    url = _YAHOO_CHART.format(symbol=symbol)
    params = {
        "range": range_map.get(period, "2y"),
        "interval": interval_map.get(interval, "1d"),
        "includePrePost": "false",
    }

    try:
        resp = requests.get(url, headers=_YAHOO_HEADERS, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            logger.warning(f"Yahoo v8: no result for {symbol}")
            return pd.DataFrame()

        bar = result[0]
        ts = bar.get("timestamp", [])
        quote = bar.get("indicators", {}).get("quote", [{}])[0]

        df = pd.DataFrame({
            "datetime": pd.to_datetime(ts, unit="s"),
            "open": quote.get("open", []),
            "high": quote.get("high", []),
            "low": quote.get("low", []),
            "close": quote.get("close", []),
            "volume": quote.get("volume", []),
        })
        df = df.dropna(subset=["close"])
        if df.empty:
            return df
        df = df.set_index("datetime")
        df.index.name = None
        return df
    except Exception as e:
        logger.error(f"Yahoo v8 fetch failed for {symbol}: {e}")
        return pd.DataFrame()


def _fetch_twelve_data(symbol: str = "XAU/USD", interval: str = "1day", outputsize: int = 800) -> pd.DataFrame:
    """Fetch OHLCV from Twelve Data API (requires real API key)."""
    if not TWELVE_DATA_API_KEY or TWELVE_DATA_API_KEY == "demo":
        return pd.DataFrame()

    try:
        url = f"{TWELVE_BASE}/time_series"
        params = {
            "symbol": symbol, "interval": interval,
            "outputsize": outputsize, "apikey": TWELVE_DATA_API_KEY, "format": "JSON",
        }
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "ok":
            return pd.DataFrame()
        values = data.get("values", [])
        if not values:
            return pd.DataFrame()
        rows = []
        for v in reversed(values):
            rows.append({
                "datetime": v.get("datetime"),
                "open": float(v.get("open", 0)),
                "high": float(v.get("high", 0)),
                "low": float(v.get("low", 0)),
                "close": float(v.get("close", 0)),
                "volume": float(v.get("volume", 0)),
            })
        df = pd.DataFrame(rows)
        df["datetime"] = pd.to_datetime(df["datetime"])
        df = df.set_index("datetime")
        df.index.name = None
        return df
    except Exception as e:
        logger.error(f"Twelve Data failed: {e}")
        return pd.DataFrame()


# yfinance session for absolute last-resort fallback
_yf_session = requests.Session()
_yf_session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})


class GoldDataCollector:
    """Fetches and prepares historical gold price data.

    Priority order:
      1. Yahoo v8 chart API (direct HTTP, no library)
      2. Twelve Data API (if TWELVE_DATA_API_KEY is set)
      3. yfinance (library with browser session)
    """

    def __init__(self, symbol: str = "GLD"):
        self.symbol = symbol
        self._twelve_symbol = _TWELVE_MAP.get(symbol, symbol.replace("=F", "/USD"))

    def get_historical_data(self, period: str = "2y", interval: str = "1d") -> pd.DataFrame:
        """Fetch historical gold data with multi-source fallback."""
        # 1. Yahoo v8 direct
        df = _fetch_yahoo_v8(self.symbol, period, interval)
        if not df.empty:
            df = self._clean_data(df)
            logger.info(f"Fetched {len(df)} rows from Yahoo v8 for {self.symbol}")
            return df

        # 2. Twelve Data (if key set)
        td_interval = {"1d": "1day", "1h": "1h", "1wk": "1week"}.get(interval, "1day")
        days_map = {"5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730}
        df = _fetch_twelve_data(self._twelve_symbol, td_interval, days_map.get(period, 800))
        if not df.empty:
            df = self._clean_data(df)
            logger.info(f"Fetched {len(df)} rows from Twelve Data for {self.symbol}")
            return df

        # 3. yfinance last resort
        logger.warning(f"Falling back to yfinance library for {self.symbol}")
        try:
            ticker = yf.Ticker(self.symbol, session=_yf_session)
            df = ticker.history(period=period, interval=interval)
            if not df.empty:
                df = self._clean_data(df)
                logger.info(f"Fetched {len(df)} rows from yfinance for {self.symbol}")
                return df
        except Exception as e:
            logger.error(f"All data sources failed for {self.symbol}: {e}")

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
            "volume": int(latest.get("volume", 0)),
            "timestamp": str(latest.name),
        }

    def get_intraday_data(self, days: int = 5) -> pd.DataFrame:
        """Get intraday data (1-hour intervals)."""
        return self.get_historical_data(period=f"{days}d", interval="1h")

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize column names and types."""
        df = df.rename(columns={
            "Open": "open", "High": "high", "Low": "low",
            "Close": "close", "Volume": "volume",
        })
        df.index = pd.to_datetime(df.index)
        needed = ["open", "high", "low", "close", "volume"]
        for col in needed:
            if col not in df.columns:
                df[col] = 0.0
        return df[needed].dropna(subset=["close"])
