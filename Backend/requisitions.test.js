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

describe("/requisitions routes", () => {
  it("rejects invalid requisition IDs on approval", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 5);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/nope/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid requisition id/i);
      }
    );
  });

  it("rejects invalid department IDs during requisition creation", async () => {
    const token = createTestToken({ id: 22, role: "user", department_id: 3 });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 22);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            items: [{ id: "INV-9", quantity: 2 }],
            department: "IT",
            department_id: "abc"
          })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid department id/i);
      }
    );
  });

  it("rejects requisitions submitted for another department", async () => {
    const token = createTestToken({ id: 22, role: "user", department_id: 3 });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 22);
          return [[{ isActive: 1 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            items: [{ id: "INV-9", quantity: 2 }],
            department: "IT",
            department_id: 5
          })
        });

        assert.equal(response.status, 403);
        assert.match(data.error, /only submit requisitions for your assigned department/i);
      }
    );
  });

  it("filters requisitions for regular users", async () => {
    const token = createTestToken({ id: 22, role: "user" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 22);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE requested_by = ? ORDER BY created_at DESC")) {
          assert.deepEqual(params, [22]);
          return [[{ id: 5, requested_by: 22, status: "pending" }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions", {
          headers: authHeaders(token)
        });

        assert.equal(response.status, 200);
        assert.deepEqual(data, [{ id: 5, requested_by: 22, status: "pending" }]);
      }
    );
  });

  it("rejects approval for mixed-status batches", async () => {
    const token = createTestToken({ id: 9, role: "account_manager", department_id: 4 });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 9);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE batch_id = ?")) {
          assert.deepEqual(params, ["batch-1"]);
          return [[
            { id: 1, status: "pending", department_id: 4, department: "Branch" },
            { id: 2, status: "hod_approved", department_id: 4, department: "Branch" }
          ]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/1/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ batch_id: "batch-1" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /mixed statuses/i);
      }
    );
  });

  it("approves pending requisitions for a department hod", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 5);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [44]);
          return [[{ id: 44, status: "pending", department_id: 9, department: "Operations", is_it_item: 0 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push({ sql, params });
          return [{ affectedRows: 1 }];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          auditEntries.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/44/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "hod_approved");
        assert.equal(updates.length, 1);
        assert.match(updates[0].sql, /hod_approved_by = \?/);
        assert.deepEqual(updates[0].params, ["hod_approved", 5, 44]);
        assert.deepEqual(auditEntries, [[5, "hod_approve", 44]]);
      }
    );
  });

  it("allows branch account users to approve pending branch requisitions", async () => {
    const token = createTestToken({ id: 15, role: "account", department_id: 4 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 15);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [55]);
          return [[{ id: 55, status: "pending", department_id: 4, department: "Branch Office", is_it_item: 0 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push({ sql, params });
          return [{ affectedRows: 1 }];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          auditEntries.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/55/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "branch_account_approved");
        assert.equal(updates.length, 1);
        assert.match(updates[0].sql, /branch_account_approved_by = \?/);
        assert.deepEqual(updates[0].params, ["branch_account_approved", 15, 55]);
        assert.deepEqual(auditEntries, [[15, "branch_account_approve", 55]]);
      }
    );
  });

  it("allows IT manager approval for IT requisitions after hod approval", async () => {
    const token = createTestToken({ id: 16, role: "it_manager", department_id: 9 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 16);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [56]);
          return [[{ id: 56, status: "hod_approved", department_id: 9, department: "Operations", is_it_item: 1 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push({ sql, params });
          return [{ affectedRows: 1 }];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          auditEntries.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/56/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "it_approved");
        assert.equal(updates.length, 1);
        assert.match(updates[0].sql, /it_approved_by = \?/);
        assert.deepEqual(updates[0].params, ["it_approved", 16, 56]);
        assert.deepEqual(auditEntries, [[16, "it_approve", 56]]);
      }
    );
  });

  it("allows account manager approval for branch-account-approved requisitions", async () => {
    const token = createTestToken({ id: 17, role: "account_manager", department_id: 4 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 17);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [57]);
          return [[{ id: 57, status: "branch_account_approved", department_id: 4, department: "Branch Office", is_it_item: 0 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push({ sql, params });
          return [{ affectedRows: 1 }];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          auditEntries.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/57/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "ho_account_approved");
        assert.equal(updates.length, 1);
        assert.match(updates[0].sql, /ho_account_approved_by = \?/);
        assert.deepEqual(updates[0].params, ["ho_account_approved", 17, 57]);
        assert.deepEqual(auditEntries, [[17, "ho_account_approve", 57]]);
      }
    );
  });

  it("allows account manager approval after IT approval", async () => {
    const token = createTestToken({ id: 18, role: "account_manager", department_id: 9 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 18);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [58]);
          return [[{ id: 58, status: "it_approved", department_id: 9, department: "Head Office", is_it_item: 1 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push({ sql, params });
          return [{ affectedRows: 1 }];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          auditEntries.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/58/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "account_approved");
        assert.equal(updates.length, 1);
        assert.match(updates[0].sql, /account_approved_by = \?/);
        assert.deepEqual(updates[0].params, ["account_approved", 18, 58]);
        assert.deepEqual(auditEntries, [[18, "account_approve", 58]]);
      }
    );
  });

  it("fulfills approved batches for stores with a matching unique code", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE batch_id = ?")) {
          assert.deepEqual(params, ["batch-200"]);
          return [[
            { id: 1, status: "account_approved", unique_code: "ABC123", department: "Branch" },
            { id: 2, status: "account_approved", unique_code: "ABC123", department: "Branch" }
          ]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push({ sql, params });
          return [{ affectedRows: 2 }];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          auditEntries.push(params);
          return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/batch/batch-200/fulfill", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ unique_code: "ABC123", receiver_id: "RCV-7" })
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "fulfilled");
        assert.equal(data.batch_id, "batch-200");
        assert.equal(updates.length, 1);
        assert.deepEqual(updates[0].params, ["fulfilled", 8, 1, 2]);
        assert.deepEqual(auditEntries, [[8, "fulfill", "batch-200"]]);
      }
    );
  });

  it("rejects single-item fulfillment when the unique code does not match", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [71]);
          return [[{ id: 71, status: "account_approved", unique_code: "REAL123", department: "Branch" }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/71/fulfill", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ unique_code: "WRONG123", receiver_id: "RCV-2" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid unique code/i);
      }
    );
  });

  it("rejects blank receiver ids during fulfillment", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [72]);
          return [[{ id: 72, status: "account_approved", unique_code: "READY72", department: "Branch" }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/72/fulfill", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ unique_code: "READY72", receiver_id: "   " })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /receiver staff id is required/i);
      }
    );
  });

  it("looks up requisitions by unique code", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("SELECT * FROM requisitions WHERE unique_code = ?")) {
          assert.deepEqual(params, ["LOOK123"]);
          return [[{ id: 90, unique_code: "LOOK123", status: "account_approved" }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/code/LOOK123", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        assert.equal(response.status, 200);
        assert.equal(data.id, 90);
        assert.equal(data.unique_code, "LOOK123");
      }
    );
  });
});
