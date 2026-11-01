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
    // C-3: GET /departments now requires authentication
    const token = createTestToken({ id: 7, role: "user", department_id: 1 });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 7);
          return [[{ isActive: 1, role: "user", department_id: 1 }]];
        }

        if (sql.includes("FROM departments ORDER BY name")) {
          return [[
            { id: 1, name: "Accounts", description: "Finance team", is_head_office: 0 },
            { id: 2, name: "IT", description: "Technology team", is_head_office: 0 }
          ]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/departments", {
          headers: { Authorization: `Bearer ${token}` }
        });

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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
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

  // Department changes had no audit trail whatsoever. They are not cosmetic: a
  // requisition's approval chain is selected from its department, so renaming
  // or deleting one changes how future requests route and who may approve them.
  it("audits department creation", async () => {
    const token = createTestToken({ id: 4, role: "admin" });
    const audits = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("INSERT INTO departments")) {
          const rows = [];
          rows.insertId = 42;
          return [rows];
        }
        if (sql.includes("INSERT INTO audit_logs")) {
          audits.push(params);
          return [[]];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response } = await fetchJson(baseUrl, "/departments", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ name: "Procurement", description: "New unit" })
        });
        assert.equal(response.status, 201);
      }
    );

    assert.equal(audits.length, 1);
    const [userId, action, , details] = audits[0];
    assert.equal(userId, 4);
    assert.equal(action, "create_department");
    assert.equal(JSON.parse(details).name, "Procurement");
  });

  it("audits a department rename as before and after", async () => {
    const token = createTestToken({ id: 4, role: "admin" });
    const audits = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT name, description FROM departments WHERE id = ?")) {
          return [[{ name: "Accounts", description: "Old text" }]];
        }
        if (sql.startsWith("UPDATE departments SET")) return [[]];
        if (sql.includes("INSERT INTO audit_logs")) {
          audits.push(params);
          return [[]];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response } = await fetchJson(baseUrl, "/departments/7", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ name: "Finance", description: "New text" })
        });
        assert.equal(response.status, 200);
      }
    );

    assert.equal(audits.length, 1);
    const [, action, entityId, details] = audits[0];
    assert.equal(action, "update_department");
    assert.equal(entityId, "7");
    const parsed = JSON.parse(details);
    assert.equal(parsed.previous.name, "Accounts",
      "the entry must say what the department was called before");
    assert.equal(parsed.updated.name, "Finance");
  });

  it("audits a department deletion, capturing what was removed", async () => {
    const token = createTestToken({ id: 4, role: "admin" });
    const audits = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT COUNT(*) as count FROM requisitions")) {
          return [[{ count: 0 }]];
        }
        if (sql.includes("DELETE FROM departments")) {
          assert.match(sql, /RETURNING/i,
            "the deletion must return the row, since afterwards the audit entry is the only record of it");
          return [[{ name: "Retired Unit", description: "Closed" }]];
        }
        if (sql.includes("INSERT INTO audit_logs")) {
          audits.push(params);
          return [[]];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response } = await fetchJson(baseUrl, "/departments/9", {
          method: "DELETE",
          headers: authHeaders(token)
        });
        assert.equal(response.status, 200);
      }
    );

    assert.equal(audits.length, 1, "a deletion must leave a record behind it");
    const [, action, entityId, details] = audits[0];
    assert.equal(action, "delete_department");
    assert.equal(entityId, "9");
    assert.equal(JSON.parse(details).deleted.name, "Retired Unit");
  });
});
