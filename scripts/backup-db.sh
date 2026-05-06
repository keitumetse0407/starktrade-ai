#!/bin/bash
# StarkTrade AI - Database Backup Script (Tony Stark grade)
set -euo pipefail

BACKUP_DIR="/root/starktrade-ai/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="starktrade"
DB_USER="starktrade"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Native Postgres backup
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Verify backup
if [ -s "$BACKUP_DIR/db_${DATE}.sql.gz" ]; then
    SIZE=$(du -h "$BACKUP_DIR/db_${DATE}.sql.gz" | cut -f1)
    echo "[$(date)] Backup successful: db_${DATE}.sql.gz ($SIZE)"
else
    echo "[$(date)] ERROR: Backup failed or empty!" >&2
    exit 1
fi

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete

echo "[$(date)] Backup complete. Retention: 7 days."
