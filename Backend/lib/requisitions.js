import crypto from "crypto";

export const READY_FOR_FULFILLMENT_STATUSES = new Set(["ho_account_approved", "account_approved"]);

function createInventoryError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function generateUniqueCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function buildSqlPlaceholders(values) {
  return values.map(() => "?").join(",");
}

export async function getTargetRequisitions(db, { requisitionId, batchId }) {
  if (batchId) {
    const [rows] = await db.execute(
      `SELECT id, item_id, requested_by, department, department_id, quantity, status,
              unique_code, is_it_item, is_head_office, batch_id, created_at,
              hod_approved_by, branch_account_approved_by, ho_account_approved_by,
              it_approved_by, account_approved_by, fulfilled_by, rejected_by
       FROM requisitions WHERE batch_id = ?`,
      [batchId]
    );
    return rows;
  }

  const [[requisition]] = await db.execute(
    `SELECT id, item_id, requested_by, department, department_id, quantity, status,
            unique_code, is_it_item, is_head_office, batch_id, created_at,
            hod_approved_by, branch_account_approved_by, ho_account_approved_by,
            it_approved_by, account_approved_by, fulfilled_by, rejected_by
     FROM requisitions WHERE id = ?`,
    [requisitionId]
  );
  return requisition ? [requisition] : [];
}

export async function updateRequisitionBatch(db, requisitions, updates) {
  const ids = requisitions.map((r) => r.id);
  const assignments = Object.keys(updates).map((field) => `${field} = ?`).join(", ");

  await db.execute(
    `UPDATE requisitions SET ${assignments} WHERE id IN (${buildSqlPlaceholders(ids)})`,
    [...Object.values(updates), ...ids]
  );
}

export async function deductInventoryForRequisitions(db, requisitions) {
  const groupedQuantities = requisitions.reduce((totals, requisition) => {
    const itemId = requisition.item_id;
    const quantity = Number(requisition.quantity) || 0;
    totals.set(itemId, (totals.get(itemId) || 0) + quantity);
    return totals;
  }, new Map());

  for (const [itemId, quantityToDeduct] of groupedQuantities.entries()) {
    const [[inventoryItem]] = await db.execute(
      "SELECT id, quantity FROM inventory WHERE id = ?",
      [itemId]
    );

    if (!inventoryItem) {
      throw createInventoryError("INVENTORY_ITEM_NOT_FOUND", `Inventory item ${itemId} not found`);
    }

    if (Number(inventoryItem.quantity) < quantityToDeduct) {
      throw createInventoryError("INSUFFICIENT_STOCK", `Insufficient stock for item ${itemId}`);
    }

    await db.execute(
      "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
      [quantityToDeduct, itemId]
    );
  }
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
  return new Set(requisitions.map((r) => r.status)).size > 1;
}

/**
 * Runs `operation` inside a DB transaction.
 * Works with both mysql2 Pool (getConnection) and single Connection objects (used in tests).
 * The operation receives the connection/db to use for its queries.
 */
export async function withTransaction(db, operation) {
  // Pool path: acquire a dedicated connection so BEGIN/COMMIT/ROLLBACK are scoped to it
  if (typeof db.getConnection === "function") {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
      const result = await operation(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Single-connection path (test mock / legacy)
  if (typeof db.beginTransaction === "function") {
    await db.beginTransaction();
    try {
      const result = await operation(db);
      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }

  // Fallback: no transaction support (shouldn't happen in production)
  return operation(db);
}

export function getInventoryDeductionErrorMessage(error) {
  if (!error?.code) return null;
  if (error.code === "INVENTORY_ITEM_NOT_FOUND") return error.message;
  if (error.code === "INSUFFICIENT_STOCK") return error.message;
  return null;
}
