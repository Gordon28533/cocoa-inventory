@echo off
REM Cocoa Inventory System - Windows Deployment Script
REM Run this script from the project root directory

echo 🚀 Starting Cocoa Inventory deployment...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo ❌ Error: .env file not found. Please create it with your production settings.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Build frontend
echo 🔨 Building frontend...
call npm run build

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd Backend
call npm install
cd ..

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing PM2...
    call npm install -g pm2
)

REM Stop existing PM2 process if running
echo 🛑 Stopping existing processes...
pm2 stop cocoa-backend 2>nul
pm2 delete cocoa-backend 2>nul

REM Start backend with PM2
echo 🚀 Starting backend with PM2...
cd Backend
call pm2 start server.js --name cocoa-backend --env production
cd ..

REM Save PM2 configuration
echo 💾 Saving PM2 configuration...
call pm2 save

REM Show status
echo 📊 Application status:
call pm2 status

echo ✅ Deployment completed successfully!
echo 🌐 Your application should be running on http://localhost:5000
echo 📋 Use 'pm2 logs cocoa-backend' to view logs
echo 📋 Use 'pm2 restart cocoa-backend' to restart the application

pause 