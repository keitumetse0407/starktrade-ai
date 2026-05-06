#!/bin/bash
# StarkTrade AI - Remote Backup Script (Tony Stark grade)
# Uploads DB backups to S3/Backblaze B2 for bulletproof disaster recovery
# Usage: ./scripts/backup-remote.sh
# Prereq: Set REMOTE_* vars in .env file

set -euo pipefail

cd /root/starktrade-ai
source .env 2>/dev/null || true

# Configuration (set these in .env)
REMOTE_PROVIDER="${REMOTE_BACKUP_PROVIDER:-b2}"  # b2 or s3
B2_BUCKET="${B2_BUCKET:-}"
B2_KEY_ID="${B2_KEY_ID:-}"
B2_APP_KEY="${B2_APP_KEY:-}"
S3_BUCKET="${S3_BUCKET:-}"
S3_ACCESS_KEY="${S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${S3_SECRET_KEY:-}"
S3_ENDPOINT="${S3_ENDPOINT:-https://s3.amazonaws.com}"

BACKUP_DIR="/root/starktrade-ai/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/root/starktrade-ai/backups/remote-backup.log"

log() { echo "[$(date)] $1" | tee -a "$LOG_FILE"; }

log "🚀 Starting remote backup..."

# Check if we have local backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1 || echo "")
if [ -z "$LATEST_BACKUP" ]; then
    log "❌ No local backup found. Running local backup first..."
    /root/starktrade-ai/scripts/backup-db.sh
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1 || echo "")
fi

if [ -z "$LATEST_BACKUP" ]; then
    log "❌ ERROR: No backup available!"
    exit 1
fi

FILENAME=$(basename "$LATEST_BACKUP")
log "📦 Backing up: $FILENAME"

# Upload based on provider
case "$REMOTE_PROVIDER" in
    b2)
        if [ -z "$B2_BUCKET" ] || [ -z "$B2_KEY_ID" ]; then
            log "❌ B2 credentials not configured. Set B2_BUCKET, B2_KEY_ID, B2_APP_KEY in .env"
            exit 1
        fi
        log "☁️  Uploading to Backblaze B2..."
        # Install B2 CLI if needed
        pip3 install b2 2>/dev/null || python3 -m pip install b2 2>/dev/null
        export B2_ACCOUNT_ID="$B2_KEY_ID"
        export B2_APPLICATION_KEY="$B2_APP_KEY"
        b2 upload-file "$B2_BUCKET" "$LATEST_BACKUP" "starktrade/backups/$FILENAME" 2>&1 | tee -a "$LOG_FILE"
        log "✅ Uploaded to B2: $FILENAME"
        ;;
    s3)
        if [ -z "$S3_BUCKET" ] || [ -z "$S3_ACCESS_KEY" ]; then
            log "❌ S3 credentials not configured. Set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY in .env"
            exit 1
        fi
        log "☁️  Uploading to S3..."
        # Install AWS CLI if needed
        pip3 install awscli 2>/dev/null || python3 -m pip install awscli 2>/dev/null
        export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY"
        export AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
        aws --endpoint-url "$S3_ENDPOINT" s3 cp "$LATEST_BACKUP" "s3://${S3_BUCKET}/starktrade/backups/$FILENAME" 2>&1 | tee -a "$LOG_FILE"
        log "✅ Uploaded to S3: $FILENAME"
        ;;
    *)
        log "❌ Unknown provider: $REMOTE_PROVIDER. Use 'b2' or 's3'"
        exit 1
        ;;
esac

# Cleanup old remote backups (keep 30 days)
log "🧹 Cleaning up old remote backups..."
if [ "$REMOTE_PROVIDER" = "b2" ]; then
    b2 ls "b2://${B2_BUCKET}/starktrade/backups/" 2>/dev/null | while read -r line; do
        FILE_DATE=$(echo "$line" | grep -oP '\d{8}' | head -1)
        if [ -n "$FILE_DATE" ]; then
            DAYS_OLD=$(( ($(date +%s) - $(date -d "$FILE_DATE" +%s 2>/dev/null || echo $(date +%s))) / 86400 ))
            if [ "$DAYS_OLD" -gt 30 ]; then
                b2 delete-file-version "$B2_BUCKET" "$line" 2>/dev/null || true
            fi
        fi
    done
fi

log "🎉 Remote backup complete!"
