/**
 * constants.js — frontend application constants.
 *
 * All hardcoded values that belong to business logic (role lists, page sizes,
 * display names, thresholds) live here. Import from this file instead of
 * duplicating literals across components.
 *
 * Architecture layer: Config (L-0) — no imports from other app modules.
 */

// ── Application ───────────────────────────────────────────────────────────────

export const APP_NAME = "Cocoa Inventory";

// ── User roles ────────────────────────────────────────────────────────────────
// Each entry has a machine-readable `value` (matches the backend role string)
// and a human-readable `label` for display in selects and badges.

export const USER_ROLE_OPTIONS = [
  { value: "admin",           label: "Admin" },
  { value: "user",            label: "Normal Staff" },
  { value: "stores",          label: "Stores Staff" },
  { value: "account",         label: "Branch Account" },
  { value: "hod",             label: "Head of Department (HOD)" },
  { value: "deputy_hod",      label: "Deputy HOD" },
  { value: "account_manager", label: "Account Manager" },
  { value: "it_manager",      label: "IT Manager" },
];

/** Flat array of valid role strings — for validation and role-based checks. */
export const USER_ROLES = USER_ROLE_OPTIONS.map((r) => r.value);

/** Roles that have access to the admin panel. */
export const ADMIN_ROLES = ["admin"];

// ── Pagination ────────────────────────────────────────────────────────────────

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

// ── Inventory ─────────────────────────────────────────────────────────────────

/** Default reorder-level applied to new inventory items. */
export const DEFAULT_REORDER_LEVEL = 10;
