#!/bin/bash

# Cocoa Inventory System - Installation Wizard
# Interactive setup script for easy deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                Cocoa Inventory System                        ║"
echo "║                    Installation Wizard                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$var_name=\${input:-$default}"
    else
        read -p "$prompt: " input
        eval "$var_name=\"$input\""
    fi
}

# Function to prompt for password
prompt_password() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " password
    echo
    eval "$var_name=\"$password\""
}

echo -e "${YELLOW}Welcome to the Cocoa Inventory System installation wizard!${NC}"
echo "This script will help you set up the system on your server."
echo

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ first.${NC}"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ npm found${NC}"
fi

# Check MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL client not found. You'll need to install MySQL separately.${NC}"
else
    echo -e "${GREEN}✅ MySQL client found${NC}"
fi

echo

# Database configuration
echo -e "${BLUE}Database Configuration${NC}"
echo "Please provide your MySQL database details:"

prompt_input "Database host" "localhost" "DB_HOST"
prompt_input "Database name" "cocoa_inventory_prod" "DB_NAME"
prompt_input "Database user" "cocoa_user" "DB_USER"
prompt_password "Database password" "DB_PASS"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Server configuration
echo
echo -e "${BLUE}Server Configuration${NC}"
prompt_input "Server port" "5000" "PORT"
prompt_input "Environment" "production" "NODE_ENV"

# Create .env file
echo
echo -e "${BLUE}Creating environment file...${NC}"

cat > .env << EOF
# Production Environment Variables
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
PORT=$PORT
NODE_ENV=$NODE_ENV
EOF

echo -e "${GREEN}✅ Environment file created${NC}"

# Install dependencies
echo
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Build frontend
echo
echo -e "${BLUE}Building frontend...${NC}"
npm run build

# Install backend dependencies
echo
echo -e "${BLUE}Installing backend dependencies...${NC}"
cd Backend
npm install
cd ..

# Install PM2
echo
echo -e "${BLUE}Installing PM2 process manager...${NC}"
npm install -g pm2

# Test database connection
echo
echo -e "${BLUE}Testing database connection...${NC}"
if mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -e "SELECT 1;" "$DB_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your database credentials and try again."
    exit 1
fi

# Start application
echo
echo -e "${BLUE}Starting application...${NC}"
cd Backend
pm2 start server.js --name cocoa-backend --env production
cd ..

# Save PM2 configuration
pm2 save

# Create startup script
echo
echo -e "${BLUE}Setting up PM2 startup...${NC}"
pm2 startup

echo
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Installation Complete!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}Your Cocoa Inventory System is now running!${NC}"
echo
echo -e "${YELLOW}Access your application at:${NC}"
echo "  http://localhost:$PORT"
echo
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 status                    - Check application status"
echo "  pm2 logs cocoa-backend        - View application logs"
echo "  pm2 restart cocoa-backend     - Restart application"
echo "  pm2 stop cocoa-backend        - Stop application"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Access the application and create your first admin user"
echo "  2. Configure your firewall to allow access to port $PORT"
echo "  3. Set up regular backups using scripts/backup.sh"
echo "  4. Set up monitoring using scripts/health-check.sh"
echo
echo -e "${GREEN}Thank you for using Cocoa Inventory System!${NC}" 