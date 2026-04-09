# Suggested Commit Plan

This repository now contains several large but logically related improvements. To make review and rollback safer, split the worktree into thematic commits in roughly this order.

## 1. Backend modularization, validation, and deterministic tests

Suggested commit message:

```text
refactor(backend): modularize server and add deterministic route tests
```

Suggested files:

```text
Backend/server.js
Backend/app.js
Backend/lib/**
Backend/routes/**
Backend/testUtils.js
Backend/server.test.js
Backend/login.test.js
Backend/items-auth.test.js
Backend/departments.test.js
Backend/requisitions.test.js
Backend/users.test.js
```

Notes:

- This is the highest-value backend refactor commit.
- It captures the app factory, extracted route modules, shared validation/HTTP helpers, and backend route coverage.

## 2. Frontend auth/session wiring and app shell cleanup

Suggested commit message:

```text
refactor(frontend): centralize auth state and app routing
```

Suggested files:

```text
src/App.js
src/App.test.js
src/Component/RoleBasedRoute.jsx
src/Context/**
src/utils/**
src/Pages/LoginPage.js
src/Pages/LoginPage.test.js
src/Pages/Dashboard.js
src/Pages/Dashboard.test.js
src/Pages/ChangePasswordPage.js
```

Notes:

- This groups the shared session/auth cleanup and route guard improvements.
- It is a good boundary because it changes app wiring without mixing in the larger component redesigns.

## 3. Requisition, inventory, dashboard, and admin UI cleanup

Suggested commit message:

```text
feat(frontend): harden requisition and admin workflows with shared UI patterns
```

Suggested files:

```text
src/Component/AuditLogViewer.jsx
src/Component/AuditLogViewer.test.jsx
src/Component/DepartmentManager.jsx
src/Component/InventoryForm.jsx
src/Component/InventoryForm.test.jsx
src/Component/InventoryList.jsx
src/Component/LoadingSpinner.jsx
src/Component/MyRequisitions.jsx
src/Component/MyRequisitions.test.jsx
src/Component/RequisitionApproval.jsx
src/Component/RequisitionApproval.test.jsx
src/Component/RequisitionForm.jsx
src/Component/RequisitionForm.test.jsx
src/Component/RequisitionFulfill.jsx
src/Component/RequisitionFulfill.test.jsx
src/Component/ui/**
src/Pages/AdminAddUser.js
src/Pages/AdminAddUser.test.js
src/styles.css
```

Notes:

- This commit captures the shared UI components, requisition flow cleanup, inventory form fixes, and admin page cleanup.
- It should be reviewed together with the new component tests.

## 4. Tooling, docs, local DB scripts, and production ops

Suggested commit message:

```text
chore(repo): improve local db workflow, deployment docs, and ops tooling
```

Suggested files:

```text
.env.example
.gitignore
.vscode/launch.json
.vscode/settings.json
cocoa-inventory.code-workspace
README.md
DEPLOYMENT.md
docs/api-contract.md
docs/commit-plan.md
ecosystem.config.cjs
eslint.config.mjs
package.json
package-lock.json
scripts/check-backend.ps1
scripts/init-dev-db.sql
scripts/init-prod-db.sql
scripts/start-dev.ps1
scripts/start-local-db.ps1
scripts/stop-local-db.ps1
scripts/smoke-startup.mjs
scripts/health-check.sh
scripts/install-wizard.sh
scripts/backup.sh
scripts/backup.bat
database_schema_update.sql
fix_item_id_column.sql
fix_requisitions_schema.sql
```

Include deletion:

```text
CMC_Inventory.session.sql
```

Notes:

- This keeps repo operations, deployment guidance, schema bootstrap, and editor hygiene in one commit.
- The deprecated root SQL files stay as safe placeholders so old references do not provision stale schema.

## Suggested verification after each commit

For backend-focused commits:

```bash
npm run lint
npm run check:backend
npm run test:backend
```

For frontend-focused commits:

```bash
cmd /c "set CI=true&& npm test -- --watch=false"
npm run build
```

For the final ops/docs commit:

```bash
npm run smoke:startup
```

## Practical staging tip

If you want to stage these buckets safely, use file-based `git add` per section instead of `git add .`. That keeps unrelated work from slipping into the wrong commit.
