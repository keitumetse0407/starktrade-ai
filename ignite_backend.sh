#!/bin/bash
# STARKTRADE BACKEND IGNITION SCRIPT
# Run: sudo bash ignite_backend.sh

set -e

echo "🛢️ STARKTRADE BACKEND IGNITION..."

# PHASE 1: Install databases
echo "📦 Installing PostgreSQL and Redis..."
apt-get update
apt-get install -y postgresql postgresql-contrib redis-server

# PHASE 2: Configure PostgreSQL
echo "🗄️ Configuring PostgreSQL..."
service postgresql start

# Create database and user
su - postgres -c "psql -c \"CREATE USER stark_admin WITH PASSWORD 'StarkTrade2026!_DB';\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE DATABASE starktrade OWNER stark_admin;\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE starktrade TO stark_admin;\"" 2>/dev/null || true

echo "✅ PostgreSQL ready: starktrade"

# PHASE 3: Configure Redis
echo "🔴 Starting Redis..."
service redis-server start
redis-cli ping >/dev/null 2>&1 && echo "✅ Redis running" || echo "⚠️ Redis may need config"

# PHASE 4: Environment Variables
echo "📝 Generating .env file..."

cat > /var/www/starktrade-ai/backend/.env << 'EOF'
# DATABASE
DATABASE_URL=postgresql+asyncpg://stark_admin:StarkTrade2026!_DB@localhost:5432/starktrade

# REDIS
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# CORE
SECRET_KEY=fc70f868987f17b846593b20480978e4c5addaf7a2c29473122de5eb972d5024
ENVIRONMENT=production
DEBUG=false

# DISCORD - GET YOUR WEBHOOK FROM DISCORD SERVER SETTINGS
DISCORD_WEBHOOK_URL=YOUR_WEBHOOK_HERE

# TELEGRAM (OPTIONAL)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ALPACA PAPER TRADING (OPTIONAL)
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# OPENAI
OPENAI_API_KEY=

# PAYFAST
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
EOF

echo "✅ .env created at /var/www/starktrade-ai/backend/.env"

# PHASE 5: Backend dependencies
echo "📦 Installing Python dependencies..."
cd /var/www/starktrade-ai/backend

# Create venv if not exists
[ ! -d "venv" ] && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# PHASE 6: Daemonize with PM2
echo "🚀 Starting FastAPI with PM2..."
pm2 start "source /var/www/starktrade-ai/backend/venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000" --name "stark-api"
pm2 save

echo ""
echo "🩸 IGNITION COMPLETE!"
echo "✅ API running at http://185.167.97.193:8000"
echo "📝 NEXT: Add your Discord Webhook to .env"
echo "   nano /var/www/starktrade-ai/backend/.env"