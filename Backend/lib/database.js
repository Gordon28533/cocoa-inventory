import mysql from "mysql2/promise";

export function createDatabaseManager({ env = process.env, logger = console } = {}) {
  let pool = null;

  function getDb() {
    return pool;
  }

  function getDatabaseStatus() {
    return pool ? "connected" : "disconnected";
  }

  async function connect() {
    try {
      if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
        logger.error("Missing required database environment variables");
        return false;
      }

      pool = mysql.createPool({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASS || "",
        database: env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Verify the pool can actually reach the server before reporting success
      const conn = await pool.getConnection();
      conn.release();

      logger.log("Database connected successfully");
      return true;
    } catch (error) {
      logger.error("Database connection failed:", error.message);
      pool = null;
      return false;
    }
  }

  function requireDatabase(req, res, next) {
    if (!pool) {
      return res.status(503).json({ error: "Database not available" });
    }

    next();
  }

  async function runIfColumnMissing(db, table, column, alterSql) {
    const [rows] = await db.execute(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    if (!rows.length) {
      logger.log(`Adding column ${table}.${column}…`);
      await db.execute(alterSql);
    }
  }

  async function ensureSchema() {
    if (!pool) {
      return;
    }

    const db = pool;

    try {
      // ── Legacy fix: requisitions.item_id must be VARCHAR ──────────────────
      const [rows] = await db.execute(
        `SELECT DATA_TYPE FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'requisitions' AND column_name = 'item_id'`
      );
      const itemIdType = rows?.[0] ? String(rows[0].DATA_TYPE || "").toLowerCase() : null;

      if (itemIdType && !itemIdType.startsWith("varchar")) {
        logger.log("Altering requisitions.item_id to VARCHAR(50)…");

        const [fkRows] = await db.execute(
          `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requisitions' AND COLUMN_NAME = 'item_id' AND REFERENCED_TABLE_NAME IS NOT NULL`
        );

        if (fkRows.length) {
          const fkName = fkRows[0].CONSTRAINT_NAME;
          await db.execute(`ALTER TABLE requisitions DROP FOREIGN KEY \`${fkName}\``);
        }

        await db.execute("ALTER TABLE requisitions MODIFY item_id VARCHAR(50) NOT NULL");

        const [invCol] = await db.execute(
          `SELECT DATA_TYPE FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'inventory' AND column_name = 'id'`
        );
        const invType = invCol?.[0] ? String(invCol[0].DATA_TYPE || "").toLowerCase() : null;

        if (invType && invType.startsWith("varchar")) {
          await db.execute(
            `ALTER TABLE requisitions
             ADD CONSTRAINT fk_requisitions_item FOREIGN KEY (item_id) REFERENCES inventory(id)
             ON UPDATE CASCADE ON DELETE RESTRICT`
          );
        }

        logger.log("Schema update for requisitions.item_id complete.");
      }

      // ── H-7: is_head_office flag on departments ───────────────────────────
      await runIfColumnMissing(
        db, "departments", "is_head_office",
        "ALTER TABLE departments ADD COLUMN is_head_office TINYINT(1) NOT NULL DEFAULT 0"
      );
      // Seed the flag for the canonical Head Office department
      await db.execute(
        "UPDATE departments SET is_head_office = 1 WHERE name = 'Head Office' AND is_head_office = 0"
      );

      // ── H-7: propagate flag to requisitions so approval logic never uses string matching ──
      await runIfColumnMissing(
        db, "requisitions", "is_head_office",
        "ALTER TABLE requisitions ADD COLUMN is_head_office TINYINT(1) NOT NULL DEFAULT 0"
      );

      // ── H-5: details column on audit_logs for richer audit entries ────────
      await runIfColumnMissing(
        db, "audit_logs", "details",
        "ALTER TABLE audit_logs ADD COLUMN details TEXT NULL"
      );

      // ── M-10: rejected_by column on requisitions ──────────────────────────
      await runIfColumnMissing(
        db, "requisitions", "rejected_by",
        "ALTER TABLE requisitions ADD COLUMN rejected_by INT NULL"
      );

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
