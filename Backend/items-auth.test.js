 
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
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 11);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM inventory ORDER BY name")) {
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
});
