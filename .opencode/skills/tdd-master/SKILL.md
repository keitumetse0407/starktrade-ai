---
name: tdd-master
description: "Test-Driven Development workflow."
---
## TDD Workflow
1. Write the failing test FIRST
2. Run test — confirm FAIL
3. Write MINIMUM code to pass
4. Run test — confirm PASS
5. Refactor keeping tests green
6. Frontend tests: `cd frontend && npm test`
7. Backend tests: `docker-compose exec backend pytest`
8. Trading engine: `cd trading-engine && go test ./...`