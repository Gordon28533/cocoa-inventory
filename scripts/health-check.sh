#!/bin/bash

# Cocoa Inventory System - Health Check Script
# This script monitors application health and sends alerts if issues are detected

set -e

# Configuration
APP_URL="http://localhost:5000/health"
DB_NAME="cocoa_inventory_prod"
DB_USER="cocoa_user"
DB_PASS="your_secure_password"
LOG_FILE="/var/log/cocoa-health.log"
ALERT_EMAIL="admin@company.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    # Uncomment to send email alerts
    # echo "$message" | mail -s "Cocoa Inventory Alert" "$ALERT_EMAIL"
}

echo "🏥 Starting health check..."

# Check if PM2 is running
if ! pm2 list | grep -q "cocoa-backend"; then
    send_alert "PM2 process cocoa-backend is not running!"
    echo -e "${RED}❌ PM2 process not found${NC}"
else
    echo -e "${GREEN}✅ PM2 process is running${NC}"
fi

# Check application health endpoint
if curl -f -s "$APP_URL" > /dev/null; then
    echo -e "${GREEN}✅ Application health check passed${NC}"
else
    send_alert "Application health check failed!"
    echo -e "${RED}❌ Application health check failed${NC}"
fi

# Check database connection
if mysql -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    send_alert "Database connection failed!"
    echo -e "${RED}❌ Database connection failed${NC}"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    send_alert "Disk usage is high: ${DISK_USAGE}%"
    echo -e "${YELLOW}⚠️  Disk usage: ${DISK_USAGE}%${NC}"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Disk usage: ${DISK_USAGE}%${NC}"
else
    echo -e "${GREEN}✅ Disk usage: ${DISK_USAGE}%${NC}"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    send_alert "Memory usage is high: ${MEMORY_USAGE}%"
    echo -e "${YELLOW}⚠️  Memory usage: ${MEMORY_USAGE}%${NC}"
else
    echo -e "${GREEN}✅ Memory usage: ${MEMORY_USAGE}%${NC}"
fi

# Check if port 5000 is listening
if netstat -tuln | grep -q ":5000 "; then
    echo -e "${GREEN}✅ Port 5000 is listening${NC}"
else
    send_alert "Port 5000 is not listening!"
    echo -e "${RED}❌ Port 5000 is not listening${NC}"
fi

# Check recent error logs
ERROR_COUNT=$(pm2 logs cocoa-backend --lines 100 2>/dev/null | grep -i "error\|exception\|failed" | wc -l)
if [ "$ERROR_COUNT" -gt 10 ]; then
    send_alert "High number of errors in recent logs: $ERROR_COUNT"
    echo -e "${YELLOW}⚠️  Recent errors: $ERROR_COUNT${NC}"
else
    echo -e "${GREEN}✅ Recent errors: $ERROR_COUNT${NC}"
fi

echo "🏥 Health check completed!" 