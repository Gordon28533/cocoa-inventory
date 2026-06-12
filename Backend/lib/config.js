/**
 * config.js — single source of truth for all backend configuration.
 *
 * Every environment variable is read and validated here.
 * Route files and middleware import typed constants from this module
 * instead of reading process.env directly or hardcoding magic numbers.
 *
 * Architecture layer: Configuration (L-0) — imported by all other layers.
 */

// ── bcrypt ────────────────────────────────────────────────────────────────────
// Safe range: 10–20 rounds. Values outside this range are silently clamped to
// 10 to prevent accidental misconfiguration (0 would be insecure; 30 would make
// every login take minutes).
const _bcryptRaw = parseInt(process.env.BCRYPT_ROUNDS, 10);
export const BCRYPT_ROUNDS =
  Number.isFinite(_bcryptRaw) && _bcryptRaw >= 10 && _bcryptRaw <= 20
    ? _bcryptRaw
    : 10;

// ── Audit log ─────────────────────────────────────────────────────────────────
// Maximum rows the /audit-logs endpoint returns per request.
const _auditRaw = parseInt(process.env.AUDIT_LOG_LIMIT, 10);
export const AUDIT_LOG_LIMIT_DEFAULT =
  Number.isFinite(_auditRaw) && _auditRaw > 0 ? Math.min(_auditRaw, 5000) : 500;
export const AUDIT_LOG_LIMIT_MAX = 1000;

// ── Rate limiter ──────────────────────────────────────────────────────────────
// These override the defaults in http.js when set.
// Window in milliseconds; max login attempts within that window.
const _rlWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
export const RATE_LIMIT_WINDOW_MS = Number.isFinite(_rlWindow) && _rlWindow > 0
  ? _rlWindow
  : null; // null → use per-environment defaults in createRateLimiter()

const _rlMax = parseInt(process.env.RATE_LIMIT_MAX, 10);
export const RATE_LIMIT_MAX = Number.isFinite(_rlMax) && _rlMax > 0
  ? _rlMax
  : null;

// ── Dev CORS origins ──────────────────────────────────────────────────────────
// In non-production environments CORS is opened to these origins.
// Override with DEV_CORS_ORIGINS=http://localhost:3000,http://mydev.local
export const DEV_CORS_ORIGINS = (
  process.env.DEV_CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:5001,http://127.0.0.1:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ── Admin seed ────────────────────────────────────────────────────────────────
// Credentials used when bootstrapping the first admin account.
// Override these env vars to avoid deploying with default credentials.
// IMPORTANT: Change the admin password immediately after first deployment.
export const ADMIN_STAFF_NAME = process.env.ADMIN_STAFF_NAME || "admin";
export const ADMIN_STAFF_ID   = process.env.ADMIN_STAFF_ID   || "ADMIN001";

// Pre-computed bcrypt hash of 'admin123' (10 rounds).
// Supply ADMIN_PASSWORD_HASH to seed a different default password.
export const ADMIN_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  "$2b$10$fw77eZ/awDO2eWah/sOnK.yZzDAAQ13W.zeW4hJpbjfKy4XweRGfW";
