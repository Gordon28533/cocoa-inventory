# API Contract and Role Flow

This document describes the current backend route surface exposed by [Backend/app.js](/C:/Users/PC/cocoa-inventory/Backend/app.js) and the role-based workflow enforced by the route handlers in [Backend/routes](/C:/Users/PC/cocoa-inventory/Backend/routes).

## Base URL

By default, the frontend uses:

- `http://localhost:5000`

Configured in [api.js](/C:/Users/PC/cocoa-inventory/src/utils/api.js).

Routes are mounted at the backend root. There is no `/api` prefix.

## Authentication model

- Login expects `staffName` and `password`
- Successful login returns a JWT plus role metadata
- Most protected endpoints require `Authorization: Bearer <token>`
- Database-backed routes return `503` with `{"error":"Database not available"}` when MySQL is disconnected

## Roles

- `admin`
- `user`
- `account`
- `hod`
- `deputy_hod`
- `it_manager`
- `account_manager`
- `stores`

Shared role definitions live in [roles.js](/C:/Users/PC/cocoa-inventory/Backend/lib/roles.js).

## Health and auth endpoints

### `GET /health`

Returns service health and database status.

Example response:

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-04-09T10:32:02.928Z"
}
```

### `POST /login`

Request body:

```json
{
  "staffName": "admin",
  "password": "admin123"
}
```

Success response:

```json
{
  "success": true,
  "token": "jwt-token",
  "role": "admin",
  "department_id": 1
}
```

Failure cases:

- `400` missing `staffName` or `password`
- `401` invalid credentials
- `403` deactivated account
- `503` database unavailable

### `GET /auth/validate`

Requires auth. Returns decoded authenticated user info:

```json
{
  "id": 1,
  "staffName": "admin",
  "role": "admin"
}
```

### `GET /me`

Requires auth and database. Returns the current persisted user record:

```json
{
  "id": 1,
  "staffName": "admin",
  "role": "admin",
  "department_id": 1
}
```

### `POST /change-password`

Requires auth.

Request body:

```json
{
  "oldPassword": "admin123",
  "newPassword": "better-password"
}
```

## Users and audit endpoints

These routes require `admin`.

### `GET /users`

Returns:

- `id`
- `staffName`
- `staffId`
- `role`
- `department_id`
- `isActive`

### `POST /users`

Required fields:

- `staffName`
- `staffId`
- `role`

Optional:

- `password`
- `department_id`

If `password` is omitted, the backend defaults it to:

- `${staffName}${staffId}`

### `PUT /users/:id`

Allows updating:

- `staffName`
- `staffId`
- `password`
- `role`
- `department_id`

Validation highlights:

- invalid role -> `400`
- invalid numeric user id -> `400`
- duplicate `staffName` or `staffId` -> `400`

### `PATCH /users/:id/deactivate`

Sets `isActive` to `0`.

### `DELETE /users/:id`

Deletes the user.

### `GET /audit-logs`

Returns the latest 200 audit entries joined to `users.staffName`.

## Department endpoints

### `GET /departments`

Public to authenticated frontend flow, but still database-backed.

Returns department rows ordered by name.

### `POST /departments`

Admin only.

Request body:

```json
{
  "name": "Finance",
  "description": "Finance Department"
}
```

Validation highlights:

- missing name -> `400`
- duplicate department name -> `400`

### `PUT /departments/:id`

Admin only.

Validation highlights:

- invalid numeric id -> `400`
- missing name -> `400`
- duplicate department name -> `400`

### `DELETE /departments/:id`

Admin only.

Validation highlights:

- invalid numeric id -> `400`
- department with requisitions cannot be deleted -> `400`

## Inventory endpoints

All inventory routes require auth plus a connected database.

### `GET /items`

Returns the inventory list.

### `POST /items`

Used by inventory managers. The backend enforces role authorization even if the UI hides the action.

### `PUT /items/:id`

Updates an inventory item.

### `DELETE /items/:id`

Deletes an inventory item.

Inventory manager roles:

- `admin`
- `stores`

## Requisition endpoints

All requisition routes require auth plus a connected database.

### `POST /requisitions`

Creates a requisition batch.

Request body shape:

```json
{
  "items": [
    { "id": "GEN001", "quantity": 2 }
  ],
  "department": "Tema Takeover Center",
  "department_id": 2,
  "is_it_item": false
}
```

Success response:

```json
{
  "success": true,
  "batch_id": "abc123def456",
  "unique_code": "PICKUP-123456"
}
```

Validation highlights:

- empty items array -> `400`
- invalid item id or quantity -> `400`
- missing department and department id -> `400`
- invalid department id or name -> `400`
- requester may only submit for their own assigned department -> `403`

### `GET /requisitions`

Returned data is role-scoped:

- `user`: only own requisitions
- `account`, `hod`, `deputy_hod`: requisitions for their department
- other privileged roles: broader access as defined by route logic

### `PUT /requisitions/:id/approve`

Supports approving a single requisition or an entire batch via `batch_id` in the request body.

Request body example:

```json
{
  "batch_id": "abc123def456"
}
```

Validation highlights:

- invalid numeric id -> `400`
- missing requisition or batch -> `404`
- mixed-status batch -> `400`
- wrong department approver -> `403`
- wrong role for current status -> `403`

### `PUT /requisitions/:id/fulfill`

Single-route fulfillment path.

Request body:

```json
{
  "batch_id": "abc123def456",
  "unique_code": "PICKUP-123456",
  "receiver_id": "STAFF-77"
}
```

Validation highlights:

- only `stores` can fulfill
- only ready-for-fulfillment statuses can be fulfilled
- unique code must match
- `receiver_id` must be non-blank if provided
- mixed-status batches are rejected

### `PUT /requisitions/batch/:batch_id/fulfill`

Batch-focused fulfillment path. Uses the same readiness and unique-code validation as the single-route path.

### `GET /requisitions/code/:code`

Looks up a requisition by pickup/unique code.

Requires auth.

## Approval flow

The main backend approval logic lives in [requisitionRoutes.js](/C:/Users/PC/cocoa-inventory/Backend/routes/requisitionRoutes.js).

### Branch non-head-office flow

1. `pending`
2. `branch_account_approved` by `account`
3. `ho_account_approved` by `account_manager`
4. `fulfilled` by `stores`

### Department non-IT flow

1. `pending`
2. `hod_approved` by `hod` or `deputy_hod`
3. `account_approved` by `account_manager`
4. `fulfilled` by `stores`

### Department IT flow

1. `pending`
2. `hod_approved` by `hod` or `deputy_hod`
3. `it_approved` by `it_manager`
4. `account_approved` by `account_manager`
5. `fulfilled` by `stores`

Ready-for-fulfillment statuses are centralized in [requisitions.js](/C:/Users/PC/cocoa-inventory/Backend/lib/requisitions.js):

- `account_approved`
- `ho_account_approved`

## Frontend contract notes

The frontend shared API client lives in [api.js](/C:/Users/PC/cocoa-inventory/src/utils/api.js).

Notable frontend behavior:

- `401` responses from authenticated requests clear session storage and redirect to `/login`
- auth/session state is centralized in [AuthContext.js](/C:/Users/PC/cocoa-inventory/src/Context/AuthContext.js)
- backend URL is centralized via `REACT_APP_API_URL` with a default of `http://localhost:5000`

## Testing and confidence

Current test strategy:

- frontend component and app-shell tests through React Testing Library
- backend route tests through Node's built-in test runner
- backend tests use the app factory and do not need a separate live server

Useful commands:

```bash
npm run lint
cmd /c "set CI=true&& npm test -- --watch=false"
npm run test:backend
npm run build
```
