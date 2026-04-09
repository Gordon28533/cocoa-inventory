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

export function canManageInventory(user) {
  return !!user && INVENTORY_MANAGER_ROLES.has(user.role);
}
