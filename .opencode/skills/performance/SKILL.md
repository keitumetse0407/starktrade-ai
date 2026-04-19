---
name: performance
description: "Performance optimization for trading platform."
---
## Performance Rules
1. Cache market data (Redis) — Alpha Vantage responses, Qdrant query results
2. Use WebSockets for real-time price updates (not polling)
3. Database: index all columns used in WHERE/JOIN/ORDER BY
4. Paginate ALL list endpoints
5. Use connection pooling for PostgreSQL
6. Go trading engine: use goroutines for concurrent order processing
7. Celery: separate queues for trades (high priority) vs notifications (low priority)
8. Frontend: lazy load heavy components, use React.memo for price tickers
9. Batch Alpaca API calls where possible
10. Profile before optimizing — measure latency at each service boundary