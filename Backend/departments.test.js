import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

describe("/departments routes", () => {
  it("lists departments when the database is connected", async () => {
    const db = createMockDb({
      async execute(sql) {
        if (sql.includes("SELECT * FROM departments ORDER BY name")) {
          return [[
            { id: 1, name: "Accounts", description: "Finance team" },
            { id: 2, name: "IT", description: "Technology team" }
          ]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/departments");

        assert.equal(response.status, 200);
        assert.equal(data.length, 2);
        assert.equal(data[0].name, "Accounts");
      }
    );
  });

  it("prevents deleting departments that still have requisitions", async () => {
    const token = createTestToken({ id: 4, role: "admin" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 4);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT COUNT(*) as count FROM requisitions WHERE department_id = ?")) {
          assert.deepEqual(params, [15]);
          return [[{ count: 2 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/departments/15", {
          method: "DELETE",
          headers: authHeaders(token)
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /associated requisitions/i);
      }
    );
  });

  it("rejects invalid department IDs on update", async () => {
    const token = createTestToken({ id: 4, role: "admin" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 4);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/departments/not-valid", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ name: "Updated Department" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid department id/i);
      }
    );
  });

  it("returns a friendly error for duplicate department names", async () => {
    const token = createTestToken({ id: 4, role: "admin" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 4);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("INSERT INTO departments")) {
          assert.equal(params[0], "Accounts");
          const error = new Error("Duplicate entry");
          error.code = "ER_DUP_ENTRY";
          throw error;
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/departments", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ name: "Accounts", description: "Duplicate" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /already exists/i);
      }
    );
  });
});
