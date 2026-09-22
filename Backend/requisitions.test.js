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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 22);
          return [[{ isActive: 1 }]];
        }

        // H-7: When both department and department_id are supplied, the route
        // now looks up is_head_office from the departments table
        if (sql.includes("SELECT is_head_office FROM departments WHERE id = ?")) {
          return [[{ is_head_office: 0 }]];
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 22);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions r") && sql.includes("WHERE r.requested_by = ?")) {
          assert.equal(params[0], 22);
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 9);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE batch_id = ?")) {
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

  // The approval UI identifies a batch by batch_id and sends a placeholder in
  // the :id segment — api.approveRequisition(0, { batch_id }). Every other test
  // here uses a real numeric id, so this path, the only one the interface
  // actually exercises, went uncovered while the route rejected it outright.
  it("approves a batch when the id segment is a placeholder and batch_id is given", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const updates = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE batch_id = ?")) {
          assert.deepEqual(params, ["batch-ui"]);
          return [[{ id: 31, status: "pending", department_id: 9, is_head_office: 1, is_it_item: 0 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) {
          updates.push(params);
          return [[]];
        }

        if (sql.includes("INSERT INTO audit_logs")) {
          return [[]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/0/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ batch_id: "batch-ui" })
        });

        assert.equal(response.status, 200);
        assert.equal(data.success, true);
        assert.equal(data.status, "hod_approved");
      }
    );

    assert.equal(updates.length, 1, "the batch status must actually be written");
  });

  it("rejects a batch when the id segment is a placeholder and batch_id is given", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE batch_id = ?")) {
          assert.deepEqual(params, ["batch-ui"]);
          return [[{ id: 32, status: "pending", department_id: 9, is_head_office: 1, is_it_item: 0 }]];
        }

        if (sql.startsWith("UPDATE requisitions SET")) return [[]];
        if (sql.includes("INSERT INTO audit_logs")) return [[]];

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/0/reject", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ batch_id: "batch-ui", reason: "Not required this quarter" })
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "rejected");
      }
    );
  });

  // Guard the guard: with no batch_id, a bad id must still be refused.
  it("still rejects an invalid requisition id when no batch_id is supplied", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const db = createMockDb({
      async execute(sql) {
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/0/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /invalid requisition id/i);
      }
    );
  });

  it("approves pending requisitions for a department hod", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 5);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
          assert.deepEqual(params, [44]);
          // is_head_office must be stated: an HOD only has a step in the head
          // office chain. This fixture previously omitted the flag, so it read
          // as undefined and the case silently asserted that an HOD may approve
          // a requisition of unspecified origin — which is what allowed the
          // branch-bypass defect to pass review.
          return [[{ id: 44, status: "pending", department_id: 9, department: "Operations", is_head_office: 1, is_it_item: 0 }]];
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
        assert.deepEqual(auditEntries, [[5, "hod_approve", "44", null]]);
      }
    );
  });

  it("allows branch account users to approve pending branch requisitions", async () => {
    const token = createTestToken({ id: 15, role: "account", department_id: 4 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 15);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
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
        assert.deepEqual(auditEntries, [[15, "branch_account_approve", "55", null]]);
      }
    );
  });

  it("allows IT manager approval for IT requisitions after hod approval", async () => {
    const token = createTestToken({ id: 16, role: "it_manager", department_id: 9 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 16);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
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
        assert.deepEqual(auditEntries, [[16, "it_approve", "56", null]]);
      }
    );
  });

  it("allows account manager approval for branch-account-approved requisitions", async () => {
    const token = createTestToken({ id: 17, role: "account_manager", department_id: 4 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 17);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
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
        assert.deepEqual(auditEntries, [[17, "ho_account_approve", "57", null]]);
      }
    );
  });

  it("allows account manager approval after IT approval", async () => {
    const token = createTestToken({ id: 18, role: "account_manager", department_id: 9 });
    const updates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 18);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
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
        assert.deepEqual(auditEntries, [[18, "account_approve", "58", null]]);
      }
    );
  });

  it("fulfills approved batches for stores with a matching unique code", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const updates = [];
    const inventoryUpdates = [];
    const auditEntries = [];
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE batch_id = ?")) {
          assert.deepEqual(params, ["batch-200"]);
          return [[
            { id: 1, item_id: "INV-1", quantity: 2, status: "account_approved", unique_code: "ABC123", department: "Branch" },
            { id: 2, item_id: "INV-1", quantity: 1, status: "account_approved", unique_code: "ABC123", department: "Branch" }
          ]];
        }

        if (sql.includes("SELECT id, quantity FROM inventory WHERE id = ?")) {
          assert.deepEqual(params, ["INV-1"]);
          // The real query takes a row lock; assert it is still doing so.
          assert.ok(sql.includes("FOR UPDATE"), "stock read must lock the row");
          return [[{ id: "INV-1", quantity: 12 }]];
        }

        if (sql.includes("UPDATE inventory SET quantity = quantity - ?")) {
          inventoryUpdates.push({ sql, params });
          // A matched row is returned via RETURNING id.
          return [[{ id: "INV-1" }]];
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
        assert.equal(inventoryUpdates.length, 1);
        // Third parameter is the quantity repeated in the "quantity >= ?" guard.
        assert.deepEqual(inventoryUpdates[0].params, [3, "INV-1", 3]);
        assert.equal(updates.length, 1);
        assert.deepEqual(updates[0].params, ["fulfilled", 8, 1, 2]);
        assert.deepEqual(auditEntries, [[8, "fulfill", "batch-200", null]]);
      }
    );
  });

  it("rejects fulfillment when inventory stock is insufficient", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE batch_id = ?")) {
          assert.deepEqual(params, ["batch-201"]);
          return [[
            { id: 3, item_id: "INV-2", quantity: 5, status: "account_approved", unique_code: "LOW201", department: "Branch" }
          ]];
        }

        if (sql.includes("SELECT id, quantity FROM inventory WHERE id = ?")) {
          assert.deepEqual(params, ["INV-2"]);
          return [[{ id: "INV-2", quantity: 2 }]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/batch/batch-201/fulfill", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ unique_code: "LOW201", receiver_id: "RCV-9" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /insufficient stock for item inv-2/i);
      }
    );
  });

  it("rejects fulfillment when stock is taken by a competing transaction after the check", async () => {
    // Simulates the race the row lock exists to prevent: the availability read
    // still reports enough stock, but by the time the decrement runs another
    // transaction has already taken it, so no row satisfies "quantity >= ?".
    // The conditional UPDATE must catch this rather than deducting anyway.
    const token = createTestToken({ id: 8, role: "stores" });
    let rolledBack = false;

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE batch_id = ?")) {
          return [[
            { id: 9, item_id: "INV-3", quantity: 4, status: "account_approved", unique_code: "RACE1", department: "Branch" }
          ]];
        }

        if (sql.includes("SELECT id, quantity FROM inventory WHERE id = ?")) {
          assert.ok(sql.includes("FOR UPDATE"), "stock read must lock the row");
          return [[{ id: "INV-3", quantity: 4 }]];   // looks sufficient
        }

        if (sql.includes("UPDATE inventory SET quantity = quantity - ?")) {
          assert.ok(
            sql.includes("quantity >= ?"),
            "the decrement must re-assert availability in its WHERE clause"
          );
          return [[]];                                // no row matched — stock gone
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    db.rollback = async () => { rolledBack = true; };

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/batch/batch-race/fulfill", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ unique_code: "RACE1", receiver_id: "RCV-9" })
        });

        assert.equal(response.status, 400);
        assert.match(data.error, /insufficient stock for item inv-3/i);
      }
    );

    assert.equal(rolledBack, true, "the transaction must roll back, leaving stock untouched");
  });

  it("rejects single-item fulfillment when the unique code does not match", async () => {
    const token = createTestToken({ id: 8, role: "stores" });
    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE id = ?")) {
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
        if (sql.includes("SELECT isActive, role, department_id FROM users WHERE id = ?")) {
          assert.equal(params[0], 8);
          return [[{ isActive: 1 }]];
        }

        if (sql.includes("FROM requisitions WHERE unique_code = ?")) {
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

  // An approver cannot act on a stock code and a user id. The list query must
  // resolve both to names, and must do so with LEFT joins so a requisition whose
  // item or requester was later deleted still appears in the queue.
  it("returns the item name and the requester's name to an approver", async () => {
    const token = createTestToken({ id: 7, role: "hod", department_id: 3 });
    let seen = "";

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions r")) {
          seen = sql.replace(/\s+/g, " ");
          assert.equal(params[0], 3, "an HOD's queue is scoped to their department");
          return [[{
            id: 12, item_id: "INV-7", quantity: 4, status: "pending",
            requested_by: "31", department_id: 3, batch_id: "b-1",
            item_name: "Toner Cartridge", item_unit: "box", item_category: "Consumables",
            requested_by_name: "Ama Mensah", requested_by_staff_id: "CMC0031"
          }]];
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
        assert.equal(data[0].item_name, "Toner Cartridge");
        assert.equal(data[0].requested_by_name, "Ama Mensah");
        assert.equal(data[0].requested_by_staff_id, "CMC0031");
      }
    );

    assert.match(seen, /LEFT JOIN inventory i ON i\.id = r\.item_id/,
      "item name must be resolved from inventory");
    assert.match(seen, /LEFT JOIN users u ON u\.id::text = r\.requested_by/,
      "requester name must be resolved from users, comparing as text");
    assert.match(seen, /i\.name AS item_name/);
    assert.match(seen, /u\."staffName" AS requested_by_name/);
    // An INNER join would drop requisitions whose item or requester was deleted.
    assert.ok(!/(?<!LEFT )\bJOIN\b/.test(seen.replace(/LEFT JOIN/g, "LEFT_JOIN")),
      "both joins must be LEFT so rows survive a deleted item or requester");
  });

  // Branch requisitions are routed Accounts -> Accounts Manager. An HOD has no
  // step in that chain at all. Before the is_head_office test was added to the
  // pending/HOD transition, an HOD could advance a branch requisition straight
  // to hod_approved; since the Branch Accounts step only accepts requisitions at
  // status "pending", and nothing returns a requisition to pending, that step
  // was then bypassed permanently. Every other approval test in this file uses
  // is_head_office: 1, so the branch case went uncovered.
  it("refuses to let an HOD approve a pending BRANCH requisition", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const writes = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE id = ?")) {
          return [[{ id: 40, status: "pending", department_id: 9, is_head_office: 0, is_it_item: 0 }]];
        }
        if (sql.startsWith("UPDATE requisitions SET")) {
          writes.push(params);
          return [[]];
        }
        if (sql.includes("INSERT INTO audit_logs")) return [[]];
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/40/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 403);
        // The refusal must name the chain that actually applies, so the approver
        // learns who should be acting rather than only that they may not.
        assert.match(data.message ?? data.error ?? "", /Branch: Accounts, then Accounts Manager/);
      }
    );

    assert.equal(writes.length, 0, "no status may be written when approval is refused");
  });

  it("refuses to let an HOD reject a pending BRANCH requisition", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const writes = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE id = ?")) {
          return [[{ id: 41, status: "pending", department_id: 9, is_head_office: 0, is_it_item: 0 }]];
        }
        if (sql.startsWith("UPDATE requisitions SET")) {
          writes.push(params);
          return [[]];
        }
        if (sql.includes("INSERT INTO audit_logs")) return [[]];
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response } = await fetchJson(baseUrl, "/requisitions/41/reject", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({ reason: "not needed" })
        });

        assert.equal(response.status, 403);
      }
    );

    assert.equal(writes.length, 0, "no status may be written when rejection is refused");
  });

  // The complement: the guard must not over-correct and block the branch chain's
  // own first approver.
  it("still allows Accounts to approve a pending BRANCH requisition", async () => {
    const token = createTestToken({ id: 6, role: "account", department_id: 9 });
    const writes = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE id = ?")) {
          return [[{ id: 42, status: "pending", department_id: 9, is_head_office: 0, is_it_item: 0 }]];
        }
        if (sql.startsWith("UPDATE requisitions SET")) {
          writes.push(params);
          return [[]];
        }
        if (sql.includes("INSERT INTO audit_logs")) return [[]];
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/42/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "branch_account_approved");
      }
    );

    assert.equal(writes.length, 1, "the branch chain's first approval must still be written");
  });

  // Fulfilment must never be reachable through the approve endpoint: that path
  // would set status = fulfilled without deducting stock, because the deduction
  // lives in the dedicated /fulfill handlers inside a transaction.
  it("refuses to fulfil through the approve endpoint — stock would not be deducted", async () => {
    const token = createTestToken({ id: 8, role: "stores", department_id: 9 });
    const writes = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE id = ?")) {
          // The only state in which a requisition awaits Stores on the branch
          // chain. is_head_office is 0 because ho_account_approved is reachable
          // only from the branch transition.
          return [[{ id: 44, status: "ho_account_approved", department_id: 9,
                     is_head_office: 0, is_it_item: 0 }]];
        }
        if (sql.startsWith("UPDATE requisitions SET")) {
          writes.push(params);
          return [[]];
        }
        if (sql.includes("UPDATE inventory SET")) {
          throw new Error("the approve endpoint must never touch inventory");
        }
        if (sql.includes("INSERT INTO audit_logs")) return [[]];
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response } = await fetchJson(baseUrl, "/requisitions/44/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 403);
      }
    );

    assert.equal(writes.length, 0,
      "approve must not mark a requisition fulfilled; /fulfill does that inside a transaction");
  });

  // And the head-office chain must be unaffected by the new condition.
  it("still allows an HOD to approve a pending HEAD OFFICE requisition", async () => {
    const token = createTestToken({ id: 5, role: "hod", department_id: 9 });
    const writes = [];

    const db = createMockDb({
      async execute(sql, params) {
        if (sql.includes("FROM requisitions WHERE id = ?")) {
          return [[{ id: 43, status: "pending", department_id: 9, is_head_office: 1, is_it_item: 0 }]];
        }
        if (sql.startsWith("UPDATE requisitions SET")) {
          writes.push(params);
          return [[]];
        }
        if (sql.includes("INSERT INTO audit_logs")) return [[]];
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    });

    await withTestApp(
      { databaseManager: createMockDatabaseManager({ db }) },
      async ({ baseUrl }) => {
        const { response, data } = await fetchJson(baseUrl, "/requisitions/43/approve", {
          method: "PUT",
          headers: authHeaders(token),
          body: JSON.stringify({})
        });

        assert.equal(response.status, 200);
        assert.equal(data.status, "hod_approved");
      }
    );

    assert.equal(writes.length, 1);
  });
});
