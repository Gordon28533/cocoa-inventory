import mysql from "mysql2/promise";

export function createDatabaseManager({ env = process.env, logger = console } = {}) {
  let db = null;

  function getDb() {
    return db;
  }

  function getDatabaseStatus() {
    return db ? "connected" : "disconnected";
  }

  async function connect() {
    try {
      if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
        logger.error("Missing required database environment variables");
        return false;
      }

      db = await mysql.createConnection({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASS || "",
        database: env.DB_NAME
      });

      logger.log("Database connected successfully");
      return true;
    } catch (error) {
      logger.error("Database connection failed:", error.message);
      return false;
    }
  }

  function requireDatabase(req, res, next) {
    if (!db) {
      return res.status(503).json({ error: "Database not available" });
    }

    next();
  }

  async function ensureSchema() {
    if (!db) {
      return;
    }

    try {
      const [rows] = await db.execute(
        `SELECT DATA_TYPE, COLUMN_TYPE FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'requisitions' AND column_name = 'item_id'`
      );
      const itemIdType = rows?.[0] ? String(rows[0].DATA_TYPE || "").toLowerCase() : null;

      if (itemIdType && !itemIdType.startsWith("varchar")) {
        logger.log("Altering requisitions.item_id to VARCHAR(50)...");

        const [fkRows] = await db.execute(
          `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requisitions' AND COLUMN_NAME = 'item_id' AND REFERENCED_TABLE_NAME IS NOT NULL`
        );

        if (fkRows.length) {
          const fkName = fkRows[0].CONSTRAINT_NAME;
          logger.log(`Dropping foreign key constraint ${fkName} on requisitions.item_id...`);
          await db.execute(`ALTER TABLE requisitions DROP FOREIGN KEY \`${fkName}\``);
        }

        await db.execute("ALTER TABLE requisitions MODIFY item_id VARCHAR(50) NOT NULL");

        const [invCol] = await db.execute(
          `SELECT DATA_TYPE FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'inventory' AND column_name = 'id'`
        );
        const invType = invCol?.[0] ? String(invCol[0].DATA_TYPE || "").toLowerCase() : null;

        if (invType && invType.startsWith("varchar")) {
          logger.log("Re-adding foreign key for requisitions.item_id -> inventory.id");
          await db.execute(
            `ALTER TABLE requisitions
             ADD CONSTRAINT fk_requisitions_item FOREIGN KEY (item_id) REFERENCES inventory(id)
             ON UPDATE CASCADE ON DELETE RESTRICT`
          );
        }

        logger.log("Schema update for requisitions.item_id complete.");
      }
    } catch (error) {
      logger.error("Schema check/update failed:", error);
    }
  }

  return {
    connect,
    ensureSchema,
    getDb,
    getDatabaseStatus,
    requireDatabase
  };
}
