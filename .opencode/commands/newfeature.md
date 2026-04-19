---
description: "Full feature development lifecycle"
---
Complete feature development workflow:

1. /planfirst — Create the plan
2. Implement backend endpoint (FastAPI + Pydantic models + Celery task if async)
3. Run backend tests
4. Implement frontend UI (Server Components first, Client only if interactive)
5. Run frontend lint + typecheck
6. If trading-related: implement Go handler + trading safety checks
7. @code-reviewer: Review all changes
8. @security-auditor: Audit if touches auth/payments/trading
9. Update .env.example if new env vars added
10. /shipit