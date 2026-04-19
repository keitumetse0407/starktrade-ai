---
name: error-handling
description: "Error handling patterns for multi-service trading platform."
---
## Error Handling Rules
1. NO empty catch/except blocks — log and re-raise or handle explicitly
2. Trading errors → alert Discord/Telegram webhook immediately
3. Use custom exception classes: TradingError, InsufficientFundsError, RateLimitError, etc.
4. FastAPI: use exception handlers to return consistent error responses
5. Go: ALWAYS check error returns (no _ for errors)
6. Frontend: error boundaries around every major section
7. Celery tasks: use retry with max_retries=3, exponential backoff
8. External API failures: circuit breaker → fallback → alert
9. Log full stack traces with request context (user_id, trade_id, etc.)
10. NEVER expose internal error details to the client in production