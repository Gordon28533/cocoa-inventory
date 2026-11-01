/**
 * Read-only. Confirms the audit_logs.requisition_id migration actually ran in
 * production, without writing anything.
 *
 * node-postgres maps column types to JS types: INTEGER arrives as a number,
 * VARCHAR as a string. So the JSON type of an existing requisition_id value
 * reveals the column's type without needing schema access or a test write.
 *
 *   number  -> still INTEGER, migration has NOT run, batch audits still lost
 *   string  -> VARCHAR, migration has run, batch audits will be recorded
 */
const API = process.env.API_URL || "https://cocoa-inventory-backend.onrender.com";
const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";

(async () => {
  const login = await fetch(API + "/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());
  if (!login.token) throw new Error("login failed");

  const raw = await fetch(API + "/audit-logs?limit=1000", {
    headers: { Authorization: `Bearer ${login.token}` }
  }).then((r) => r.json());
  const logs = Array.isArray(raw) ? raw : (raw.logs ?? raw.rows ?? []);

  const withId = logs.filter((l) => l.requisition_id !== null && l.requisition_id !== undefined);
  const types = new Set(withId.map((l) => typeof l.requisition_id));

  console.log(`audit entries            : ${logs.length}`);
  console.log(`entries with an entity id: ${withId.length}`);
  console.log(`JS types seen            : ${[...types].join(", ") || "(none)"}`);
  if (withId.length) {
    const s = withId[0];
    console.log(`sample                   : action="${s.action}" ` +
                `requisition_id=${JSON.stringify(s.requisition_id)}`);
  }

  console.log("\n" + "=".repeat(64));
  if (!withId.length) {
    console.log("INCONCLUSIVE — no entry carries an entity id, so the column type");
    console.log("cannot be inferred. Re-run after any action that records one.");
    process.exit(2);
  }
  if (types.has("number")) {
    console.log("NOT MIGRATED — requisition_id still arrives as a number, so the");
    console.log("column is still INTEGER. Batch-scoped audit writes are STILL being");
    console.log("silently dropped. Check the Render deploy log for the migration line:");
    console.log('  "Converting audit_logs.requisition_id from integer to character varying…"');
    process.exit(1);
  }
  console.log("MIGRATED — requisition_id arrives as a string, so the column is now");
  console.log("VARCHAR. A hex batch_id will insert cleanly; the next approval,");
  console.log("rejection or fulfilment will be recorded.");
  console.log("\nRemaining proof: run audit_coverage.cjs after the next real");
  console.log("approval and confirm the action count is no longer zero.");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
