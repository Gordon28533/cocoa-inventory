import { once } from "node:events";
import http from "node:http";
import jwt from "jsonwebtoken";
import { createBackendApp } from "./app.js";

function createNoopLogger() {
  const noop = () => {};
  return {
    log: noop,
    error: noop,
    warn: noop,
    info: noop
  };
}

export function createMockDatabaseManager({ db = null, status } = {}) {
  const databaseStatus = status || (db ? "connected" : "disconnected");

  return {
    async connect() {
      return !!db;
    },
    async ensureSchema() {},
    getDb() {
      return db;
    },
    getDatabaseStatus() {
      return databaseStatus;
    },
    requireDatabase(req, res, next) {
      if (!db) {
        return res.status(503).json({ error: "Database not available" });
      }

      next();
    }
  };
}

// auth.js re-reads the user's live status on every authenticated request (H-1).
// That lookup was added after these tests were written, so every test's SQL
// matcher rejects it with "Unexpected SQL" and the request 503s before reaching
// the route under test. Handling it centrally here keeps each test file focused
// on the query it actually cares about.
const AUTH_LOOKUP_SQL =
  'SELECT "isActive", role, department_id FROM users WHERE id = ?';

const normalizeSql = (sql) =>
  typeof sql === "string" ? sql.replace(/\s+/g, " ").trim() : sql;

/**
 * @param {object|null} authUser  Row returned for the live-user lookup.
 *   Defaults to `{ isActive: 1 }` — deliberately omitting role and
 *   department_id, because auth.js overrides req.user.role only when the row
 *   supplies one. Leaving them undefined preserves the claims in the test's own
 *   JWT, which is what these tests assert against. Pass `null` to simulate a
 *   deleted user, or `{ isActive: 0 }` to simulate a deactivated one.
 */
export function createMockDb({ execute, query, authUser = { isActive: 1 } } = {}) {
  const executeHandler = execute || (async () => [[]]);
  const queryHandler = query || executeHandler;

  const withAuthLookup = (handler) => async (sql, params) => {
    if (normalizeSql(sql) === AUTH_LOOKUP_SQL) {
      return [authUser ? [authUser] : []];
    }
    return handler(sql, params);
  };

  const mock = {
    execute: withAuthLookup(executeHandler),
    query: withAuthLookup(queryHandler),
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    // C-1: pool path in withTransaction calls getConnection() — return self so the
    //      same mock methods are used for both pool and connection code paths
    async getConnection() {
      return { ...mock, release() {} };
    }
  };

  return mock;
}

export function createTestToken(payload = {}, secret = "test-secret") {
  return jwt.sign(
    {
      id: 1,
      staffName: "tester",
      role: "user",
      ...payload
    },
    secret,
    { expiresIn: "1h" }
  );
}

export async function withTestApp(options, run) {
  const {
    databaseManager = createMockDatabaseManager(),
    env = {},
    logger = createNoopLogger()
  } = options || {};
  const testEnv = {
    NODE_ENV: "test",
    JWT_SECRET: "test-secret",
    ...env
  };
  const { app } = createBackendApp({
    env: testEnv,
    logger,
    databaseManager
  });
  const server = http.createServer(app);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    return await run({ baseUrl, env: testEnv });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

export async function fetchJson(baseUrl, path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json();
  return { response, data };
}
