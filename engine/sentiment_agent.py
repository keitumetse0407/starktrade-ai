"""Sentiment Agent - Scrapes free RSS feeds for gold/market sentiment.

Uses keyword-based polarity scoring (no external NLP library needed).
Works well for financial headlines — lighter and faster than VADER.
"""
import feedparser
import re
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# Gold/market RSS feeds (all free, no API key)
GOLD_FEEDS = [
    "https://feeds.reuters.com/reuters/businessNews",
    "https://www.kitco.com/rss/kitco-news.xml",
    "https://www.forbes.com/companies/markets/feed/",
]

BROAD_FEEDS = [
    "https://feeds.reuters.com/reuters/topNews",
    "https://finance.yahoo.com/news/rssindex",
]


def _simple_sentiment(text: str) -> float:
    """
    Lightweight sentiment scorer — no external NLP library needed.
    Uses keyword-based polarity (works well for financial headlines).
    Returns -1.0 (very negative) to +1.0 (very positive).
    """
    text = text.lower()

    positive_words = [
        "surge", "soar", "rally", "gain", "rise", "jump", "bullish",
        "record", "high", "profit", "beat", "optimistic", "growth",
        "strong", "demand", "safe-haven", "safe haven", "hedge",
        "upside", "breakthrough", "boost", "opportunity", "positive",
    ]
    negative_words = [
        "crash", "plunge", "fall", "drop", "decline", "bearish",
        "loss", "miss", "pessimistic", "weak", "down", "sell-off",
        "selloff", "risk", "crisis", "fear", "panic", "recession",
        "downside", "slump", "downturn", "tumble", "sinking", "negative",
    ]

    score = 0.0
    count = 0

    for word in positive_words:
        if word in text:
            score += 1.0
            count += 1

    for word in negative_words:
        if word in text:
            score -= 1.0
            count += 1

    if count == 0:
        return 0.0

    return score / count


class SentimentAgent:
    """Analyzes news sentiment for gold market context."""

    def __init__(self, feeds: Optional[List[str]] = None):
        self.feeds = feeds or GOLD_FEEDS + BROAD_FEEDS
        self._cache: List[Dict] = []
        self._last_fetch: Optional[datetime] = None
        self._cache_ttl = timedelta(minutes=30)

    def get_sentiment(self, force_refresh: bool = False) -> Dict:
        """
        Get the latest gold-related sentiment.
        Caches results for 30 minutes to avoid hammering feeds.
        """
        now = datetime.now(timezone.utc)
        if (
            not force_refresh
            and self._cache
            and self._last_fetch
            and (now - self._last_fetch) < self._cache_ttl
        ):
            return self._aggregate(self._cache)

        articles = self._scrape_feeds()
        self._cache = articles
        self._last_fetch = now
        return self._aggregate(articles)

    def _scrape_feeds(self, limit_per_feed: int = 15) -> List[Dict]:
        """Fetch and parse all RSS feeds."""
        articles = []
        for feed_url in self.feeds:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:limit_per_feed]:
                    title = entry.get("title", "").strip()
                    summary = entry.get("summary", "")
                    # Strip HTML tags
                    summary = re.sub(r"<[^>]+>", "", summary)[:200]
                    published = entry.get("published", "")

                    # Filter for gold/commodity/market relevance (broad match)
                    keywords = ["gold", "precious metal", "commodity", "dollar",
                                "dxy", "fed", "rate", "inflation", "market",
                                "central bank", "recession", "treasury", "bond",
                                "xau", "silver", "oil", "s&p", "sp500", "nasdaq"]
                    combined = (title + " " + summary).lower()
                    if any(kw in combined for kw in keywords):
                        articles.append({
                            "title": title,
                            "summary": summary,
                            "published": published,
                            "source": feed_url,
                        })
            except Exception as e:
                logger.warning(f"Failed to parse {feed_url}: {e}")

        logger.info(f"Scraped {len(articles)} relevant articles from {len(self.feeds)} feeds")
        return articles

    def _aggregate(self, articles: List[Dict]) -> Dict:
        """Aggregate sentiment across all articles."""
        if not articles:
            return {
                "overall_sentiment": "neutral",
                "polarity": 0.0,
                "articles_count": 0,
                "articles": [],
            }

        scored = []
        for article in articles:
            title_score = _simple_sentiment(article["title"])
            summary_score = _simple_sentiment(article["summary"])
            combined = (title_score * 0.7) + (summary_score * 0.3)

            if combined > 0.1:
                label = "positive"
            elif combined < -0.1:
                label = "negative"
            else:
                label = "neutral"

            scored.append({
                "title": article["title"],
                "polarity": round(combined, 3),
                "sentiment": label,
            })

        avg_polarity = sum(s["polarity"] for s in scored) / len(scored)

        if avg_polarity > 0.05:
            overall = "bullish"
        elif avg_polarity < -0.05:
            overall = "bearish"
        else:
            overall = "neutral"

        return {
            "overall_sentiment": overall,
            "polarity": round(avg_polarity, 3),
            "articles_count": len(scored),
            "positive": sum(1 for s in scored if s["sentiment"] == "positive"),
            "negative": sum(1 for s in scored if s["sentiment"] == "negative"),
            "neutral": sum(1 for s in scored if s["sentiment"] == "neutral"),
            "articles": scored[:8],  # keep top 8
        }
