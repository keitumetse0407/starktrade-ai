---
description: "Full security + code quality + architecture audit of StarkTrade"
---
Run a comprehensive audit of this trading platform:

1. @security-auditor: Scan ALL services for vulnerabilities. Pay special attention to:
   - Alpaca/Paystack API key exposure
   - Trading endpoint authorization
   - Payment flow manipulation
   - JWT token handling
   - SQL injection in backend
   - XSS in frontend

2. @code-reviewer: Review code quality across all 3 languages:
   - Python (backend + engine): type hints, async correctness, Celery usage
   - TypeScript (frontend): type safety, Server vs Client components
   - Go (trading-engine): error handling, goroutine leaks, race conditions

3. @architect: Evaluate inter-service architecture:
   - Are services properly decoupled?
   - Is the trading engine properly isolated from the web layer?
   - Are there single points of failure?

Output a unified report with CRITICAL/HIGH/MEDIUM/LOW ratings and file:line refs.