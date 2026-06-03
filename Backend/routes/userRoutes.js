import crypto from "crypto";
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
  toNullablePositiveInteger,
  validatePassword
} from "../lib/validation.js";

export function createUserRouter({ getDb, requireAdmin, requireDatabase, logAudit }) {
  const router = express.Router();

  router.get("/users", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();

    try {
      // L-1: Explicit columns — never expose the password hash
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

      if (
        department_id !== undefined &&
        toNullablePositiveInteger(department_id) === null &&
        department_id !== null &&
        department_id !== ""
      ) {
        return badRequest(res, "Invalid department ID");
      }

      // M-7: Cap string field lengths
      if (staffName !== undefined && !hasText(staffName, 100)) {
        return badRequest(res, "Staff name must be between 1 and 100 characters");
      }
      if (staffId !== undefined && !hasText(staffId, 50)) {
        return badRequest(res, "Staff ID must be between 1 and 50 characters");
      }

      const updateFields = [];
      const params = [];

      if (hasText(staffName, 100)) {
        updateFields.push("staffName = ?");
        params.push(staffName.trim());
      }
      if (hasText(staffId, 50)) {
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
        // H-6: Validate new password on admin-set passwords too
        const passwordError = validatePassword(password);
        if (passwordError) {
          return badRequest(res, passwordError);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push("password = ?");
        params.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return badRequest(res, "No fields to update");
      }

      params.push(userId);
      await db.execute(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, params);

      // H-5: Audit user updates
      await logAudit(
        req.user.id,
        "update_user",
        userId,
        JSON.stringify({ updatedFields: updateFields.map((f) => f.split(" ")[0]) })
      );

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

      // H-5: Audit user deletion
      await logAudit(req.user.id, "delete_user", userId);

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

      // H-5: Audit deactivation
      await logAudit(req.user.id, "deactivate_user", userId);

      res.json({ success: true, message: "User deactivated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error deactivating user", error);
      return serverError(res, "Failed to deactivate user");
    }
  });

  // H-3: Symmetric activate endpoint to match deactivate
  router.patch("/users/:id/activate", requireAdmin, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const userId = parsePositiveInteger(id);

    if (!userId) {
      return badRequest(res, "Invalid user ID");
    }

    try {
      await db.execute("UPDATE users SET isActive = 1 WHERE id = ?", [userId]);

      // H-5: Audit reactivation
      await logAudit(req.user.id, "activate_user", userId);

      res.json({ success: true, message: "User activated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error activating user", error);
      return serverError(res, "Failed to activate user");
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

    // M-7: Cap lengths at schema column sizes
    if (!hasText(staffName, 100)) {
      return badRequest(res, "Staff name must be between 1 and 100 characters");
    }
    if (!hasText(staffId, 50)) {
      return badRequest(res, "Staff ID must be between 1 and 50 characters");
    }

    if (
      department_id !== undefined &&
      toNullablePositiveInteger(department_id) === null &&
      department_id !== null &&
      department_id !== ""
    ) {
      return badRequest(res, "Invalid department ID");
    }

    // H-2: Generate a cryptographically random temporary password instead of
    //       the predictable staffName+staffId default
    let generatedPassword = null;
    if (!hasText(password)) {
      generatedPassword = crypto.randomBytes(8).toString("hex");
      password = generatedPassword;
    } else {
      // H-6: Validate explicitly provided passwords
      const passwordError = validatePassword(password);
      if (passwordError) {
        return badRequest(res, passwordError);
      }
    }

    try {
      staffName = staffName.trim();
      staffId   = staffId.trim();

      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        "INSERT INTO users (staffName, staffId, password, role, department_id, isActive) VALUES (?, ?, ?, ?, ?, 1)",
        [staffName, staffId, hashedPassword, role, toNullablePositiveInteger(department_id)]
      );

      // H-5: Audit user creation
      await logAudit(
        req.user.id,
        "create_user",
        result.insertId,
        JSON.stringify({ staffName, staffId, role })
      );

      res.status(201).json({
        success: true,
        message: "User created successfully",
        userId: result.insertId,
        // H-2: Return the generated password once so the admin can hand it to the user
        ...(generatedPassword ? { temporaryPassword: generatedPassword } : {})
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
      // M-6: Limit logs to 200 most-recent entries; use explicit columns
      const [rows] = await db.execute(
        `SELECT l.id, l.user_id, l.action, l.requisition_id, l.details, l.timestamp,
                u.staffName
         FROM audit_logs l
         LEFT JOIN users u ON l.user_id = u.id
         ORDER BY l.timestamp DESC
         LIMIT 200`
      );
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching audit logs", error);
      return serverError(res, "Failed to fetch audit logs");
    }
  });

  return router;
}
