#!/bin/bash
# StarkTrade AI — Quick Start Script
set -e

cd "$(dirname "$0")"

echo "============================================"
echo "  StarkTrade AI — Starting Up"
echo "============================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "No .env file found. Creating from template..."
    cp .env.example .env

    # Generate secret key
    SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')
    sed -i "s/change-me-generate-with-openssl-rand-hex-32/$SECRET/" .env

    echo ""
    echo ">> .env created with random SECRET_KEY"
    echo ">> You MUST add your OPENAI_API_KEY to .env before starting"
    echo ""
    echo "Edit .env now and add: OPENAI_API_KEY=sk-your-key-here"
    echo ""
    read -p "Press Enter to continue (or Ctrl+C to edit .env first)..."
fi

# Check for OPENAI_API_KEY
if ! grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo ""
    echo "WARNING: OPENAI_API_KEY not set in .env"
    echo "The AI agents won't work without it."
    echo ""
fi

echo "Starting all services with Docker Compose..."
docker-compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 15

echo ""
echo "============================================"
echo "  StarkTrade AI is running!"
echo "============================================"
echo ""
echo "  Frontend:      http://localhost:3000"
echo "  Dashboard:     http://localhost:3000/dashboard"
echo "  Admin Panel:   http://localhost:3000/admin"
echo "  API Docs:      http://localhost:8000/api/docs"
echo "  API Health:    http://localhost:8000/api/health"
echo ""
echo "============================================"
echo "  GET STARTED"
echo "============================================"
echo ""
echo "  1. Go to http://localhost:3000/onboarding"
echo "  2. Create your account"
echo "     - You are automatically ADMIN (first user)"
echo "     - $100K paper trading balance auto-created"
echo "  3. Take the risk quiz"
echo "  4. Launch Dashboard"
echo ""
echo "  To add more admins:"
echo "     - Register them at /onboarding"
echo "     - Use Admin Panel → Users to promote them"
echo ""
echo "============================================"
echo "  HRM ARCHITECTURE"
echo "============================================"
echo ""
echo "  System 2 (Strategic): Market regime detection"
echo "  System 1 (Tactical):  7 parallel AI agents"
echo "  Feedback Loop:        Continuous learning"
echo ""
echo "============================================"
