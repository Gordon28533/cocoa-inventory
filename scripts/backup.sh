#!/bin/bash

# Cocoa Inventory System - Backup Script
# This script creates database and file backups with automatic rotation

set -e

# Configuration
BACKUP_DIR="/opt/backups/cocoa-inventory"
DB_NAME="cocoa_inventory_prod"
DB_USER="cocoa_user"
DB_PASS="your_secure_password"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔄 Starting backup process..."

# Database backup
echo "📊 Creating database backup..."
mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_DIR/database_$TIMESTAMP.sql"

# Compress database backup
gzip "$BACKUP_DIR/database_$TIMESTAMP.sql"

# Application files backup (excluding node_modules and build)
echo "📁 Creating application backup..."
tar -czf "$BACKUP_DIR/app_$TIMESTAMP.tar.gz" \
    --exclude='node_modules' \
    --exclude='build' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='*.log' \
    /opt/cocoa-inventory

# Clean up old backups
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "app_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Create backup report
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "✅ Backup completed successfully!"
echo "📊 Backup size: $BACKUP_SIZE"
echo "📅 Backup location: $BACKUP_DIR"
echo "🗓️  Retention: $RETENTION_DAYS days"

# Optional: Send backup report via email
# echo "Backup completed: $BACKUP_SIZE" | mail -s "Cocoa Inventory Backup Report" admin@company.com 