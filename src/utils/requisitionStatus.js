// ─── Statuses that mean "fully approved, ready for stores to fulfil" ────────
export const APPROVED_BATCH_STATUSES = new Set(["account_approved", "ho_account_approved"]);

// ─── Ordered stages used for progress display ───────────────────────────────
export const STAGE_ORDER = [
  "pending",
  "branch_account_approved",
  "hod_approved",
  "it_approved",
  "account_approved",
  "ho_account_approved",
  "fulfilled",
];

/**
 * Derive display metadata for a batch (array of requisition rows sharing a
 * batch_id).  Returns the most "advanced" stage when rows are mixed so that
 * partially-approved batches show the furthest stage rather than falling back
 * to the generic "In Progress" label.
 *
 * @param {Array<{status: string}>} batch
 * @returns {{ label: string, icon: string, color: string, variant: string }}
 */
export function getBatchStatusMeta(batch) {
  const statuses = batch.map((item) => item.status);

  // ── Terminal states ──────────────────────────────────────────────────────
  if (statuses.every((s) => s === "fulfilled")) {
    return { label: "Fulfilled",  icon: "Done",     color: "#28a745", variant: "success" };
  }

  if (statuses.some((s) => s === "rejected")) {
    return { label: "Rejected",   icon: "Rejected", color: "#dc3545", variant: "danger"  };
  }

  // ── Fully-approved (ready for stores) ───────────────────────────────────
  if (statuses.every((s) => APPROVED_BATCH_STATUSES.has(s))) {
    return { label: "Approved",   icon: "Approved", color: "#1976d2", variant: "info"    };
  }

  // ── Specific intermediate stages (all rows at the same stage) ───────────
  if (statuses.every((s) => s === "it_approved")) {
    return { label: "IT Approved",     icon: "IT",     color: "#0288d1", variant: "info"    };
  }

  if (statuses.every((s) => s === "hod_approved")) {
    return { label: "HOD Approved",    icon: "HOD",    color: "#7b1fa2", variant: "info"    };
  }

  if (statuses.every((s) => s === "branch_account_approved")) {
    return { label: "Branch Approved", icon: "Branch", color: "#f57c00", variant: "warning" };
  }

  // ── Initial pending ──────────────────────────────────────────────────────
  if (statuses.every((s) => s === "pending")) {
    return { label: "Pending",    icon: "Pending",  color: "#ffc107", variant: "warning" };
  }

  // ── Mixed / unknown — show furthest stage reached ────────────────────────
  const furthestIndex = Math.max(
    ...statuses.map((s) => {
      const idx = STAGE_ORDER.indexOf(s);
      return idx === -1 ? 0 : idx;
    })
  );
  const furthestStatus = STAGE_ORDER[furthestIndex] || "pending";
  // Recursively resolve the label for that single status
  return getBatchStatusMeta([{ status: furthestStatus }]);
}
