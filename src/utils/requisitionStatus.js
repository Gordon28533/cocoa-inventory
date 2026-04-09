export const APPROVED_BATCH_STATUSES = new Set(["account_approved", "ho_account_approved"]);

export function getBatchStatusMeta(batch) {
  const statuses = batch.map((item) => item.status);

  if (statuses.every((status) => status === "fulfilled")) {
    return { label: "Fulfilled", icon: "Done", color: "#28a745" };
  }

  if (statuses.every((status) => APPROVED_BATCH_STATUSES.has(status))) {
    return { label: "Approved", icon: "Approved", color: "#1976d2" };
  }

  if (statuses.every((status) => status === "pending")) {
    return { label: "Pending", icon: "Pending", color: "#ffc107" };
  }

  if (statuses.some((status) => status === "rejected")) {
    return { label: "Rejected", icon: "Rejected", color: "#dc3545" };
  }

  return { label: "In Progress", icon: "In Progress", color: "#888" };
}
