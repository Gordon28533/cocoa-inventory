import { describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import {
  createMockDatabaseManager,
  createMockDb,
  createTestToken,
  fetchJson,
  withTestApp
} from "./testUtils.js";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

describe("/users routes", () => {
  it("rejects invalid user IDs on update", async () => {
    const token = createTestToken({ id: 1, role: "admin" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 1);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/users/not-a-number", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ staffName: "Updated" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid user id/i);
      }
    );
  });

  it("rejects non-admin access to the user list", async () => {
    const token = createTestToken({ id: 3, role: "user" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 3);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/users", {
          headers: authHeaders(token)
        });

        assert.equal(response.status, 403);
        assert.match(data.error, /admin access required/i);
      }
    );
  });

  it("rejects invalid roles on user creation", async () => {
    const token = createTestToken({ id: 1, role: "admin" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 1);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/users", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            staffName: "Bad Role",
            staffId: "BR001",
            role: "not_a_real_role"
          })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid role/i);
      }
    );
  });

  it("rejects invalid department IDs on user creation", async () => {
    const token = createTestToken({ id: 1, role: "admin" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 1);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/users", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            staffName: "Alice",
            staffId: "A001",
            role: "user",
            department_id: "abc"
          })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid department id/i);
      }
    );
  });

  it("creates a user with the default generated password when one is not provided", async () => {
    const token = createTestToken({ id: 1, role: "admin" });
    const inserts = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 1);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      },
      async query(sql, params) {
        inserts.push({ sql, params });
        return [{ insertId: 99 }];
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/users", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            staffName: "Alice",
            staffId: "A001",
            role: "user",
            department_id: 7
          })
        });

        assert.equal(response.status, 201);
        assert.equal(data.success, true);
        assert.equal(data.userId, 99);
        assert.equal(inserts.length, 1);
        assert.match(inserts[0].sql, /INSERT INTO users/);
        assert.equal(inserts[0].params[0], "Alice");
        assert.equal(inserts[0].params[1], "A001");
        assert.equal(inserts[0].params[3], "user");
        assert.equal(inserts[0].params[4], 7);
        assert.equal(await bcrypt.compare("AliceA001", inserts[0].params[2]), true);
      }
    );
  });
});
