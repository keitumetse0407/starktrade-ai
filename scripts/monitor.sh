#!/bin/bash
# StarkTrade AI - Health Monitor (Tony Stark grade)
# Checks all services and sends alerts via Discord/Telegram
# Runs every 5 minutes via cron

set -euo pipefail

cd /root/starktrade-ai
source .env 2>/dev/null || true

DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Services to check
declare -A SERVICES=(
    ["Frontend"]="http://localhost:3000"
    ["Backend"]="http://localhost:8000/health"
    ["TradingEngine"]="http://localhost:8081/healthz"
    ["PostgreSQL"]=""
    ["Redis"]=""
)

# Check functions
check_http() {
    curl -sf "$1" > /dev/null 2>&1
}

check_postgres() {
    sudo -u postgres pg_isready > /dev/null 2>&1
}

check_redis() {
    redis-cli ping 2>/dev/null | grep -q PONG
}

# Track failures
FAILED=""
PASSED=""

for SERVICE in "${!SERVICES[@]}"; do
    URL="${SERVICES[$SERVICE]}"
    case "$SERVICE" in
        PostgreSQL) check_postgres && PASSED="$PASSED✅ $SERVICE\n" || FAILED="$FAILED❌ $SERVICE\n" ;;
        Redis) check_redis && PASSED="$PASSED✅ $SERVICE\n" || FAILED="$FAILED❌ $SERVICE\n" ;;
        *) check_http "$URL" && PASSED="$PASSED✅ $SERVICE\n" || FAILED="$FAILED❌ $SERVICE\n" ;;
    esac
done

# Send alert if any failures
if [ -n "$FAILED" ]; then
    MSG="🚨 **StarkTrade AI - Service Alert**
    
**Failed Services:**
$FAILED
**Running Services:**
$PASSED

Time: $(date)
Server: $(hostname)
"

    # Discord
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -s -H "Content-Type: application/json" -X POST \
            -d "{\"content\": \"$MSG\"}" \
            "$DISCORD_WEBHOOK" > /dev/null 2>&1
    fi

    # Telegram
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=$MSG" \
            -d "parse_mode=Markdown" > /dev/null 2>&1
    fi

    echo "Alert sent: $FAILED"
else
    echo "All services OK"
fi
