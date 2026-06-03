export const USER_ROLES = [
  "hod",
  "deputy_hod",
  "stores",
  "user",
  "admin",
  "account",
  "account_manager",
  "it_manager"
];

export const DEPARTMENT_APPROVER_ROLES = new Set(["account", "hod", "deputy_hod"]);
export const INVENTORY_MANAGER_ROLES = new Set(["stores", "admin"]);

/** H-7: Single source of truth for the Head Office department name.
 *  The approval workflow uses the `is_head_office` boolean on requisitions
 *  (populated at creation time from the departments table), so renaming
 *  this department in the DB does not silently break the workflow. */
export const HEAD_OFFICE_DEPARTMENT_NAME = "Head Office";

export function canManageInventory(user) {
  return !!user && INVENTORY_MANAGER_ROLES.has(user.role);
}
