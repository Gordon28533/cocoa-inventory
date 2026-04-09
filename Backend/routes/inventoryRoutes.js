import express from "express";
import {
  badRequest,
  forbidden,
  isForeignKeyConstraintError,
  logUnexpectedError,
  serverError
} from "../lib/httpResponses.js";
import { canManageInventory } from "../lib/roles.js";
import { ensureRequiredFields, hasText, isNonNegativeNumber } from "../lib/validation.js";

export function createInventoryRouter({ getDb, requireAuth, requireDatabase }) {
  const router = express.Router();

  router.get("/items", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();

    try {
      const [rows] = await db.execute("SELECT * FROM inventory ORDER BY name");
      res.json(rows);
    } catch (error) {
      logUnexpectedError(console, "Error fetching inventory", error);
      return serverError(res, "Failed to fetch inventory");
    }
  });

  router.post("/items", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id, name, category, type, quantity } = req.body;
    const missingFieldError = ensureRequiredFields({
      "Item ID": id,
      Name: name,
      Category: category,
      Type: type
    });

    if (!canManageInventory(req.user)) {
      return forbidden(res, "Not authorized to add items");
    }

    if (missingFieldError || !isNonNegativeNumber(quantity) || !hasText(id) || !hasText(name) || !hasText(category) || !hasText(type)) {
      return badRequest(res, "Invalid item data");
    }

    try {
      await db.execute(
        "INSERT INTO inventory (id, name, category, type, quantity) VALUES (?, ?, ?, ?, ?)",
        [id.trim(), name.trim(), category.trim(), type.trim(), quantity]
      );
      res.status(201).json({ id: id.trim(), name: name.trim(), category: category.trim(), type: type.trim(), quantity });
    } catch (error) {
      logUnexpectedError(console, "Error adding item", error);
      return serverError(res, "Failed to add item");
    }
  });

  router.put("/items/:id", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const { quantity } = req.body;

    if (!hasText(id)) {
      return badRequest(res, "Invalid item ID");
    }

    if (!canManageInventory(req.user)) {
      return forbidden(res, "Not authorized to update items");
    }

    if (!isNonNegativeNumber(quantity)) {
      return badRequest(res, "Invalid quantity value");
    }

    try {
      await db.execute("UPDATE inventory SET quantity = ? WHERE id = ?", [quantity, id.trim()]);
      res.json({ success: true, message: "Item updated successfully" });
    } catch (error) {
      logUnexpectedError(console, "Error updating item", error);
      return serverError(res, "Failed to update item");
    }
  });

  router.delete("/items/:id", requireAuth, requireDatabase, async (req, res) => {
    const db = getDb();
    const { id } = req.params;

    if (!hasText(id)) {
      return badRequest(res, "Invalid item ID");
    }

    if (!canManageInventory(req.user)) {
      return forbidden(res, "Not authorized to delete items");
    }

    try {
      await db.execute("DELETE FROM inventory WHERE id = ?", [id.trim()]);
      res.json({ success: true, message: "Item deleted successfully" });
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        return badRequest(res, "Cannot delete item that is referenced by requisitions");
      }

      logUnexpectedError(console, "Error deleting item", error);
      return serverError(res, "Failed to delete item");
    }
  });

  return router;
}
