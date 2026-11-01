import express from "express";
import {
  badRequest,
  isDuplicateEntryError,
  logUnexpectedError,
  serverError
} from "../lib/httpResponses.js";
import { ensureRequiredFields, hasText, parsePositiveInteger } from "../lib/validation.js";

// Department changes were the one administrative action with no audit trail at
// all. They are not cosmetic: a requisition's approval chain is selected from
// its department, so creating, renaming or deleting one alters how future
// requests are routed and who is entitled to approve them.
export function createDepartmentRouter({
  getDb,
  requireAuth,
  requireAdmin,
  requireDatabase,
  logAudit = async () => {}
}) {
  const router = express.Router();

  // C-3: requireAuth added — unauthenticated callers must not enumerate departments
  router.get("/departments", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();

    try {
      // L-1: Explicit columns
      const [rows] = await db.execute(
        "SELECT id, name, description, is_head_office FROM departments ORDER BY name"
      );
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching departments", error);
      return serverError(res, "Failed to fetch departments", error);
    }
  });

  router.post("/departments", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { name, description } = req.body;

    // M-7: Length cap at schema column size (name VARCHAR(100))
    if (!hasText(name, 100)) {
      return badRequest(res, "Department name is required and must be 100 characters or fewer");
    }

    const missingFieldError = ensureRequiredFields({ "Department name": name });
    if (missingFieldError) {
      return badRequest(res, missingFieldError);
    }

    try {
      const [result] = await db.execute(
        "INSERT INTO departments (name, description) VALUES (?, ?)",
        [name.trim(), description || null]
      );

      await logAudit(
        req.user.id,
        "create_department",
        result.insertId,
        JSON.stringify({ name: name.trim(), description: description || null })
      );

      res.status(201).json({
        success: true,
        id: result.insertId,
        name: name.trim(),
        description: description || null,
        is_head_office: 0,
        message: "Department created successfully"
      });
    } catch (error) {
      logUnexpectedError(console, "Error creating department", error, { ignore: [isDuplicateEntryError] });
      if (isDuplicateEntryError(error)) {
        return badRequest(res, "Department name already exists");
      }
      return serverError(res, "Failed to create department", error);
    }
  });

  router.put("/departments/:id", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { name, description } = req.body;
    const departmentId = parsePositiveInteger(id);

    if (!departmentId) {
      return badRequest(res, "Invalid department ID");
    }

    // M-7: Length cap
    if (!hasText(name, 100)) {
      return badRequest(res, "Department name is required and must be 100 characters or fewer");
    }

    const missingFieldError = ensureRequiredFields({ "Department name": name });
    if (missingFieldError) {
      return badRequest(res, missingFieldError);
    }

    try {
      // Captured so the audit entry records a rename as before -> after, not
      // merely that a department "was updated".
      const [priorRows] = await db.execute(
        "SELECT name, description FROM departments WHERE id = ?",
        [departmentId]
      );

      await db.execute(
        "UPDATE departments SET name = ?, description = ? WHERE id = ?",
        [name.trim(), description || null, departmentId]
      );

      await logAudit(
        req.user.id,
        "update_department",
        departmentId,
        JSON.stringify({
          previous: priorRows?.[0] ?? null,
          updated: { name: name.trim(), description: description || null }
        })
      );

      res.json({ success: true, message: "Department updated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error updating department", error, { ignore: [isDuplicateEntryError] });
      if (isDuplicateEntryError(error)) {
        return badRequest(res, "Department name already exists");
      }
      return serverError(res, "Failed to update department", error);
    }
  });

  router.delete("/departments/:id", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const departmentId = parsePositiveInteger(id);

    if (!departmentId) {
      return badRequest(res, "Invalid department ID");
    }

    try {
      const [requisitions] = await db.execute(
        "SELECT COUNT(*) as count FROM requisitions WHERE department_id = ?",
        [departmentId]
      );
      if (requisitions[0].count > 0) {
        return badRequest(res, "Cannot delete department that has associated requisitions");
      }

      // RETURNING captures what was removed: once the row is gone the audit
      // entry is the only remaining record of what the department was called.
      const [deleted] = await db.execute(
        "DELETE FROM departments WHERE id = ? RETURNING name, description",
        [departmentId]
      );

      await logAudit(
        req.user.id,
        "delete_department",
        departmentId,
        JSON.stringify({ deleted: deleted?.[0] ?? null })
      );

      res.json({ success: true, message: "Department deleted successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error deleting department", error);
      return serverError(res, "Failed to delete department", error);
    }
  });

  return router;
}
