# StarkTrade AI - Disaster Recovery Playbook (Tony Stark Grade)

## Quick Recovery (10 minutes)

If VPS is deleted, run on a fresh Ubuntu/Debian server:

```bash
# One-liner recovery
curl -fsSL https://raw.githubusercontent.com/keitumetse0407/starktrade-ai/main/scripts/recover.sh | bash -s -- starktrade-ai.duckdns.org your@email.com
```

Or manually:
```bash
git clone https://github.com/keitumetse0407/starktrade-ai.git
cd starktrade-ai
# Restore .env from password manager!
./scripts/recover.sh
```

---

## What's Automated

| Script | Purpose | Runs |
|--------|---------|------|
| `scripts/recover.sh` | Full system recovery from scratch | Manual |
| `scripts/backup-db.sh` | Daily DB backup (7-day retention) | Daily @ 2AM |
| `scripts/backup-remote.sh` | Remote backup to S3/B2 | After local backup |
| `scripts/monitor.sh` | Health check + alerts | Every 5 min |
| `scripts/deploy.sh` | Deploy updates | Manual |

---

## Systemd Services (Survives Reboot)

```bash
# Enable all services
systemctl enable starktrade-backend
systemctl enable starktrade-frontend
systemctl enable starktrade-engine
systemctl enable postgresql
systemctl enable nginx

# Start all
systemctl start starktrade-backend
systemctl start starktrade-frontend
systemctl start starktrade-engine

# Check status
systemctl status starktrade-backend
systemctl status starktrade-frontend
systemctl status starktrade-engine
```

---

## Remote Backups (Bulletproof)

### Backblaze B2 (Recommended - Cheap)
1. Create B2 account: https://www.backblaze.com/b2/
2. Create bucket: `starktrade-backups`
3. Get API keys
4. Add to `.env`:
   ```
   REMOTE_BACKUP_PROVIDER=b2
   B2_BUCKET=starktrade-backups
   B2_KEY_ID=your-key-id
   B2_APP_KEY=your-app-key
   ```
5. Run: `./scripts/backup-remote.sh`

### AWS S3
Add to `.env`:
```
REMOTE_BACKUP_PROVIDER=s3
S3_BUCKET=starktrade-backups
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

---

## Monitoring & Alerts

Configure in `.env`:
- `DISCORD_WEBHOOK_URL` - Get from Discord Server Settings → Integrations → Webhooks
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` - Create bot via @BotFather

Alerts sent when any service fails:
- Frontend (Next.js)
- Backend (FastAPI)
- Trading Engine (Go)
- PostgreSQL
- Redis

---

## What's Safe on GitHub

✅ All source code
✅ Nginx config (`infra/nginx/starktrade`)
✅ Docker Compose (`infra/docker-compose.prod.yml`)
✅ All automation scripts (`scripts/`)
✅ This disaster recovery playbook

## What's NOT on GitHub (Store Securely!)

⚠️ `.env` files - API keys, secrets (password manager)
⚠️ Database backups - Automatic local + remote backup
⚠️ SSL certificates - Re-issuable via certbot

---

## Recovery Time Objective (RTO)

| Scenario | Time |
|----------|------|
| Fresh VPS, no backups | ~15 min (rebuild + fresh DB) |
| Fresh VPS, with backups | ~10 min (restore DB) |
| Fresh VPS, with remote backups | ~10 min (download + restore) |
| Service crash | ~10 sec (systemd auto-restart) |

---

**Tony Stark would approve.** 🚀
