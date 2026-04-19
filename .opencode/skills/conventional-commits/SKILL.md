---
name: conventional-commits
description: "Conventional commit message format."
---
## Format: `type(scope): description`
Scopes: frontend, backend, engine, trading-engine, agents, docker, ci
Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
Examples:
- `feat(backend): add Alpaca order placement endpoint`
- `fix(trading-engine): handle partial fill race condition`
- `test(engine): add backtest for mean reversion strategy`
- `chore(docker): optimize backend Dockerfile layer caching`