import pg from "pg";

const { Pool } = pg;

export function createDatabaseManager({ env = process.env, logger = console } = {}) {
  let pool = null;

  // ── Compatibility helpers ─────────────────────────────────────────────────
  //
  // The rest of the codebase was written for mysql2, which uses:
  //   • ? placeholders
  //   • db.execute(sql, params) → [rows, fields]
  //   • db.query(sql, params)   → [ResultSetHeader, fields]  (INSERT/UPDATE/DELETE)
  //   • pool.getConnection() / conn.release()
  //
  // This shim makes pg behave the same way so no route file needs changing.
  // ─────────────────────────────────────────────────────────────────────────

  /** Convert MySQL ? placeholders to PostgreSQL $1, $2, … */
  function convertPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  /**
   * Run a query against any pg Pool or PoolClient.
   * Returns [rows] to mirror mysql2's destructured response.
   * For INSERT statements without RETURNING, automatically appends
   * "RETURNING id" so callers can read rows.insertId (= rows[0].id).
   */
  async function pgQuery(client, sql, params = []) {
    const isInsert = /^\s*INSERT\b/i.test(sql);
    let finalSql = convertPlaceholders(sql);

    if (isInsert && !/\bRETURNING\b/i.test(finalSql)) {
      finalSql += " RETURNING id";
    }

    const result = await client.query(finalSql, params);
    const rows = result.rows;

    // Attach insertId on the array object so callers can do:
    //   const [result] = await db.query(...); result.insertId
    if (isInsert && rows.length > 0) {
      rows.insertId = rows[0].id;
    }

    return [rows];
  }

  /**
   * Wrap a checked-out pg PoolClient to look like a mysql2 Connection.
   * Used by withTransaction() in lib/requisitions.js.
   */
  function wrapConnection(client) {
    return {
      execute:         (sql, params) => pgQuery(client, sql, params),
      query:           (sql, params) => pgQuery(client, sql, params),
      beginTransaction: ()           => client.query("BEGIN"),
      commit:           ()           => client.query("COMMIT"),
      rollback:         ()           => client.query("ROLLBACK"),
      release:          ()           => client.release(),
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function getDb() {
    if (!pool) return null;
    return {
      execute:       (sql, params) => pgQuery(pool, sql, params),
      query:         (sql, params) => pgQuery(pool, sql, params),
      /** Mirrors mysql2 pool.getConnection() – used by withTransaction() */
      getConnection: async () => {
        const client = await pool.connect();
        return wrapConnection(client);
      },
    };
  }

  function getDatabaseStatus() {
    return pool ? "connected" : "disconnected";
  }

  async function connect() {
    try {
      if (!env.DATABASE_URL) {
        logger.error("Missing required DATABASE_URL environment variable");
        return false;
      }

      pool = new Pool({
        connectionString: env.DATABASE_URL,
        // Render (and most hosted PG services) require SSL in production.
        // rejectUnauthorized:false is safe here because the connection string
        // already contains the correct host / credentials.
        ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      });

      // Verify connectivity before reporting success
      const client = await pool.connect();
      client.release();

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

  // ── Schema helpers ────────────────────────────────────────────────────────

  /**
   * Add `column` to `table` only when it does not already exist.
   * Uses information_schema so it is safe to call on every startup.
   */
  async function runIfColumnMissing(db, table, column, alterSql) {
    // NOTE: SQL already uses $1/$2 (not ?), so convertPlaceholders is a no-op.
    const [rows] = await db.execute(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column]
    );
    if (!rows.length) {
      logger.log(`Adding column ${table}.${column}…`);
      await db.execute(alterSql, []);
    }
  }

  async function ensureSchema() {
    if (!pool) return;

    const db = getDb();

    try {
      // ── Core tables ───────────────────────────────────────────────────────
      // SMALLINT is used for boolean-like columns so that existing code which
      // inserts/compares 0 and 1 continues to work without changes.

      await db.execute(`
        CREATE TABLE IF NOT EXISTS departments (
          id             SERIAL       PRIMARY KEY,
          name           VARCHAR(100) NOT NULL UNIQUE,
          description    TEXT,
          is_head_office SMALLINT     NOT NULL DEFAULT 0
        )
      `, []);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL       PRIMARY KEY,
          "staffName"   VARCHAR(100) NOT NULL UNIQUE,
          "staffId"     VARCHAR(50)  NOT NULL UNIQUE,
          password      TEXT         NOT NULL,
          role          VARCHAR(50)  NOT NULL DEFAULT 'user',
          department_id INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
          "isActive"    SMALLINT     NOT NULL DEFAULT 1,
          created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
        )
      `, []);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS inventory (
          id            VARCHAR(50)  PRIMARY KEY,
          name          VARCHAR(255) NOT NULL,
          category      VARCHAR(100),
          quantity      INTEGER      NOT NULL DEFAULT 0,
          unit          VARCHAR(50),
          reorder_level INTEGER      NOT NULL DEFAULT 0,
          description   TEXT,
          created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
        )
      `, []);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS requisitions (
          id                         SERIAL       PRIMARY KEY,
          item_id                    VARCHAR(50)  NOT NULL,
          requested_by               VARCHAR(100),
          department                 VARCHAR(100),
          department_id              INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
          quantity                   INTEGER      NOT NULL DEFAULT 1,
          status                     VARCHAR(50)  NOT NULL DEFAULT 'pending',
          unique_code                VARCHAR(20),
          is_it_item                 SMALLINT     NOT NULL DEFAULT 0,
          is_head_office             SMALLINT     NOT NULL DEFAULT 0,
          batch_id                   VARCHAR(50),
          created_at                 TIMESTAMP    NOT NULL DEFAULT NOW(),
          hod_approved_by            INTEGER,
          branch_account_approved_by INTEGER,
          ho_account_approved_by     INTEGER,
          it_approved_by             INTEGER,
          account_approved_by        INTEGER,
          fulfilled_by               VARCHAR(100),
          rejected_by                INTEGER
        )
      `, []);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id             SERIAL       PRIMARY KEY,
          user_id        INTEGER      REFERENCES users(id) ON DELETE SET NULL,
          action         VARCHAR(100) NOT NULL,
          requisition_id INTEGER,
          details        TEXT,
          timestamp      TIMESTAMP    NOT NULL DEFAULT NOW()
        )
      `, []);

      // ── Post-create seeds / idempotent migrations ─────────────────────────

      // Flag the canonical Head Office department
      await db.execute(
        `UPDATE departments SET is_head_office = 1
         WHERE name = 'Head Office' AND is_head_office = 0`,
        []
      );

      // Ensure late-added columns are present on existing deployments
      await runIfColumnMissing(db, "departments",  "is_head_office",
        "ALTER TABLE departments ADD COLUMN is_head_office SMALLINT NOT NULL DEFAULT 0");
      await runIfColumnMissing(db, "requisitions", "is_head_office",
        "ALTER TABLE requisitions ADD COLUMN is_head_office SMALLINT NOT NULL DEFAULT 0");
      await runIfColumnMissing(db, "audit_logs",   "details",
        "ALTER TABLE audit_logs ADD COLUMN details TEXT NULL");
      await runIfColumnMissing(db, "requisitions", "rejected_by",
        "ALTER TABLE requisitions ADD COLUMN rejected_by INTEGER NULL");

      logger.log("Schema check complete");
    } catch (error) {
      logger.error("Schema check/update failed:", error);
    }
  }

  return {
    connect,
    ensureSchema,
    getDb,
    getDatabaseStatus,
    requireDatabase,
  };
}
