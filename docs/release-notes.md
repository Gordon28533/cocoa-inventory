# Release Notes

## Release scope

This release delivers a major project cleanup across backend architecture, frontend workflow reliability, and local/prod operations.

## Highlights

### Backend improvements

- modularized the backend into route and helper modules
- reduced duplication in auth, validation, requisition, and HTTP handling
- added deterministic in-process backend route tests
- improved validation and response consistency across core endpoints

### Frontend improvements

- centralized auth/session state
- standardized frontend API access through shared helpers
- improved dashboard, login, admin, inventory, and requisition flows
- added focused component and app-shell tests
- introduced reusable UI patterns for modal, status, and state display
- polished frontend accessibility and consistency across page titles, skip links, tabs, modal focus, form error wiring, dense data tables, and mobile navigation
- unified loading, success, and retry-oriented feedback language across the main workflows

### Operations and tooling

- added local MySQL bootstrap/start/stop scripts
- added production-safe and dev-safe schema bootstrap SQL files
- added PM2 configuration
- added startup smoke-check tooling
- expanded lint and backend syntax verification
- cleaned outdated SQL/setup artifacts and repository noise

## Validation completed

- backend test suite passing
- frontend test suite passing (`11/11` suites, `33/33` tests)
- lint passing
- backend syntax checks passing
- production build passing
- smoke check passing against the local backend

## Deployment notes

- use [init-prod-db.sql](/C:/Users/PC/cocoa-inventory/scripts/init-prod-db.sql) for production schema setup
- use [ecosystem.config.cjs](/C:/Users/PC/cocoa-inventory/ecosystem.config.cjs) to run the backend with PM2
- use [smoke-startup.mjs](/C:/Users/PC/cocoa-inventory/scripts/smoke-startup.mjs) after deploy for a quick `/health` and optional login verification

## Known note

- the build still emits a non-blocking Browserslist age warning in this environment
