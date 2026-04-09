#!/bin/bash

set -euo pipefail

echo "Cocoa Inventory installation helper"
echo
echo "This project now uses a single root package.json and a PM2 ecosystem file."
echo "The fastest production path is:"
echo
echo "  1. Copy .env.example to .env and fill in production values"
echo "  2. Run: npm ci"
echo "  3. Run: npm run build"
echo "  4. Run: npm run lint"
echo "  5. Run: npm run check:backend"
echo "  6. Run: npm run test:backend"
echo "  7. Start with: pm2 start ecosystem.config.cjs"
echo "  8. Verify with: node scripts/smoke-startup.mjs --url http://127.0.0.1:5000 --skip-login"
echo
echo "For the full production instructions, see DEPLOYMENT.md."
