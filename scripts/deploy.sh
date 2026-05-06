#!/bin/bash
# StarkTrade AI - One-command deployment (Tony Stark style)
# Usage: ./scripts/deploy.sh [production|staging]

set -euo pipefail

ENV="${1:-production}"
echo "🚀 Deploying StarkTrade AI to $ENV..."

# Check required env vars
if [ ! -f .env ]; then
    echo "❌ .env file not found! Copy .env.example and configure it."
    exit 1
fi

# Pull latest code
echo "📦 Pulling latest code..."
git pull origin main

# Build and start all services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.yml -f infra/docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services..."
sleep 10

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Verify
echo "✅ Verifying deployment..."
curl -sf http://localhost:8000/health || echo "⚠️  Backend health check failed"
curl -sf http://localhost:3000 || echo "⚠️  Frontend health check failed"
curl -sf http://localhost:8081/healthz || echo "⚠️  Trading engine health check failed"

echo "🎉 Deployment complete! StarkTrade AI is live."
