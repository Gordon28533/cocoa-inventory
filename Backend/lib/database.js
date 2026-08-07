import pg from "pg";
import {
  ADMIN_STAFF_NAME,
  ADMIN_STAFF_ID,
  ADMIN_PASSWORD_HASH,
} from "./config.js";

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
      // staffId was added to users after the initial deployment; add it as nullable
      // so existing rows are not broken, then patch them below.
      await runIfColumnMissing(db, "users", "staffId",
        `ALTER TABLE users ADD COLUMN "staffId" VARCHAR(50) DEFAULT ''`);

      // ── Initial seed data (idempotent) ────────────────────────────────────
      // Insert default departments if they don't exist yet.
      await db.execute(`
        INSERT INTO departments (name, description, is_head_office) VALUES
          ('Head Office',             'Head office approvals and fulfillment', 1),
          ('Tema Takeover Center',    'Tema branch operations',                0),
          ('Kumasi Takeover Center',  'Kumasi branch operations',              0),
          ('Takoradi Takeover Center','Takoradi branch operations',            0),
          ('IT',                      'Information Technology',                0),
          ('HR',                      'Human Resources',                       0),
          ('Finance',                 'Finance Department',                    0),
          ('Stores',                  'Stores Department',                     0)
        ON CONFLICT (name) DO NOTHING
      `, []);

      // Insert default admin user if not present yet.
      // Credentials and password hash are read from config.js (env-driven).
      // Override ADMIN_STAFF_NAME, ADMIN_STAFF_ID, and ADMIN_PASSWORD_HASH in
      // environment variables to avoid deploying with the default password.
      //
      // IMPORTANT: this must use VALUES, not `SELECT $1, $2, $3 … WHERE NOT
      // EXISTS (…)`. PostgreSQL gives a bare SELECT list of bind parameters no
      // type context, so that form fails at parse time with
      //   "could not determine data type of parameter $1"
      // which aborted the whole seed block and left the deployment with no
      // admin account at all. With VALUES, PostgreSQL infers each parameter's
      // type from the target column. `ON CONFLICT DO NOTHING` without a
      // conflict target makes the statement safe against any unique violation
      // ("staffName" or "staffId") when it re-runs on every boot.
      await db.execute(
        `INSERT INTO users ("staffName", "staffId", password, role, department_id, "isActive")
         VALUES ($1, $2, $3, 'admin',
                 (SELECT id FROM departments WHERE name = 'Head Office' LIMIT 1),
                 1)
         ON CONFLICT DO NOTHING`,
        [ADMIN_STAFF_NAME, ADMIN_STAFF_ID, ADMIN_PASSWORD_HASH]
      );

      // Patch the admin account: if the row pre-dates the staffId column, it will
      // have an empty staffId. Ensure it is always set to the canonical value.
      await db.execute(
        `UPDATE users SET "staffId" = $1
         WHERE "staffName" = $2 AND ("staffId" IS NULL OR "staffId" = '')`,
        [ADMIN_STAFF_ID, ADMIN_STAFF_NAME]
      );

      // Verify the bootstrap actually landed. A silent failure here is the
      // difference between a working deployment and one nobody can log into,
      // so it is worth an explicit check rather than assuming the INSERT ran.
      const [adminRows] = await db.execute(
        `SELECT id, "staffId", role, "isActive" FROM users WHERE "staffId" = $1`,
        [ADMIN_STAFF_ID]
      );

      if (adminRows.length === 0) {
        logger.error(
          `ADMIN BOOTSTRAP FAILED — no user row with staffId="${ADMIN_STAFF_ID}". ` +
          `Every login attempt will be rejected until this is resolved.`
        );
      } else {
        logger.log(
          `Admin account present — staffId="${adminRows[0].staffId}", ` +
          `role="${adminRows[0].role}", isActive=${adminRows[0].isActive}`
        );
      }

      const [countRows] = await db.execute(
        "SELECT COUNT(*)::int AS count FROM users",
        []
      );
      logger.log(
        `Schema check complete — ${countRows[0].count} user account(s) in database`
      );
    } catch (error) {
      // Surface the full PostgreSQL error detail. Logging the bare error object
      // hid the root cause of the admin-bootstrap failure for an entire
      // deployment cycle, so each diagnostic field is printed explicitly.
      logger.error("Schema check/update FAILED:", error.message);
      if (error.code)     logger.error("  pg code:  ", error.code);
      if (error.detail)   logger.error("  detail:   ", error.detail);
      if (error.hint)     logger.error("  hint:     ", error.hint);
      if (error.position) logger.error("  position: ", error.position);
      logger.error(error.stack);
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
