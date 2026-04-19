---
name: trading-safety
description: "MANDATORY for all trading code. Enforces risk management and safety checks."
---
## Trading Safety Rules (NON-NEGOTIABLE)
1. NEVER place a market order without a stop-loss
2. ALWAYS enforce max position size limits at engine level
3. ALWAYS implement circuit breakers — halt trading if drawdown exceeds threshold
4. NEVER trust client-side order validation alone — validate server-side AND engine-side
5. ALL trade executions must be logged with: timestamp, symbol, side, qty, price, order_type, strategy_id
6. Paper trade FIRST — all new strategies run in sandbox/paper mode before live
7. Rate limit ALL Alpaca API calls (max 200/min for trading, 5/min for account)
8. Implement kill switch — ability to cancel all open orders and flatten all positions instantly
9. NEVER store Alpaca/Paystack keys in code — .env only
10. ALL monetary calculations use Decimal, NEVER float