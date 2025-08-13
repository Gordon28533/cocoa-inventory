#!/bin/bash

# Cocoa Inventory System - Deployment Script
# Run this script from the project root directory

set -e  # Exit on any error

echo "🚀 Starting Cocoa Inventory deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it with your production settings."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd Backend
npm install
cd ..

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop existing PM2 process if running
echo "🛑 Stopping existing processes..."
pm2 stop cocoa-backend 2>/dev/null || true
pm2 delete cocoa-backend 2>/dev/null || true

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
cd Backend
pm2 start server.js --name cocoa-backend --env production
cd ..

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "📊 Application status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be running on http://localhost:5000"
echo "📋 Use 'pm2 logs cocoa-backend' to view logs"
echo "📋 Use 'pm2 restart cocoa-backend' to restart the application" 