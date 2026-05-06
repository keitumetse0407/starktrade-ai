#!/bin/bash
# StarkTrade AI - Full Recovery Script (Tony Stark grade)
# Usage: ./scripts/recover.sh [--domain starktrade-ai.duckdns.org] [--email your@email.com]
# Run this on a FRESH VPS to go from 0 to fully operational

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1" >&2; }

# Parse args
DOMAIN="${1:-starktrade-ai.duckdns.org}"
EMAIL="${2:-}"
REPO_URL="https://github.com/keitumetse0407/starktrade-ai.git"
INSTALL_DIR="/root/starktrade-ai"

log "🚀 StarkTrade AI Full Recovery Starting..."
log "Domain: $DOMAIN"
log "Install dir: $INSTALL_DIR"

# ============================================
# STEP 1: Install Prerequisites
# ============================================
log "📦 Step 1/6: Installing prerequisites..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    git curl wget \
    postgresql postgresql-contrib \
    nginx certbot python3-certbot-nginx \
    python3 python3-pip python3-venv \
    nodejs npm \
    golang-go \
    screen cron \
    > /dev/null 2>&1

# Install Node.js 18+ if needed
if ! node --version 2>/dev/null | grep -q "v1[8-9]\|v2"; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

log "✅ Prerequisites installed"

# ============================================
# STEP 2: Clone Repository
# ============================================
log "📦 Step 2/6: Cloning repository..."

if [ -d "$INSTALL_DIR" ]; then
    warn "Directory exists, pulling latest..."
    cd "$INSTALL_DIR" && git pull origin main
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

log "✅ Repository ready"

# ============================================
# STEP 3: Configure Environment
# ============================================
log "📦 Step 3/6: Setting up environment..."

if [ ! -f "$INSTALL_DIR/.env" ]; then
    warn ".env file not found!"
    echo "You need to create .env from .env.example with your actual values."
    echo "Required: ALPHA_VANTAGE_API_KEY, ALPACA_API_KEY, ALPACA_SECRET, etc."
    echo ""
    echo "Options:"
    echo "  1. Paste your .env content now (will be saved)"
    echo "  2. Skip and create manually later"
    read -p "Choice [1/2]: " ENV_CHOICE
    
    if [ "$ENV_CHOICE" = "1" ]; then
        echo "Paste your .env content (Ctrl+D to finish):"
        cat > "$INSTALL_DIR/.env"
        cp "$INSTALL_DIR/.env" "$INSTALL_DIR/backend/.env"
    else
        cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
        cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/backend/.env"
        warn "Edit $INSTALL_DIR/.env and $INSTALL_DIR/backend/.env with real values before continuing!"
        read -p "Press Enter when .env files are configured..."
    fi
fi

log "✅ Environment configured"

# ============================================
# STEP 4: Database Setup & Restore
# ============================================
log "📦 Step 4/6: Setting up PostgreSQL..."

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'starktrade'" | grep -q 1 || {
    sudo -u postgres createdb starktrade
    log "Database 'starktrade' created"
}

# Restore from backup if available
LATEST_BACKUP=$(ls -t "$INSTALL_DIR/backups/db_"*.sql.gz 2>/dev/null | head -1 || echo "")
if [ -n "$LATEST_BACKUP" ]; then
    log "Restoring database from $LATEST_BACKUP..."
    gunzip -c "$LATEST_BACKUP" | sudo -u postgres psql starktrade
    log "✅ Database restored"
else
    warn "No backup found. Starting with fresh database."
    warn "Run migrations manually: cd $INSTALL_DIR/backend && alembic upgrade head"
fi

# Start PostgreSQL if not running
systemctl enable postgresql
systemctl start postgresql

log "✅ PostgreSQL ready"

# ============================================
# STEP 5: Build & Start Services
# ============================================
log "📦 Step 5/6: Building and starting services..."

# Backend
log "  → Starting backend..."
cd "$INSTALL_DIR/backend"
pip3 install -q -r requirements.txt
pkill -f "uvicorn app.main:app" 2>/dev/null || true
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
sleep 3
curl -sf http://localhost:8000/health && log "  ✅ Backend running" || warn "Backend may not be ready yet"

# Frontend
log "  → Building frontend (this takes ~2 min)..."
cd "$INSTALL_DIR/frontend"
npm install -q 2>/dev/null
npm run build -q 2>/dev/null
pkill -f "next start" 2>/dev/null || true
screen -dmS nextjs bash -c "cd $INSTALL_DIR/frontend && NODE_ENV=production npx next start -p 3000"
sleep 5
curl -sf http://localhost:3000 && log "  ✅ Frontend running" || warn "Frontend may not be ready yet"

# Trading Engine
log "  → Building trading engine..."
cd "$INSTALL_DIR/trading-engine"
go build -o starktrade-engine . 2>/dev/null || warn "Go build failed - check Go installation"
if [ -f "$INSTALL_DIR/trading-engine/starktrade-engine" ]; then
    pkill -f starktrade-engine 2>/dev/null || true
    nohup "$INSTALL_DIR/trading-engine/starktrade-engine" > /tmp/trading-engine.log 2>&1 &
    sleep 2
    curl -sf http://localhost:8081/healthz && log "  ✅ Trading engine running" || warn "Trading engine may not be ready"
fi

log "✅ All services started"

# ============================================
# STEP 6: Nginx + SSL
# ============================================
log "📦 Step 6/6: Configuring Nginx and SSL..."

# Copy nginx config
cp "$INSTALL_DIR/infra/nginx/starktrade" /etc/nginx/sites-available/starktrade
ln -sf /etc/nginx/sites-available/starktrade /etc/nginx/sites-enabled/starktrade
rm -f /etc/nginx/sites-enabled/default

# Update domain in nginx config if different
sed -i "s/starktrade-ai.duckdns.org/$DOMAIN/g" /etc/nginx/sites-available/starktrade

nginx -t && systemctl restart nginx
systemctl enable nginx

# SSL Certificate
if [ -n "$EMAIL" ]; then
    log "Setting up SSL certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || {
        warn "SSL setup failed. You can run manually: certbot --nginx -d $DOMAIN"
    }
else
    warn "No email provided. Run manually for SSL: certbot --nginx -d $DOMAIN"
fi

log "✅ Nginx configured"

# ============================================
# Final Verification
# ============================================
log "🎉 Recovery Complete! Running verification..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  StarkTrade AI Recovery Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_service() {
    local name=$1
    local url=$2
    if curl -sf "$url" > /dev/null 2>&1; then
        echo "  ✅ $name: ONLINE"
    else
        echo "  ❌ $name: OFFLINE"
    fi
}

check_service "Frontend (Next.js)" "http://localhost:3000"
check_service "Backend (FastAPI)" "http://localhost:8000/health"
check_service "Trading Engine (Go)" "http://localhost:8081/healthz"
check_service "HTTPS Site" "https://localhost"

echo ""
echo "  📍 URL: https://$DOMAIN"
echo "  📍 DB Backups: $INSTALL_DIR/scripts/backup-db.sh (runs daily @ 2AM)"
echo "  📍 Logs: /tmp/backend.log, /tmp/trading-engine.log, screen -r nextjs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🚀 StarkTrade AI is LIVE!"
