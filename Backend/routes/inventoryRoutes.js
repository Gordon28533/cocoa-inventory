import express from "express";
import {
  badRequest,
  forbidden,
  isForeignKeyConstraintError,
  logUnexpectedError,
  notFound,
  serverError
} from "../lib/httpResponses.js";
import { canManageInventory } from "../lib/roles.js";
import { ensureRequiredFields, hasText, isNonNegativeNumber } from "../lib/validation.js";

export function createInventoryRouter({ getDb, requireAuth, requireDatabase, logAudit }) {
  const router = express.Router();

  // M-6: Accept ?page and ?limit for pagination
  router.get("/items", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 100, 1), 500);
    const offset = Math.max((parseInt(req.query.page) || 1) - 1, 0) * limit;

    try {
      // L-1: Explicit columns
      const [rows] = await db.execute(
        `SELECT id, name, category, type, quantity, reorder_level, unit, updated_at
         FROM inventory ORDER BY name LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching inventory", error);
      return serverError(res, "Failed to fetch inventory", error);
    }
  });

  router.post("/items", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id, name, category, type, quantity } = req.body;

    if (!canManageInventory(req.user)) {
      return forbidden(res, "Not authorized to add items");
    }

    const missingFieldError = ensureRequiredFields({
      "Item ID": id,
      Name: name,
      Category: category,
      Type: type
    });

    // M-7: Apply length caps matching the schema (id VARCHAR(50), name/category/type VARCHAR(100))
    if (
      missingFieldError ||
      !isNonNegativeNumber(quantity) ||
      !hasText(id, 50) ||
      !hasText(name, 100) ||
      !hasText(category, 100) ||
      !hasText(type, 100)
    ) {
      return badRequest(res, missingFieldError || "Invalid item data");
    }

    try {
      await db.execute(
        "INSERT INTO inventory (id, name, category, type, quantity) VALUES (?, ?, ?, ?, ?)",
        [id.trim(), name.trim(), category.trim(), type.trim(), quantity]
      );

      // H-5: Audit inventory creation
      await logAudit(
        req.user.id,
        "create_item",
        id.trim(),
        JSON.stringify({ name: name.trim(), category: category.trim(), quantity })
      );

      res.status(201).json({
        id: id.trim(),
        name: name.trim(),
        category: category.trim(),
        type: type.trim(),
        quantity
      });
    } catch (error) {
      logUnexpectedError(console, "Error adding item", error);
      return serverError(res, "Failed to add item", error);
    }
  });

  router.put("/items/:id", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { quantity } = req.body;

    if (!hasText(id, 50)) {
      return badRequest(res, "Invalid item ID");
    }

    if (!canManageInventory(req.user)) {
      return forbidden(res, "Not authorized to update items");
    }

    if (!isNonNegativeNumber(quantity)) {
      return badRequest(res, "Invalid quantity value");
    }

    try {
      // The audit entry used to record only the new quantity, which cannot be
      // read as an adjustment: "set to 500" says nothing about whether that was
      // a correction of +400 or a write-off of -400. Read the prior value first
      // so the entry carries both.
      //
      // Deliberately a plain SELECT then UPDATE rather than a single
      // UPDATE ... FROM self-join. The single-statement form would close a
      // narrow race where another writer changes the quantity in between, but
      // this is a manual stock adjustment made by a person, not a contended
      // path like fulfilment — which does use a row lock. The race would at
      // worst record a slightly stale "previous"; getting the SQL wrong would
      // break item updates outright on a live system.
      const [priorRows] = await db.execute(
        "SELECT quantity FROM inventory WHERE id = ?",
        [id.trim()]
      );

      if (!priorRows || priorRows.length === 0) {
        return notFound(res, "Item not found");
      }

      const previous = priorRows[0].quantity;

      await db.execute(
        "UPDATE inventory SET quantity = ?, updated_at = NOW() WHERE id = ?",
        [quantity, id.trim()]
      );

      // H-5: Audit inventory update, as a before/after adjustment.
      await logAudit(
        req.user.id,
        "update_item",
        id.trim(),
        JSON.stringify({
          previous_quantity: previous,
          new_quantity: quantity,
          delta: Number(quantity) - Number(previous)
        })
      );

      res.json({ success: true, message: "Item updated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error updating item", error);
      return serverError(res, "Failed to update item", error);
    }
  });

  router.delete("/items/:id", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;

    if (!hasText(id, 50)) {
      return badRequest(res, "Invalid item ID");
    }

    if (!canManageInventory(req.user)) {
      return forbidden(res, "Not authorized to delete items");
    }

    try {
      await db.execute("DELETE FROM inventory WHERE id = ?", [id.trim()]);

      // H-5: Audit inventory deletion
      await logAudit(req.user.id, "delete_item", id.trim());

      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        return badRequest(res, "Cannot delete item that is referenced by requisitions");
      }

      logUnexpectedError(console, "Error deleting item", error);
      return serverError(res, "Failed to delete item", error);
    }
  });

  return router;
}
