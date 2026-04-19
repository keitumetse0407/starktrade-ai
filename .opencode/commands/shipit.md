---
description: "Test all services, lint, commit, push"
---
1. Run frontend checks: `cd frontend && npm run lint && npm run typecheck`
2. Run backend tests: `docker-compose exec backend pytest`
3. Run trading engine tests: `cd trading-engine && go test ./... && go vet ./...`
4. If anything fails, fix it
5. Stage all changes: `git add -A`
6. Create conventional commit message based on changes (use conventional-commits skill)
7. Push to current branch