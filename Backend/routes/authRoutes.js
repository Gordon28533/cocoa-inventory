import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { badRequest, logUnexpectedError, notFound, serverError, unauthorized } from "../lib/httpResponses.js";
import { ensureRequiredFields } from "../lib/validation.js";

export function createAuthRouter({
  getDb,
  jwtSecret,
  loginAttempts,
  rateLimit,
  requireAuth,
  requireAdmin,
  requireDatabase
}) {
  const router = express.Router();

  router.get("/auth/validate", requireAuth, (req, res) => {
    res.json({ id: req.user.id, staffName: req.user.staffName, role: req.user.role });
  });

  router.post("/login", rateLimit, requireDatabase, async (req, res) => {
    const db = getDb();
    const { staffName, password } = req.body;
    const missingFieldError = ensureRequiredFields({ staffName, password });

    if (missingFieldError) {
      return badRequest(res, missingFieldError);
    }

    try {
      const [rows] = await db.execute("SELECT * FROM users WHERE staffName = ?", [staffName]);
      if (rows.length > 0) {
        const user = rows[0];
        if (user.isActive === 0 || user.isActive === false) {
          return res.status(403).json({ success: false, error: "Account is deactivated" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
          loginAttempts.delete(req.ip);
          const token = jwt.sign(
            {
              id: user.id,
              staffName: user.staffName,
              role: user.role,
              department_id: user.department_id,
              iat: Math.floor(Date.now() / 1000)
            },
            jwtSecret,
            { expiresIn: "8h" }
          );

          return res.json({
            success: true,
            token,
            role: user.role,
            department_id: user.department_id
          });
        }
      }

      res.status(401).json({ success: false, message: "Invalid credentials" });
    } catch (error) {
      logUnexpectedError(console, "Login error", error);
      return serverError(res, "Login failed");
    }
  });

  router.get("/protected", requireAdmin, (req, res) => {
    res.json({ message: "You are an admin!" });
  });

  router.post("/change-password", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    const missingFieldError = ensureRequiredFields({
      "Old password": oldPassword,
      "New password": newPassword
    });

    if (missingFieldError) {
      return badRequest(res, missingFieldError);
    }

    try {
      const [[user]] = await db.execute("SELECT password FROM users WHERE id = ?", [userId]);
      if (!user) {
        return notFound(res, "User not found.");
      }

      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return unauthorized(res, "Current password is incorrect.");
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await db.execute("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);
      res.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
      logUnexpectedError(console, "Change password error", error);
      return serverError(res, "Failed to change password.");
    }
  });

  router.get("/me", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();

    try {
      const userId = req.user.id;
      const [rows] = await db.execute(
        "SELECT id, staffName, role, department_id FROM users WHERE id = ?",
        [userId]
      );
      if (rows.length === 0) {
        return notFound(res, "User not found");
      }
      res.json(rows[0]);
    } catch (error) {
      logUnexpectedError(console, "Fetch user info error", error);
      return serverError(res, "Failed to fetch user info");
    }
  });

  return router;
}
