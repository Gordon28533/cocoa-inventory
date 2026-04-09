#!/bin/bash

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/cocoa-inventory}"
APP_DIR="${APP_DIR:-/opt/cocoa-inventory}"
DB_NAME="${DB_NAME:-CMC_Inventory}"
DB_USER="${DB_USER:-cocoa_user}"
DB_PASS="${DB_PASS:-your_secure_password}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting backup process..."

echo "Creating database backup..."
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/database_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/database_$TIMESTAMP.sql"

echo "Creating application backup..."
tar -czf "$BACKUP_DIR/app_$TIMESTAMP.tar.gz" \
    --exclude='node_modules' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='*.log' \
    "$APP_DIR"

echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "app_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Backup completed successfully."
echo "Backup size: $BACKUP_SIZE"
echo "Backup location: $BACKUP_DIR"
echo "Retention: $RETENTION_DAYS days"
