# StarkTrade AI — Migration Guide

> VPS stays as production server (`starktrade-ai.duckdns.org`)
> Your laptop becomes the dev machine — edit code, push to GitHub, deploy to VPS

---

## Prerequisites

| Tool         | Version     | Install                                                      |
|-------------|-------------|--------------------------------------------------------------|
| Node.js     | 20+         | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash - && sudo apt install -y nodejs` |
| Python      | 3.11+       | `sudo apt install -y python3.11 python3.11-venv python3-pip` |
| Go          | 1.22+       | Download from https://go.dev/dl/                             |
| PostgreSQL  | 12+         | `sudo apt install -y postgresql postgresql-client`           |
| Redis       | any         | `sudo apt install -y redis-server`                           |
| Git         | any         | `sudo apt install -y git`                                    |

---

## 1. Clone the Repo

```sh
git clone https://github.com/keitumetse0407/starktrade-ai.git
cd starktrade-ai
```

---

## 2. Set Up PostgreSQL Database

```sh
sudo -u postgres psql -c "CREATE USER starktrade WITH PASSWORD 'starktrade';"
sudo -u postgres psql -c "CREATE DATABASE starktrade OWNER starktrade;"
sudo -u postgres psql -c "ALTER USER starktrade CREATEDB;"
psql -U starktrade -d starktrade -c "\dt"   # verify
```

**(Optional)** Copy the production database to your laptop:
```sh
scp root@113.30.188.215:/root/starktrade-ai/backups/db_$(date +%Y%m%d)_020001.sql.gz .
gunzip -c db_*.sql.gz | psql -U starktrade -d starktrade
```

---

## 3. Environment Variables

Copy the `.env` file from the VPS (has all the real API keys):

```sh
scp root@113.30.188.215:/root/starktrade-ai/backend/.env backend/.env
```

Or create `backend/.env` manually from `backend/.env.example` and fill in the keys:

```sh
cp backend/.env.example backend/.env
# Then edit backend/.env with your API keys
#   GROQ_API_KEY   → https://console.groq.com/keys
#   ALPACA_*       → https://app.alpaca.markets/paper
#   SECRET_KEY     → any random string
```

For the frontend, copy the example as well:

```sh
cp frontend/.env.example frontend/.env.local
```

---

## 4. Install Dependencies

```sh
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -c "import app; print('Backend OK')"

# Frontend
cd ../frontend
npm install
npm run lint -- --quiet   # verify

# Trading Engine (optional for dev)
cd ../trading-engine
go build -o starktrade-engine .
./starktrade-engine --help
```

---

## 5. Run Everything Locally

Open **5 terminals**:

| Terminal | Command | URL |
|----------|---------|-----|
| **Backend** | `cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` | http://localhost:8000/api/health |
| **Frontend** | `cd frontend && npm run dev -- --port 3000` | http://localhost:3000 |
| **Trading Engine** | `cd trading-engine && ./starktrade-engine` | http://localhost:8081/healthz |
| **Celery Worker** | `cd backend && source venv/bin/activate && celery -A app.services.celery_app worker --loglevel=info --concurrency=2` | — |
| **Celery Beat** | `cd backend && source venv/bin/activate && celery -A app.services.celery_app beat --loglevel=info` | — |

---

## 6. Development Workflow

```sh
# 1. Edit code on laptop (frontend/, backend/, trading-engine/)
# 2. Test locally at http://localhost:3000
# 3. Commit and push:
git add .
git commit -m "your changes"
git push

# 4. Deploy to VPS:
ssh root@113.30.188.215
cd /root/starktrade-ai && git pull
systemctl restart starktrade-backend starktrade-engine celery-worker celery-beat
```

---

## 7. VPS Reference (for info)

| Service | Port | Purpose | Systemd Unit |
|---------|------|---------|-------------|
| Nginx (SSL) | 80/443 | HTTPS proxy | — |
| Backend | 8000 | FastAPI | `starktrade-backend.service` |
| Frontend | 3000 | Next.js 16 | `starktrade-frontend.service` |
| Trading Engine | 8081 | Go binary | `starktrade-engine.service` |
| PostgreSQL | 5432 | Database | — |
| Redis | 6379 | Celery broker | — |
| Celery Worker | — | Background tasks | `celery-worker.service` |
| Celery Beat | — | Scheduler | `celery-beat.service` |

VPS cron: DuckDNS update every 5min, DB backup daily at 2am, health check every 5min.
