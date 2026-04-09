# Cocoa Inventory Management System

A React + Node.js inventory and requisition system for Cocoa Marketing Company. The app includes role-based access control, inventory management, requisition approvals, fulfillment, audit logging, and a project-managed local MySQL workflow for development.

## Highlights

- Role-based authentication with JWT
- Inventory create, edit, delete, and low-stock alerts
- Multi-step requisition workflow with department and head-office approvals
- Department and user administration
- Audit log viewing for admin users
- Deterministic frontend and backend test suites

## Tech Stack

- Frontend: React, React Router, React Testing Library
- Backend: Express, MySQL, JWT, bcrypt
- Tooling: ESLint, Node test runner, PowerShell dev scripts

## Prerequisites

- Node.js 18+
- npm
- MySQL 8.0 binaries installed in the default Windows path:
  `C:\Program Files\MySQL\MySQL Server 8.0\bin`

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root.

```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASS=your_password
DB_NAME=CMC_Inventory
JWT_SECRET=replace_this_in_real_environments
PORT=5000
NODE_ENV=development
```

Notes:

- `npm run db:start` will create and seed `CMC_Inventory` automatically on first run.
- `Backend/server.js` loads `.env` from the project root.

## Local development

### Recommended workflow

```bash
npm run dev
```

This command:

- stops stale project frontend/backend processes on ports `3000` and `5000`
- starts the project-managed local MySQL instance
- starts the React frontend on `http://localhost:3000`
- starts the backend on `http://localhost:5000`

### Individual commands

```bash
# Start the local MySQL instance and seed the database if needed
npm run db:start

# Stop the local MySQL instance
npm run db:stop

# Start the React dev server
npm start

# Start the backend server
npm run start-backend
```

### Seeded development login

When the local database is initialized from `scripts/init-dev-db.sql`, the default seeded admin account is:

- `staffName`: `admin`
- `password`: `admin123`

## Testing

### Frontend

```bash
npm test
```

For a one-shot run in CI style on Windows:

```bash
cmd /c "set CI=true&& npm test -- --watch=false"
```

### Backend

```bash
npm run test:backend
```

Backend tests run in-process against the app factory in [Backend/app.js](/C:/Users/PC/cocoa-inventory/Backend/app.js). They do not require a separately running server.

## Build and quality checks

```bash
# Frontend + backend lint
npm run lint

# Backend syntax validation
npm run check:backend

# Startup smoke check
npm run smoke:startup

# Production build
npm run build
```

Additional scoped scripts:

- `npm run lint:frontend`
- `npm run lint:backend`
- `node scripts/smoke-startup.mjs --url http://127.0.0.1:5000 --staff-name admin --password admin123`

## Project structure

```text
cocoa-inventory/
|-- Backend/
|   |-- app.js
|   |-- server.js
|   |-- lib/
|   |-- routes/
|   `-- *.test.js
|-- public/
|-- scripts/
|   |-- init-prod-db.sql
|   |-- init-dev-db.sql
|   |-- start-dev.ps1
|   |-- start-local-db.ps1
|   `-- stop-local-db.ps1
|-- src/
|   |-- Component/
|   |   `-- ui/
|   |-- Context/
|   |-- Pages/
|   `-- utils/
|-- README.md
`-- package.json
```

## Core roles

- `admin`: full access, user management, departments, audit logs, inventory
- `user`: submits requisitions and views personal requisitions
- `account`: branch account approval for non-head-office requisitions
- `hod`: department approval
- `deputy_hod`: same approval step as HOD
- `it_manager`: IT approval after HOD for IT requisitions
- `account_manager`: head-office account approval
- `stores`: inventory operations and requisition fulfillment

## Approval workflow summary

- Branch non-head-office flow:
  `pending -> branch_account_approved -> ho_account_approved -> fulfilled`
- Non-IT departmental flow:
  `pending -> hod_approved -> account_approved -> fulfilled`
- IT departmental flow:
  `pending -> hod_approved -> it_approved -> account_approved -> fulfilled`

The backend enforces department scoping, mixed-status batch rejection, and stores-only fulfillment.

## API overview

Main endpoints are mounted at the backend root, not under `/api`.

### Auth

- `POST /login`
- `GET /auth/validate`
- `POST /change-password`
- `GET /me`
- `GET /health`

### Users and audit

- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`
- `PATCH /users/:id/deactivate`
- `GET /audit-logs`

### Inventory

- `GET /items`
- `POST /items`
- `PUT /items/:id`
- `DELETE /items/:id`

### Departments

- `GET /departments`
- `POST /departments`
- `PUT /departments/:id`
- `DELETE /departments/:id`

### Requisitions

- `POST /requisitions`
- `GET /requisitions`
- `PUT /requisitions/:id/approve`
- `PUT /requisitions/:id/fulfill`
- `PUT /requisitions/batch/:batch_id/fulfill`
- `GET /requisitions/code/:code`

For the fuller request/response and role contract, see [docs/api-contract.md](/C:/Users/PC/cocoa-inventory/docs/api-contract.md).

## Deployment

- `npm run build`
- `npm run start-backend`

The backend serves the production React build from `build/` when started through [Backend/server.js](/C:/Users/PC/cocoa-inventory/Backend/server.js).

Production helpers:

- [ecosystem.config.cjs](/C:/Users/PC/cocoa-inventory/ecosystem.config.cjs) for PM2
- [smoke-startup.mjs](/C:/Users/PC/cocoa-inventory/scripts/smoke-startup.mjs) for `/health` and optional login smoke checks

## Notes

- The local DB bootstrap is designed for Windows development environments.
- The build may show a non-blocking Browserslist age warning until its data is refreshed.
