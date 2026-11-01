 
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMockDatabaseManager,
  createMockDb,
  createTestToken,
  fetchJson,
  withTestApp
} from "./testUtils.js";

describe("/items auth flow", () => {
  it("rejects unauthenticated inventory requests", async () => {
    const db = createMockDb();

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/items");

        assert.equal(response.status, 401);
        assert.match(data.error, /no token provided/i);
      }
    );
  });

  it("returns database unavailable when auth succeeds but no database is connected", async () => {
    const token = createTestToken({ role: "stores" });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager()
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/items", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        assert.equal(response.status, 503);
        assert.match(data.error, /database not available/i);
      }
    );
  });

  it("returns inventory for authenticated users when the database is connected", async () => {
    const token = createTestToken({ id: 11, role: "user" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 11);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM inventory ORDER BY name")) {
          return [[{ id: "INV-1", name: "Mouse", category: "Peripherals", type: "IT", quantity: 12 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/items", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        assert.equal(response.status, 200);
        assert.deepEqual(data, [
          { id: "INV-1", name: "Mouse", category: "Peripherals", type: "IT", quantity: 12 }
        ]);
      }
    );
  });

  // PUT /items/:id had no test at all, which is how it reached production
  // recording only the new quantity. "Set to 500" is not an adjustment record:
  // it cannot distinguish a correction of +400 from a write-off of -400, and a
  // stock adjustment is exactly the action an auditor needs to reconstruct.
  it("records a stock adjustment as previous, new and delta", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const audits = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT quantity FROM inventory WHERE id = ?")) {
          assert.deepEqual(params, ["INV-1"]);
          return [[{ quantity: 120 }]];
        }
        if (sql.includes("UPDATE inventory SET quantity = ?")) {
          assert.deepEqual(params, [40, "INV-1"]);
          return [[]];
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
        const { response } = await fetchJson(baseUrl, "/items/INV-1", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: 40 })
        });
        assert.equal(response.status, 200);
      }
    );

    assert.equal(audits.length, 1, "a stock adjustment must be audited");
    const [userId, action, entityId, details] = audits[0];
    assert.equal(userId, 8);
    assert.equal(action, "update_item");
    assert.equal(entityId, "INV-1");
    assert.deepEqual(JSON.parse(details), {
      previous_quantity: 120,
      new_quantity: 40,
      delta: -80
    });
  });

  it("returns 404 rather than auditing an adjustment to an item that does not exist", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const audits = [];

    const db = createMockDb({
      async execute(sql) {
        if (sql.includes("SELECT quantity FROM inventory WHERE id = ?")) return [[]];
        if (sql.includes("UPDATE inventory SET quantity = ?")) {
          throw new Error("must not update an item that was not found");
        }
        if (sql.includes("INSERT INTO audit_logs")) {
          audits.push(true);
          return [[]];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response } = await fetchJson(baseUrl, "/items/NOPE-9", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: 5 })
        });
        assert.equal(response.status, 404);
      }
    );

    assert.equal(audits.length, 0, "nothing happened, so nothing should be audited");
  });
});
