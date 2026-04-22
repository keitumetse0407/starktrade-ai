"""
Firecrawl Sentiment Service — Background Celery Task
==============================================
Scrapes financial news/sentiment for System 2 regime detection.
Rate-limited to avoid burning API credits.

Security: Only runs as internal Celery task, no public endpoints.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from celery import shared_task
import redis

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
FIRECRAWL_API_URL = os.getenv("FIRECRAWL_API_URL", "https://api.firecrawl.dev")
REDIS_URL = os.getenv("REDIS_URL")

redis_client = None
if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL)
    except Exception:
        pass

RATE_LIMIT_MINUTES = 15
SENTIMENT_CACHE_TTL = 900


async def scrape_financial_news(symbols: list[str] = None) -> dict:
    """Scrape financial news for sentiment analysis."""
    if not FIRECRAWL_API_KEY:
        return {"error": "No Firecrawl API key", "sentiment": 0, "headlines": []}
    
    if not redis_client:
        return {"error": "No Redis", "sentiment": 0, "headlines": []}
    
    rate_limit_key = "firecrawl:rate_limit"
    if redis_client.get(rate_limit_key):
        cached = redis_client.get("firecrawl:sentiment_cache")
        if cached:
            return json.loads(cached)
        return {"error": "Rate limited", "sentiment": 0, "headlines": []}
    
    symbols = symbols or ["SPX", "BTC", "GOLD", "VIX"]
    headlines = []
    
    for symbol in symbols[:3]:
        try:
            headlines.extend(await scrape_symbol_news(symbol))
        except Exception as e:
            print(f"[Firecrawl] Error scraping {symbol}: {e}")
    
    sentiment = calculate_sentiment(headlines)
    
    result = {
        "sentiment": sentiment,
        "headlines": headlines[:10],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symbols": symbols,
    }
    
    redis_client.setex(
        "firecrawl:sentiment_cache",
        SENTIMENT_CACHE_TTL,
        json.dumps(result, default=str)
    )
    redis_client.setex(rate_limit_key, RATE_LIMIT_MINUTES * 60, "1")
    
    return result


async def scrape_symbol_news(symbol: str) -> list[dict]:
    """Scrape news for a specific symbol."""
    import httpx
    
    urls = {
        "SPX": ["https://finance.yahoo.com/news/channel/stock-markets/", "https://www.cnbc.com/investing/"],
        "BTC": ["https://cryptonews.com/news/", "https://www.coindesk.com/news/"],
        "GOLD": ["https://www.gold.org/gold-investment/", "https://www.reuters.com/markets/commodities/gold/"],
        "VIX": ["https://www.cnbc.com/investing/bonds/", "https://finance.yahoo.com/quotes/SPX.VIX/"],
    }
    
    urls_to_scrape = urls.get(symbol, [f"https://www.reuters.com/search/news?blob={symbol}"])
    headlines = []
    
    for url in urls_to_scrape[:2]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    f"{FIRECRAWL_API_URL}/v1/crawl",
                    headers={
                        "Authorization": f"Bearer {FIRECRAWL_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "url": url,
                        "limit": 5,
                        "scrapeOptions": {
                            "formats": ["markdown"],
                        }
                    },
                )
                if r.status_code == 200:
                    data = r.json()
                    for item in data.get("data", {}).get("results", [])[:3]:
                        headlines.append({
                            "symbol": symbol,
                            "title": item.get("title", "")[:200],
                            "url": item.get("url", ""),
                            "source": url.split("//")[1].split("/")[0] if "//" in url else url,
                        })
        except Exception as e:
            print(f"[Firecrawl] Failed to scrape {url}: {e}")
    
    return headlines


def calculate_sentiment(headlines: list[dict]) -> float:
    """Calculate sentiment score from headlines (-1 to 1)."""
    if not headlines:
        return 0
    
    positive_words = {"surge", "gain", "rise", "bull", "up", "growth", "rally", "gain", "profit", "beat", "high", "record"}
    negative_words = {"fall", "drop", "bear", "down", "loss", "decline", "crash", "plunge", "risk", "fear", "low", "recession"}
    
    score = 0
    for headline in headlines:
        title = headline.get("title", "").lower()
        for word in positive_words:
            if word in title:
                score += 0.1
        for word in negative_words:
            if word in title:
                score -= 0.1
    
    return max(-1, min(1, score / max(len(headlines), 1)))


@shared_task(bind=True, max_retries=2)
def scrape_sentiment_task(self, symbols: list[str] = None):
    """Celery task for background sentiment scraping."""
    import asyncio
    try:
        result = asyncio.run(scrape_financial_news(symbols))
        return result
    except Exception as e:
        raise self.retry(exc=e, countdown=60)


def get_cached_sentiment() -> Optional[dict]:
    """Get cached sentiment from Redis."""
    if not redis_client:
        return None
    cached = redis_client.get("firecrawl:sentiment_cache")
    if cached:
        return json.loads(cached)
    return None


async def get_system2_context_for_agents() -> dict:
    """Get sentiment context for LangGraph agents."""
    cached = get_cached_sentiment()
    
    if cached:
        return {
            "news_sentiment": cached.get("sentiment", 0),
            "headlines": cached.get("headlines", [])[:5],
            "timestamp": cached.get("timestamp"),
            "source": "firecrawl_cache",
        }
    
    return {
        "news_sentiment": 0,
        "headlines": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "default",
    }