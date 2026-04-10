# PR Summary

## Title

```text
Refactor backend, centralize frontend auth, and improve local DB/deployment tooling
```

## Summary

This PR modernizes the Cocoa Inventory project across three main areas:

- modular backend architecture with deterministic in-process route tests
- centralized frontend auth/session handling with stronger UI workflow coverage
- improved local database workflow, deployment tooling, and repository hygiene

## What changed

### Backend

- replaced the monolithic backend entrypoint with an app-factory approach
- extracted backend concerns into:
  - auth helpers
  - validation helpers
  - HTTP/response helpers
  - route modules
  - requisition helpers
  - database/bootstrap helpers
- added deterministic backend route tests for:
  - auth and profile
  - inventory auth
  - users/admin flows
  - departments
  - requisitions, approvals, and fulfillment

Key files:

- [server.js](/C:/Users/PC/cocoa-inventory/Backend/server.js)
- [app.js](/C:/Users/PC/cocoa-inventory/Backend/app.js)
- [routes](/C:/Users/PC/cocoa-inventory/Backend/routes)
- [lib](/C:/Users/PC/cocoa-inventory/Backend/lib)

### Frontend

- centralized auth/session state in shared context and storage helpers
- standardized API usage through shared frontend API utilities
- cleaned and hardened:
  - login flow
  - dashboard routing
  - requisition request/approval/fulfillment flows
  - inventory edit/add flow
  - admin user management
  - audit log viewing
- added focused frontend tests plus app-shell integration coverage
- introduced shared UI helpers for modal, status, and state display patterns
- polished frontend accessibility and consistency with:
  - route-level document titles
  - skip-link and tab semantics
  - modal focus trapping and focus return
  - improved form descriptions and error associations
  - denser table captions and row-specific action labels
  - more consistent loading/success/error wording

Key files:

- [App.js](/C:/Users/PC/cocoa-inventory/src/App.js)
- [AuthContext.js](/C:/Users/PC/cocoa-inventory/src/Context/AuthContext.js)
- [api.js](/C:/Users/PC/cocoa-inventory/src/utils/api.js)
- [Dashboard.js](/C:/Users/PC/cocoa-inventory/src/Pages/Dashboard.js)
- [AdminAddUser.js](/C:/Users/PC/cocoa-inventory/src/Pages/AdminAddUser.js)

### Tooling and operations

- added project-managed local MySQL startup/stop scripts
- added production-safe schema bootstrap and dev seed bootstrap
- added PM2 config and startup smoke-check script
- expanded lint coverage and added backend syntax verification
- refreshed README and deployment documentation
- deprecated outdated root SQL files to prevent accidental stale schema setup
- removed client-generated session SQL noise from the repo path

Key files:

- [package.json](/C:/Users/PC/cocoa-inventory/package.json)
- [README.md](/C:/Users/PC/cocoa-inventory/README.md)
- [DEPLOYMENT.md](/C:/Users/PC/cocoa-inventory/DEPLOYMENT.md)
- [api-contract.md](/C:/Users/PC/cocoa-inventory/docs/api-contract.md)
- [init-dev-db.sql](/C:/Users/PC/cocoa-inventory/scripts/init-dev-db.sql)
- [init-prod-db.sql](/C:/Users/PC/cocoa-inventory/scripts/init-prod-db.sql)
- [ecosystem.config.cjs](/C:/Users/PC/cocoa-inventory/ecosystem.config.cjs)

## Verification

Commands run during cleanup:

```bash
npm run test:backend
cmd /c "set CI=true&& npm test -- --watch=false"
npm run lint
npm run check:backend
npm run build
npm run smoke:startup
```

Latest frontend verification:

```text
11/11 frontend suites passing
33/33 frontend tests passing
```

Additional live smoke check:

```bash
node scripts/smoke-startup.mjs --url http://127.0.0.1:5000 --staff-name admin --password admin123
```

## Commits

- `3afcf61` `refactor(backend): modularize server and add deterministic route tests`
- `ce97a33` `feat(frontend): centralize auth and harden core workflows`
- `bcb72c7` `chore(repo): improve local db workflow and deployment tooling`

## Known note

- `react-scripts build` still prints the non-blocking Browserslist age warning in this environment.
