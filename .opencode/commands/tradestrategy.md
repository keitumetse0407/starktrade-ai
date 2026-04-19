---
description: "Plan and implement a new trading strategy safely"
---
MANDATORY WORKFLOW for new trading strategies:

1. @architect: Design the strategy interface, data flow, and risk parameters
2. @test-engineer: Write tests FIRST including edge cases (partial fills, market gaps, zero liquidity)
3. Build the strategy implementation in engine/ following existing patterns
4. @security-auditor: Verify no unauthorized trade execution paths
5. Add paper trading mode flag — MUST default to paper mode
6. Add kill switch integration
7. Run backtest against historical data
8. Document the strategy in engine/README.md