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

export function createMockDb({ execute, query } = {}) {
  const executeHandler = execute || (async () => [[]]);
  const queryHandler = query || executeHandler;

  return {
    execute: executeHandler,
    query: queryHandler
  };
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
