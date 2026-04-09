# Deployment Guide

This guide reflects the current application layout and startup flow in:

- [Backend/server.js](/C:/Users/PC/cocoa-inventory/Backend/server.js)
- [Backend/app.js](/C:/Users/PC/cocoa-inventory/Backend/app.js)

## What gets deployed

- the built React frontend from `build/`
- the Express backend from `Backend/`
- a MySQL database
- a root-level `.env` file

The backend serves the frontend build in production.

## Prerequisites

- Node.js 18+
- npm
- MySQL 8+
- A process manager such as PM2
- A reverse proxy such as Nginx or Apache for HTTPS

## 1. Copy the project

```bash
git clone <your-repo-url> /opt/cocoa-inventory
cd /opt/cocoa-inventory
```

## 2. Install dependencies

```bash
npm ci
```

There is a single root `package.json`. You do not need a separate `npm install` inside `Backend/`.

## 3. Configure environment variables

Create `/opt/cocoa-inventory/.env`:

```env
DB_HOST=127.0.0.1
DB_USER=cocoa_user
DB_PASS=replace_with_secure_password
DB_NAME=CMC_Inventory
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
NODE_ENV=production
```

Notes:

- `Backend/server.js` loads `.env` from the project root.
- Use a strong `JWT_SECRET`.
- In production, point these values at your managed MySQL instance. Do not use the local Windows dev bootstrap flow.
- Start from [.env.example](/C:/Users/PC/cocoa-inventory/.env.example) when creating the file.

## 4. Prepare the database

Create the production database and user in MySQL:

```sql
CREATE DATABASE CMC_Inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cocoa_user'@'localhost' IDENTIFIED BY 'replace_with_secure_password';
GRANT ALL PRIVILEGES ON CMC_Inventory.* TO 'cocoa_user'@'localhost';
FLUSH PRIVILEGES;
```

Then import your schema and seed strategy.

Recommended options:

- use [init-prod-db.sql](/C:/Users/PC/cocoa-inventory/scripts/init-prod-db.sql) for a production-safe bootstrap
- use [init-dev-db.sql](/C:/Users/PC/cocoa-inventory/scripts/init-dev-db.sql) only as a development reference
- or provision schema via your database migration/release process

Important:

- the dev SQL file includes a seeded admin account and sample data
- do not apply development seed credentials in production
- legacy root-level SQL files are deprecated placeholders and should not be used for new setups

Example import:

```bash
mysql -u cocoa_user -p CMC_Inventory < scripts/init-prod-db.sql
```

## 5. Build the frontend

```bash
npm run build
```

## 6. Preflight checks

Run the checks before starting the service:

```bash
npm run lint
npm run check:backend
npm run test:backend
```

Optional frontend CI-style test run:

```bash
CI=true npm test -- --watch=false
```

## 7. Start the backend

### With PM2

```bash
cd /opt/cocoa-inventory
pm2 start ecosystem.config.cjs
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs cocoa-inventory
pm2 restart cocoa-inventory
```

The repository includes a ready-to-use PM2 config in [ecosystem.config.cjs](/C:/Users/PC/cocoa-inventory/ecosystem.config.cjs).

## 8. Verify the deployment

Health check:

```bash
curl http://127.0.0.1:5000/health
```

Expected shape:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-04-09T10:32:02.928Z"
}
```

Optional smoke checks:

```bash
# Health only
npm run smoke:startup

# Health plus login
node scripts/smoke-startup.mjs --url http://127.0.0.1:5000 --staff-name admin --password your_password
```

## 9. Put a reverse proxy in front

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name inventory.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name inventory.example.com;

    ssl_certificate /etc/letsencrypt/live/inventory.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inventory.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 10. Operational notes

- `/health` is the simplest readiness check
- `scripts/smoke-startup.mjs` is the quickest post-deploy smoke test
- backend routes are mounted at the root, not under `/api`
- authenticated frontend requests expect the backend at `REACT_APP_API_URL` or `http://localhost:5000`
- if the database is unavailable, DB-backed routes return `503`

## Production checklist

- set a strong `JWT_SECRET`
- use a dedicated production MySQL user
- disable or remove demo seed users
- restrict database access to the application host
- terminate TLS at the reverse proxy
- monitor PM2 logs and health checks
- back up MySQL regularly
- keep dependencies and Browserslist data current
