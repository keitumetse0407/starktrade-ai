# StarkTrade AI — Deployment Guide

## Quick Deploy (15 minutes to production)

### Prerequisites
- GitHub account
- Vercel account (free)
- Railway account (free)
- Sentry account (optional, free tier)

---

## 1. Push to GitHub

```bash
cd ~/starktrade-ai
git init
git add .
git commit -m "Initial commit — StarkTrade AI v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/starktrade-ai.git
git push -u origin main
```

---

## 2. Deploy Backend (Railway)

### Option A: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Add PostgreSQL
railway add --database postgres

# Add Redis
railway add --database redis

# Set environment variables
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set OPENAI_API_KEY=sk-your-key-here
railway variables set DEBUG=false
railway variables set ENVIRONMENT=production

# Deploy
railway up
```

### Option B: Railway Dashboard
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `starktrade-ai` repo
4. Set root directory to `/backend`
5. Add PostgreSQL database (click "New" → "Database" → "PostgreSQL")
6. Add Redis database (click "New" → "Database" → "Redis")
7. Set environment variables in Settings → Variables:
   - `SECRET_KEY` = (generate with `openssl rand -hex 32`)
   - `OPENAI_API_KEY` = sk-your-key-here
   - `DEBUG` = false
   - `ENVIRONMENT` = production
   - `DATABASE_URL` = (Railway auto-injects this)
   - `REDIS_URL` = (Railway auto-injects this)

8. Your backend URL: `https://starktrade-ai-backend.railway.app`

---

## 3. Deploy Frontend (Vercel)

### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://starktrade-ai-backend.railway.app

vercel env add NEXT_PUBLIC_WS_URL production
# Enter: wss://starktrade-ai-backend.railway.app/api/v1/ws
```

### Option B: Vercel Dashboard
1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your `starktrade-ai` repo
4. Set root directory to `/frontend`
5. Framework preset: Next.js
6. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://starktrade-ai-backend.railway.app`
   - `NEXT_PUBLIC_WS_URL` = `wss://starktrade-ai-backend.railway.app/api/v1/ws`
7. Click "Deploy"

8. Your frontend URL: `https://starktrade-ai.vercel.app`

---

## 4. Update CORS Settings

After deploying, update the backend CORS to allow your Vercel domain:

Edit `backend/app/main.py`:
```python
allow_origins=[
    "http://localhost:3000",
    "https://starktrade-ai.vercel.app",  # Your Vercel URL
    "https://starktrade.ai",              # Your custom domain
],
```

---

## 5. Set Up Sentry (Optional)

1. Go to https://sentry.io
2. Create project: "starktrade-ai-frontend" (Next.js)
3. Create project: "starktrade-ai-backend" (Python/FastAPI)
4. Copy DSN keys

### Frontend (Vercel)
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Backend (Railway)
```
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 6. Custom Domain (Optional)

### Vercel
1. Go to your project → Settings → Domains
2. Add `starktrade.ai`
3. Update DNS records as instructed

### Railway
1. Go to your project → Settings → Domains
2. Add `api.starktrade.ai`
3. Update DNS records as instructed

---

## 7. Run Migrations

```bash
# Via Railway CLI
railway run alembic upgrade head

# Or via Railway dashboard
# Go to your service → Settings → Deploy → Start Command:
# alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION SETUP                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Vercel (Free)   │         │  Railway (Free)  │          │
│  │  ──────────────  │         │  ──────────────  │          │
│  │  Next.js 14      │────────▶│  FastAPI         │          │
│  │  React 19        │   API   │  LangGraph       │          │
│  │  Tailwind CSS    │         │  HRM Engine      │          │
│  │  Recharts        │◀────────│  WebSocket       │          │
│  │  Sentry          │   WS    │  Sentry          │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                        │                     │
│                                        ▼                     │
│                          ┌──────────────────────┐            │
│                          │  Railway Add-ons     │            │
│                          │  ──────────────────  │            │
│                          │  PostgreSQL 16       │            │
│                          │  Redis 7             │            │
│                          └──────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Costs

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth, unlimited projects | $20/mo Pro |
| Railway | $5 credit/month (enough for MVP) | $10-20/mo |
| Sentry | 5K errors/month, 1 user | $26/mo Team |
| **Total** | **$0/month for MVP** | ~$50/month at scale |

---

## Monitoring

After deployment, monitor:
- Vercel Dashboard: https://vercel.com/dashboard
- Railway Dashboard: https://railway.app/dashboard
- Sentry Dashboard: https://sentry.io
- Backend Health: https://starktrade-ai-backend.railway.app/api/health

---

## Troubleshooting

### "CORS Error"
- Update `allow_origins` in `backend/app/main.py` with your Vercel URL

### "Database connection failed"
- Check Railway PostgreSQL is running
- Verify `DATABASE_URL` is set correctly

### "WebSocket connection failed"
- Ensure `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
- Check Railway logs for errors

### "Build failed on Vercel"
- Check `next.config.js` has `output: 'standalone'`
- Verify all dependencies are in `package.json`
