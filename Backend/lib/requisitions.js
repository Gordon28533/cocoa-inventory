import crypto from "crypto";

export const READY_FOR_FULFILLMENT_STATUSES = new Set(["ho_account_approved", "account_approved"]);

export function generateUniqueCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function buildSqlPlaceholders(values) {
  return values.map(() => "?").join(",");
}

export async function getTargetRequisitions(db, { requisitionId, batchId }) {
  if (batchId) {
    const [rows] = await db.execute("SELECT * FROM requisitions WHERE batch_id = ?", [batchId]);
    return rows;
  }

  const [[requisition]] = await db.execute("SELECT * FROM requisitions WHERE id = ?", [requisitionId]);
  return requisition ? [requisition] : [];
}

export async function updateRequisitionBatch(db, requisitions, updates) {
  const ids = requisitions.map((requisition) => requisition.id);
  const assignments = Object.keys(updates).map((field) => `${field} = ?`).join(", ");

  await db.execute(
    `UPDATE requisitions SET ${assignments} WHERE id IN (${buildSqlPlaceholders(ids)})`,
    [...Object.values(updates), ...ids]
  );
}

export function isReadyForFulfillment(status) {
  return READY_FOR_FULFILLMENT_STATUSES.has(status);
}

export function validateReceiverId(receiverId) {
  if (receiverId && receiverId.trim() === "") {
    return "Receiver Staff ID is required";
  }

  return null;
}

export function hasMixedStatuses(requisitions) {
  return new Set(requisitions.map((requisition) => requisition.status)).size > 1;
}
