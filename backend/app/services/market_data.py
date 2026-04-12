"""Market data service."""
import httpx
from app.core.config import settings
import requests as _req

# Yahoo Finance blocks default Python User-Agent — spoof a real browser
_yf_session = _req.Session()
_yf_session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})


async def get_ohlcv(db, symbol: str, timeframe: str, limit: int):
    """Fetch OHLCV data from Alpha Vantage with yfinance fallback."""
    try:
        async with httpx.AsyncClient() as client:
            interval_map = {"1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1h": "60min", "1d": "daily"}
            interval = interval_map.get(timeframe, "daily")

            if interval in ("1min", "5min", "15min", "30min", "60min"):
                fn = "TIME_SERIES_INTRADAY"
                url = f"https://www.alphavantage.co/query?function={fn}&symbol={symbol}&interval={interval}&apikey={settings.ALPHA_VANTAGE_API_KEY}"
            else:
                fn = "TIME_SERIES_DAILY_ADJUSTED"
                url = f"https://www.alphavantage.co/query?function={fn}&symbol={symbol}&apikey={settings.ALPHA_VANTAGE_API_KEY}"

            resp = await client.get(url, timeout=15.0)
            data = resp.json()

            time_series_key = [k for k in data.keys() if "Time Series" in k]
            if not time_series_key:
                return _fallback_yfinance(symbol, timeframe, limit)

            ts = data[time_series_key[0]]
            result = []
            for date, values in list(ts.items())[:limit]:
                result.append({
                    "time": date,
                    "open": float(values.get("1. open", 0)),
                    "high": float(values.get("2. high", 0)),
                    "low": float(values.get("3. low", 0)),
                    "close": float(values.get("4. close", 0)),
                    "volume": float(values.get("5. volume", 0)),
                })
            return result
    except Exception:
        return _fallback_yfinance(symbol, timeframe, limit)


def _fallback_yfinance(symbol: str, timeframe: str, limit: int):
    """Fallback to yfinance (free, 15min delay)."""
    try:
        import yfinance as yf
        interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "1d": "1d"}
        period_map = {"1m": "1d", "5m": "5d", "15m": "5d", "1h": "1mo", "1d": "1y"}

        ticker = yf.Ticker(symbol, session=_yf_session)
        df = ticker.history(
            period=period_map.get(timeframe, "1y"),
            interval=interval_map.get(timeframe, "1d"),
        )

        result = []
        for idx, row in df.tail(limit).iterrows():
            result.append({
                "time": idx.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"]),
            })
        return result
    except Exception:
        return []


async def get_market_pulse():
    """Get live market data from free APIs."""
    pulse = {k: {"price": 0, "change_pct": 0} for k in ["SPX", "NDX", "BTC", "ETH", "GLD", "VIX"]}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Crypto from CoinGecko (free, no key)
            r = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "bitcoin,ethereum", "vs_currencies": "usd", "include_24hr_change": "true"}
            )
            if r.status_code == 200:
                data = r.json()
                pulse["BTC"] = {"price": round(data.get("bitcoin", {}).get("usd", 0), 2), "change_pct": round(data.get("bitcoin", {}).get("usd_24h_change", 0), 2)}
                pulse["ETH"] = {"price": round(data.get("ethereum", {}).get("usd", 0), 2), "change_pct": round(data.get("ethereum", {}).get("usd_24h_change", 0), 2)}
    except Exception:
        pass
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Stocks from Yahoo Finance v8 (direct API, less blocked)
            symbols = {"SPX": "%5EGSPC", "NDX": "%5EIXIC", "GLD": "GLD", "VIX": "%5EVIX"}
            for name, sym in symbols.items():
                try:
                    r = await client.get(
                        f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}",
                        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"},
                        timeout=8.0
                    )
                    if r.status_code == 200:
                        meta = r.json()["chart"]["result"][0]["meta"]
                        price = float(meta.get("regularMarketPrice", 0))
                        prev = float(meta.get("chartPreviousClose", 1) or 1)
                        pulse[name] = {"price": round(price, 2), "change_pct": round(((price - prev) / prev) * 100, 2)}
                except Exception:
                    pass
    except Exception:
        pass
    return pulse


async def search_symbols(q: str):
    """Search for symbols (stub — integrate with broker API in production)."""
    common = [
        {"symbol": "AAPL", "name": "Apple Inc.", "asset_class": "stock"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "asset_class": "stock"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "asset_class": "stock"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "asset_class": "stock"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "asset_class": "stock"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "asset_class": "stock"},
        {"symbol": "BTC-USD", "name": "Bitcoin USD", "asset_class": "crypto"},
        {"symbol": "ETH-USD", "name": "Ethereum USD", "asset_class": "crypto"},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "asset_class": "etf"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "asset_class": "etf"},
        {"symbol": "GLD", "name": "SPDR Gold Shares", "asset_class": "etf"},
    ]
    q_upper = q.upper()
    return [s for s in common if q_upper in s["symbol"] or q_upper in s["name"].upper()]
