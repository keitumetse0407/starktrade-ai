---
name: api-integration
description: "Patterns for integrating external APIs (Alpaca, Alpha Vantage, Paystack, etc.)"
---
## API Integration Rules
1. ALWAYS use retry with exponential backoff (max 3 retries)
2. Set timeouts on ALL HTTP calls (connect=5s, read=30s)
3. Cache market data responses (Alpha Vantage: 1min, News API: 5min)
4. Handle rate limits gracefully — queue and retry, don't crash
5. Log ALL external API calls with: endpoint, status, latency, request_id
6. Use circuit breaker pattern — if API fails 5x in a row, stop calling for 60s
7. Validate ALL responses with Pydantic models before processing
8. Store API keys in .env, access via settings/config class, never import directly