import crypto from "crypto";
import express from "express";
import {
  badRequest,
  forbidden,
  logUnexpectedError,
  notFound,
  serverError
} from "../lib/httpResponses.js";
import { DEPARTMENT_APPROVER_ROLES } from "../lib/roles.js";
import {
  deductInventoryForRequisitions,
  generateUniqueCode,
  getInventoryDeductionErrorMessage,
  getTargetRequisitions,
  hasMixedStatuses,
  isReadyForFulfillment,
  updateRequisitionBatch,
  validateReceiverId,
  withTransaction
} from "../lib/requisitions.js";
import {
  hasText,
  isPositiveNumber,
  parsePositiveInteger,
  toNullablePositiveInteger
} from "../lib/validation.js";

export function createRequisitionRouter({ getDb, requireAuth, requireDatabase, logAudit }) {
  const router = express.Router();

  router.post("/requisitions", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { items, department, department_id, is_it_item } = req.body;
    const requestedBy = req.user.id;
    const normalizedDepartmentId = toNullablePositiveInteger(department_id);

    if (!Array.isArray(items) || items.length === 0) {
      return badRequest(res, "No items selected");
    }

    if (
      department_id !== undefined &&
      normalizedDepartmentId === null &&
      department_id !== null &&
      department_id !== ""
    ) {
      return badRequest(res, "Invalid department ID");
    }

    if (!department && !department_id) {
      return badRequest(res, "Department is required");
    }

    for (const item of items) {
      if (!hasText(item.id) || !isPositiveNumber(item.quantity)) {
        return badRequest(res, "Invalid item in requisition");
      }
    }

    const uniqueCode = generateUniqueCode();
    const batchId = crypto.randomBytes(6).toString("hex");

    try {
      let finalDepartment = department;
      let finalDepartmentId = normalizedDepartmentId;
      let isHeadOffice = 0;

      if (department_id && !department) {
        const [departmentRows] = await db.execute(
          "SELECT id, name, is_head_office FROM departments WHERE id = ?",
          [department_id]
        );
        if (!departmentRows.length) {
          return badRequest(res, "Invalid department ID");
        }
        finalDepartment = departmentRows[0].name;
        isHeadOffice    = departmentRows[0].is_head_office ? 1 : 0;
      } else if (department && !department_id) {
        const [departmentRows] = await db.execute(
          "SELECT id, name, is_head_office FROM departments WHERE name = ?",
          [department]
        );
        if (!departmentRows.length) {
          return badRequest(res, "Invalid department name");
        }
        finalDepartmentId = departmentRows[0].id;
        isHeadOffice      = departmentRows[0].is_head_office ? 1 : 0;
      } else if (department_id && department) {
        // Both provided: look up the flag by id
        const [departmentRows] = await db.execute(
          "SELECT is_head_office FROM departments WHERE id = ?",
          [department_id]
        );
        isHeadOffice = departmentRows[0]?.is_head_office ? 1 : 0;
      }

      if (req.user.department_id && String(req.user.department_id) !== String(finalDepartmentId)) {
        return forbidden(res, "You can only submit requisitions for your assigned department");
      }

      for (const item of items) {
        await db.execute(
          `INSERT INTO requisitions
             (item_id, requested_by, department, department_id, quantity, status,
              unique_code, is_it_item, is_head_office, batch_id)
           VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
          [
            item.id, requestedBy, finalDepartment, finalDepartmentId,
            item.quantity, uniqueCode, !!is_it_item, isHeadOffice, batchId
          ]
        );
      }

      await logAudit(requestedBy, "create_requisition", batchId);
      res.status(201).json({ success: true, batch_id: batchId, unique_code: uniqueCode });
    } catch (error) {
      logUnexpectedError(console, "Error creating requisition", error);
      return serverError(res, "Failed to create requisition");
    }
  });

  // M-6: Add ?page / ?limit pagination
  router.get("/requisitions", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 100, 1), 500);
    const offset = Math.max((parseInt(req.query.page) || 1) - 1, 0) * limit;

    try {
      let query = `SELECT id, item_id, requested_by, department, department_id, quantity, status,
                          unique_code, is_it_item, is_head_office, batch_id, created_at,
                          hod_approved_by, branch_account_approved_by, ho_account_approved_by,
                          it_approved_by, account_approved_by, fulfilled_by, rejected_by
                   FROM requisitions`;
      const params = [];

      if (req.user.role === "user") {
        query += " WHERE requested_by = ?";
        params.push(req.user.id);
      } else if (DEPARTMENT_APPROVER_ROLES.has(req.user.role)) {
        query += " WHERE department_id = ?";
        params.push(req.user.department_id);
      }

      query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      const [rows] = await db.execute(query, params);
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching requisitions", error);
      return serverError(res, "Failed to fetch requisitions");
    }
  });

  router.put("/requisitions/:id/approve", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { batch_id } = req.body;
    const user = req.user;
    const requisitionId = parsePositiveInteger(id);

    if (!requisitionId) {
      return badRequest(res, "Invalid requisition ID");
    }

    try {
      const requisitions = await getTargetRequisitions(db, { requisitionId, batchId: batch_id });
      if (!requisitions.length) {
        return notFound(res, batch_id ? "Batch not found" : "Requisition not found");
      }

      if (hasMixedStatuses(requisitions)) {
        return badRequest(res, "Batch contains mixed statuses and cannot be approved together");
      }

      const first = requisitions[0];

      if (DEPARTMENT_APPROVER_ROLES.has(user.role) && String(first.department_id) !== String(user.department_id)) {
        return forbidden(res, "Not authorized to approve requisitions for another department");
      }

      let nextStatus  = null;
      let updateField = null;
      let action      = null;

      // H-7: Use is_head_office flag — not a fragile string comparison
      const isHO = first.is_head_office;

      if (first.status === "pending" && user.role === "account" && !isHO) {
        nextStatus  = "branch_account_approved";
        updateField = "branch_account_approved_by";
        action      = "branch_account_approve";
      } else if (first.status === "branch_account_approved" && user.role === "account_manager" && !isHO) {
        nextStatus  = "ho_account_approved";
        updateField = "ho_account_approved_by";
        action      = "ho_account_approve";
      } else if (first.status === "ho_account_approved" && user.role === "stores" && isHO) {
        nextStatus  = "fulfilled";
        updateField = "fulfilled_by";
        action      = "fulfill";
      } else if (first.status === "pending" && (user.role === "hod" || user.role === "deputy_hod")) {
        nextStatus  = "hod_approved";
        updateField = "hod_approved_by";
        action      = "hod_approve";
      } else if (first.status === "hod_approved" && first.is_it_item && user.role === "it_manager") {
        nextStatus  = "it_approved";
        updateField = "it_approved_by";
        action      = "it_approve";
      } else if (
        (first.status === "hod_approved" && !first.is_it_item && user.role === "account_manager") ||
        (first.status === "it_approved" && user.role === "account_manager")
      ) {
        nextStatus  = "account_approved";
        updateField = "account_approved_by";
        action      = "account_approve";
      } else {
        return forbidden(res, "Not authorized to approve at this step");
      }

      await updateRequisitionBatch(db, requisitions, { status: nextStatus, [updateField]: user.id });
      await logAudit(user.id, action, batch_id || requisitionId);
      res.json({ success: true, status: nextStatus });
    } catch (error) {
      logUnexpectedError(console, "Error approving requisition", error);
      return serverError(res, "Failed to approve requisition");
    }
  });

  // M-10: Reject endpoint — mirrors the approve logic; same role gates apply
  router.put("/requisitions/:id/reject", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { batch_id, reason } = req.body;
    const user = req.user;
    const requisitionId = parsePositiveInteger(id);

    if (!requisitionId) {
      return badRequest(res, "Invalid requisition ID");
    }

    try {
      const requisitions = await getTargetRequisitions(db, { requisitionId, batchId: batch_id });
      if (!requisitions.length) {
        return notFound(res, batch_id ? "Batch not found" : "Requisition not found");
      }

      if (hasMixedStatuses(requisitions)) {
        return badRequest(res, "Batch contains mixed statuses and cannot be rejected together");
      }

      const first = requisitions[0];

      if (["fulfilled", "rejected"].includes(first.status)) {
        return badRequest(res, `Cannot reject a requisition that is already ${first.status}`);
      }

      const isHO = first.is_head_office;

      // Only the role that would approve at the current step may also reject it
      const canReject =
        (first.status === "pending" && (user.role === "hod" || user.role === "deputy_hod")) ||
        (first.status === "pending" && user.role === "account" && !isHO) ||
        (first.status === "branch_account_approved" && user.role === "account_manager") ||
        (first.status === "hod_approved" && user.role === "it_manager" && first.is_it_item) ||
        (first.status === "hod_approved" && user.role === "account_manager" && !first.is_it_item) ||
        (first.status === "it_approved" && user.role === "account_manager") ||
        ((first.status === "ho_account_approved" || first.status === "account_approved") && user.role === "stores");

      if (!canReject) {
        return forbidden(res, "Not authorized to reject at this step");
      }

      if (DEPARTMENT_APPROVER_ROLES.has(user.role) && String(first.department_id) !== String(user.department_id)) {
        return forbidden(res, "Not authorized to reject requisitions for another department");
      }

      await updateRequisitionBatch(db, requisitions, {
        status: "rejected",
        rejected_by: user.id
      });

      await logAudit(
        user.id,
        "reject_requisition",
        batch_id || requisitionId,
        reason ? JSON.stringify({ reason }) : null
      );

      res.json({ success: true, status: "rejected" });
    } catch (error) {
      logUnexpectedError(console, "Error rejecting requisition", error);
      return serverError(res, "Failed to reject requisition");
    }
  });

  router.put("/requisitions/:id/fulfill", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { unique_code, batch_id, receiver_id } = req.body;
    const user = req.user;
    const requisitionId = parsePositiveInteger(id);

    if (!requisitionId) {
      return badRequest(res, "Invalid requisition ID");
    }

    try {
      const requisitions = await getTargetRequisitions(db, { requisitionId, batchId: batch_id });
      if (!requisitions.length) {
        return notFound(res, batch_id ? "Batch not found" : "Requisition not found");
      }

      if (user.role !== "stores") {
        return forbidden(res, "Only stores can fulfill");
      }
      if (hasMixedStatuses(requisitions)) {
        return badRequest(res, "Batch contains mixed statuses and cannot be fulfilled together");
      }

      const first = requisitions[0];
      if (!isReadyForFulfillment(first.status)) {
        return badRequest(res, "Not ready for fulfillment");
      }
      if (first.unique_code !== unique_code) {
        return badRequest(res, "Invalid unique code");
      }

      const receiverValidationError = validateReceiverId(receiver_id);
      if (receiverValidationError) {
        return badRequest(res, receiverValidationError);
      }

      // C-1: withTransaction now passes the acquired connection to the operation
      await withTransaction(db, async (conn) => {
        await deductInventoryForRequisitions(conn, requisitions);
        await updateRequisitionBatch(conn, requisitions, { status: "fulfilled", fulfilled_by: user.id });
        await logAudit(user.id, "fulfill", batch_id || requisitionId);
      });

      res.json({
        success: true,
        status: "fulfilled",
        message: "Requisition fulfilled successfully",
        receiver_id: receiver_id || null
      });
    } catch (error) {
      const inventoryError = getInventoryDeductionErrorMessage(error);
      if (inventoryError) {
        return badRequest(res, inventoryError);
      }
      logUnexpectedError(console, "Error fulfilling requisition", error);
      return serverError(res, "Failed to fulfill requisition");
    }
  });

  router.put("/requisitions/batch/:batch_id/fulfill", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { batch_id } = req.params;
    const { unique_code, receiver_id } = req.body;
    const user = req.user;

    try {
      if (user.role !== "stores") {
        return forbidden(res, "Only stores can fulfill");
      }

      const requisitions = await getTargetRequisitions(db, { requisitionId: null, batchId: batch_id });
      if (!requisitions.length) {
        return notFound(res, "Batch not found");
      }
      if (hasMixedStatuses(requisitions)) {
        return badRequest(res, "Batch contains mixed statuses and cannot be fulfilled together");
      }

      const first = requisitions[0];
      if (!isReadyForFulfillment(first.status)) {
        return badRequest(res, "Not ready for fulfillment");
      }
      if (first.unique_code !== unique_code) {
        return badRequest(res, "Invalid unique code");
      }

      const receiverValidationError = validateReceiverId(receiver_id);
      if (receiverValidationError) {
        return badRequest(res, receiverValidationError);
      }

      // C-1: withTransaction now passes the acquired connection to the operation
      await withTransaction(db, async (conn) => {
        await deductInventoryForRequisitions(conn, requisitions);
        await updateRequisitionBatch(conn, requisitions, { status: "fulfilled", fulfilled_by: user.id });
        await logAudit(user.id, "fulfill", batch_id);
      });

      res.json({
        success: true,
        status: "fulfilled",
        message: "Batch fulfilled successfully",
        receiver_id: receiver_id || null,
        batch_id
      });
    } catch (error) {
      const inventoryError = getInventoryDeductionErrorMessage(error);
      if (inventoryError) {
        return badRequest(res, inventoryError);
      }
      logUnexpectedError(console, "Error fulfilling batch", error);
      return serverError(res, "Failed to fulfill batch");
    }
  });

  router.get("/requisitions/code/:code", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { code } = req.params;

    try {
      // L-1: Explicit columns
      const [[requisition]] = await db.execute(
        `SELECT id, item_id, requested_by, department, department_id, quantity, status,
                unique_code, is_it_item, is_head_office, batch_id, created_at,
                hod_approved_by, branch_account_approved_by, ho_account_approved_by,
                it_approved_by, account_approved_by, fulfilled_by, rejected_by
         FROM requisitions WHERE unique_code = ?`,
        [code]
      );
      if (!requisition) {
        return notFound(res, "Requisition not found");
      }
      res.json(requisition);
    } catch (error) {
      logUnexpectedError(console, "Error fetching requisition by code", error);
      return serverError(res, "Failed to fetch requisition");
    }
  });

  return router;
}
