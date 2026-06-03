import express from "express";
import {
  badRequest,
  isDuplicateEntryError,
  logUnexpectedError,
  serverError
} from "../lib/httpResponses.js";
import { ensureRequiredFields, hasText, parsePositiveInteger } from "../lib/validation.js";

export function createDepartmentRouter({ getDb, requireAuth, requireAdmin, requireDatabase }) {
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
      return serverError(res, "Failed to fetch departments");
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
      return serverError(res, "Failed to create department");
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
      await db.execute(
        "UPDATE departments SET name = ?, description = ? WHERE id = ?",
        [name.trim(), description || null, departmentId]
      );
      res.json({ success: true, message: "Department updated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error updating department", error, { ignore: [isDuplicateEntryError] });
      if (isDuplicateEntryError(error)) {
        return badRequest(res, "Department name already exists");
      }
      return serverError(res, "Failed to update department");
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

      await db.execute("DELETE FROM departments WHERE id = ?", [departmentId]);
      res.json({ success: true, message: "Department deleted successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error deleting department", error);
      return serverError(res, "Failed to delete department");
    }
  });

  return router;
}
