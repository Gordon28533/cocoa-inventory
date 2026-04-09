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

describe("/login endpoint", () => {
  it("rejects invalid credentials", async () => {
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT * FROM users WHERE staffName = ?")) {
          assert.equal(params[0], "wronguser");
          return [[]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffName: "wronguser", password: "wrongpass" })
        });

        assert.equal(response.status, 401);
        assert.equal(data.success, false);
        assert.match(data.message, /invalid credentials/i);
      }
    );
  });

  it("returns a token for valid credentials", async () => {
    const passwordHash = await bcrypt.hash("correctpass", 10);
    const db = createMockDb({
      async execute(sql) {
        if (sql.includes("SELECT * FROM users WHERE staffName = ?")) {
          return [[{ id: 7, staffName: "admin", password: passwordHash, role: "admin", department_id: 2, isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffName: "admin", password: "correctpass" })
        });

        assert.equal(response.status, 200);
        assert.equal(data.success, true);
        assert.equal(data.role, "admin");
        assert.equal(data.department_id, 2);
        assert.equal(typeof data.token, "string");
        assert.ok(data.token.length > 20);
      }
    );
  });
});

describe("auth profile routes", () => {
  it("returns the current user profile from /me", async () => {
    const token = createTestToken({ id: 14, role: "account_manager", department_id: 3 });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 14);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT id, staffName, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 14);
          return [[{ id: 14, staffName: "Grace", role: "account_manager", department_id: 3 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        assert.equal(response.status, 200);
        assert.deepEqual(data, {
          id: 14,
          staffName: "Grace",
          role: "account_manager",
          department_id: 3
        });
      }
    );
  });

  it("rejects password changes when the current password is wrong", async () => {
    const token = createTestToken({ id: 12, role: "user" });
    const storedHash = await bcrypt.hash("correct-old-password", 10);
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 12);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT password FROM users WHERE id = ?")) {
          assert.equal(params[0], 12);
          return [[{ password: storedHash }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/change-password", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            oldPassword: "wrong-old-password",
            newPassword: "new-pass-123"
          })
        });

        assert.equal(response.status, 401);
        assert.match(data.error, /current password is incorrect/i);
      }
    );
  });

  it("updates the password when the current password is valid", async () => {
    const token = createTestToken({ id: 12, role: "user" });
    const storedHash = await bcrypt.hash("correct-old-password", 10);
    const updates = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 12);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT password FROM users WHERE id = ?")) {
          assert.equal(params[0], 12);
          return [[{ password: storedHash }]];
        }

        if (sql.includes("UPDATE users SET password = ? WHERE id = ?")) {
          updates.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      {
        databaseManager: createMockDatabaseManager({ db })
      },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/change-password", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            oldPassword: "correct-old-password",
            newPassword: "new-pass-123"
          })
        });

        assert.equal(response.status, 200);
        assert.equal(data.success, true);
        assert.equal(updates.length, 1);
        assert.equal(updates[0][1], 12);
        assert.equal(await bcrypt.compare("new-pass-123", updates[0][0]), true);
      }
    );
  });
});
