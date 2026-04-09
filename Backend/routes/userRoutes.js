import express from "express";
import bcrypt from "bcrypt";
import {
  badRequest,
  isDuplicateEntryError,
  logUnexpectedError,
  serverError
} from "../lib/httpResponses.js";
import { USER_ROLES } from "../lib/roles.js";
import {
  ensureRequiredFields,
  hasText,
  parsePositiveInteger,
  toNullablePositiveInteger
} from "../lib/validation.js";

export function createUserRouter({ getDb, requireAdmin, requireDatabase }) {
  const router = express.Router();

  router.get("/users", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();

    try {
      const [rows] = await db.execute(
        "SELECT id, staffName, staffId, role, department_id, isActive FROM users ORDER BY staffName"
      );
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching users", error);
      return serverError(res, "Failed to fetch users");
    }
  });

  router.put("/users/:id", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { staffName, staffId, password, role, department_id } = req.body;
    const userId = parsePositiveInteger(id);

    if (!userId) {
      return badRequest(res, "Invalid user ID");
    }

    try {
      if (role && !USER_ROLES.includes(role)) {
        return badRequest(res, "Invalid role");
      }

      if (department_id !== undefined && toNullablePositiveInteger(department_id) === null && department_id !== null && department_id !== "") {
        return badRequest(res, "Invalid department ID");
      }

      const updateFields = [];
      const params = [];

      if (hasText(staffName)) {
        updateFields.push("staffName = ?");
        params.push(staffName.trim());
      }
      if (hasText(staffId)) {
        updateFields.push("staffId = ?");
        params.push(staffId.trim());
      }
      if (role) {
        updateFields.push("role = ?");
        params.push(role);
      }
      if (department_id !== undefined) {
        updateFields.push("department_id = ?");
        params.push(toNullablePositiveInteger(department_id));
      }
      if (hasText(password)) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push("password = ?");
        params.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return badRequest(res, "No fields to update");
      }

      params.push(userId);
      await db.execute(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, params);
      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error updating user", error, { ignore: [isDuplicateEntryError] });
      if (isDuplicateEntryError(error)) {
        return badRequest(res, "A user with that staff name or staff ID already exists");
      }
      return serverError(res, "Failed to update user");
    }
  });

  router.delete("/users/:id", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const userId = parsePositiveInteger(id);

    if (!userId) {
      return badRequest(res, "Invalid user ID");
    }

    try {
      await db.execute("DELETE FROM users WHERE id = ?", [userId]);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error deleting user", error);
      return serverError(res, "Failed to delete user");
    }
  });

  router.patch("/users/:id/deactivate", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const userId = parsePositiveInteger(id);

    if (!userId) {
      return badRequest(res, "Invalid user ID");
    }

    try {
      await db.execute("UPDATE users SET isActive = 0 WHERE id = ?", [userId]);
      res.json({ success: true, message: "User deactivated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error deactivating user", error);
      return serverError(res, "Failed to deactivate user");
    }
  });

  router.post("/users", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    let { staffName, staffId, password, role, department_id } = req.body;
    const missingFieldError = ensureRequiredFields({
      "Staff name": staffName,
      "Staff ID": staffId,
      Role: role
    });

    if (missingFieldError) {
      return badRequest(res, missingFieldError);
    }

    if (!USER_ROLES.includes(role)) {
      return badRequest(res, "Invalid role");
    }

    if (department_id !== undefined && toNullablePositiveInteger(department_id) === null && department_id !== null && department_id !== "") {
      return badRequest(res, "Invalid department ID");
    }

    try {
      staffName = staffName.trim();
      staffId = staffId.trim();

      if (!hasText(password)) {
        password = `${staffName}${staffId}`;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        "INSERT INTO users (staffName, staffId, password, role, department_id, isActive) VALUES (?, ?, ?, ?, ?, 1)",
        [staffName, staffId, hashedPassword, role, toNullablePositiveInteger(department_id)]
      );

      res.status(201).json({
        success: true,
        message: "User created successfully",
        userId: result.insertId
      });
    } catch (error) {
      logUnexpectedError(console, "Error creating user", error, { ignore: [isDuplicateEntryError] });
      if (isDuplicateEntryError(error)) {
        return badRequest(res, "A user with that staff name or staff ID already exists");
      }
      return serverError(res, "Internal server error");
    }
  });

  router.get("/audit-logs", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();

    try {
      const [rows] = await db.execute(
        "SELECT l.*, u.staffName FROM audit_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.timestamp DESC LIMIT 200"
      );
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching audit logs", error);
      return serverError(res, "Failed to fetch audit logs");
    }
  });

  return router;
}
