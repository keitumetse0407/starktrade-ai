---
description: "Create a detailed plan before building anything"
agent: plan
---
Create a detailed implementation plan:

1. **What** — Requirements and acceptance criteria
2. **Where** — Which services are affected (frontend/backend/trading-engine/engine)?
3. **How** — Technical approach, patterns to use
4. **Data** — Schema changes needed? New env vars? New API calls?
5. **Risk** — What could break? Trading safety implications?
6. **Tests** — What tests are needed?
7. **Order** — Implementation sequence (what depends on what?)
8. **Docker** — Any docker-compose or Dockerfile changes?

Save plan to `.opencode/plans/current-plan.md`
Then say: "Ready to build? Use @build to implement this plan."