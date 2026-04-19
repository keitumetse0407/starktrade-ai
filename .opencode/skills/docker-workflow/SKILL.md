---
name: docker-workflow
description: "Docker Compose patterns for this multi-service stack."
---
## Docker Rules for StarkTrade
1. Backend commands: `docker-compose exec backend <cmd>` (NEVER run bare python/pip)
2. Migrations: `docker-compose exec backend alembic upgrade head`
3. New Python deps: add to requirements.txt, then `docker-compose build backend`
4. New Node deps: `cd frontend && npm install <pkg>` (frontend runs outside Docker for dev)
5. Trading engine: `docker-compose exec trading-engine <cmd>`
6. View logs: `docker-compose logs -f <service>`
7. Restart single service: `docker-compose restart <service>`
8. Full rebuild: `docker-compose down && docker-compose up -d --build`
9. Database reset: `docker-compose exec backend alembic downgrade base && docker-compose exec backend alembic upgrade head`