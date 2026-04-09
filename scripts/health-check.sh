#!/bin/bash

set -euo pipefail

APP_NAME="${APP_NAME:-cocoa-inventory}"
APP_URL="${APP_URL:-http://127.0.0.1:5000}"
LOG_FILE="${LOG_FILE:-/var/log/cocoa-inventory-health.log}"
SMOKE_STAFF_NAME="${SMOKE_STAFF_NAME:-}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-}"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

echo "Starting health check for ${APP_NAME}..."

if pm2 list | grep -q "$APP_NAME"; then
    log_message "PM2 process ${APP_NAME} is running"
else
    log_message "PM2 process ${APP_NAME} is not running"
    exit 1
fi

if curl -fsS "${APP_URL}/health" >/dev/null; then
    log_message "Health endpoint is reachable"
else
    log_message "Health endpoint check failed"
    exit 1
fi

if [ -n "$SMOKE_STAFF_NAME" ] && [ -n "$SMOKE_PASSWORD" ]; then
    if node scripts/smoke-startup.mjs --url "$APP_URL" --staff-name "$SMOKE_STAFF_NAME" --password "$SMOKE_PASSWORD"; then
        log_message "Startup smoke login passed"
    else
        log_message "Startup smoke login failed"
        exit 1
    fi
else
    if node scripts/smoke-startup.mjs --url "$APP_URL" --skip-login; then
        log_message "Startup smoke health check passed without login"
    else
        log_message "Startup smoke health check failed"
        exit 1
    fi
fi

log_message "Health check completed successfully"
