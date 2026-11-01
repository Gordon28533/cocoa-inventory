/**
 * Read-only. Which actions actually reach audit_logs, and which never do.
 *
 * logAudit writes entityId into requisition_id, which is INTEGER. Batch
 * operations pass batch_id -- a 12-char hex string -- so the INSERT raises
 * "invalid input syntax for type integer", which logAudit catches and
 * swallows. The user's action still succeeds. The audit entry is lost.
 */
const API = process.env.API_URL || "https://cocoa-inventory-backend.onrender.com";
const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";

// Every action logAudit is called with anywhere in the backend.
const BATCH_SCOPED = [
  "create_requisition", "hod_approve", "branch_account_approve",
  "ho_account_approve", "it_approve", "account_approve", "fulfill",
  "reject_requisition"
];
const ID_SCOPED = [
  "create_user", "update_user", "delete_user", "activate_user",
  "deactivate_user", "change_password", "create_department",
  "update_department", "delete_department"
];

const pad = (s, n) => String(s ?? "").padEnd(n);

(async () => {
  const login = await fetch(API + "/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());
  if (!login.token) throw new Error("login failed");
  const auth = { Authorization: `Bearer ${login.token}` };

  const raw = await fetch(API + "/audit-logs?limit=1000", { headers: auth }).then((r) => r.json());
  const logs = Array.isArray(raw) ? raw : (raw.logs ?? raw.rows ?? []);
  const reqs = await fetch(API + "/requisitions?limit=500", { headers: auth }).then((r) => r.json());

  const counts = new Map();
  for (const l of logs) counts.set(l.action, (counts.get(l.action) || 0) + 1);

  console.log(`total audit entries: ${logs.length}`);
  console.log(`total requisitions : ${reqs.length} rows in ${new Set(reqs.map(r => r.batch_id)).size} batches\n`);

  console.log("=".repeat(70));
  console.log("BATCH-SCOPED ACTIONS — these pass a hex batch_id into an INTEGER column");
  console.log("=".repeat(70));
  let batchTotal = 0;
  for (const a of BATCH_SCOPED) {
    const n = counts.get(a) || 0;
    batchTotal += n;
    console.log("  " + pad(a, 30) + pad(n, 6) + (n === 0 ? "never recorded" : ""));
  }

  console.log("\n" + "=".repeat(70));
  console.log("ID-SCOPED ACTIONS — numeric or null entity id, so the INSERT succeeds");
  console.log("=".repeat(70));
  let idTotal = 0;
  for (const a of ID_SCOPED) {
    const n = counts.get(a) || 0;
    idTotal += n;
    if (n) console.log("  " + pad(a, 30) + n);
  }

  const other = [...counts.entries()]
    .filter(([a]) => !BATCH_SCOPED.includes(a) && !ID_SCOPED.includes(a));
  if (other.length) {
    console.log("\n  other actions seen:");
    for (const [a, n] of other) console.log("    " + pad(a, 28) + n);
  }

  console.log("\n" + "=".repeat(70));
  console.log("VERDICT");
  console.log("=".repeat(70));
  console.log(`  batch-scoped entries recorded : ${batchTotal}`);
  console.log(`  id-scoped entries recorded    : ${idTotal}`);
  const fulfilled = reqs.filter((r) => r.status === "fulfilled").length;
  console.log(`  requisitions actually fulfilled: ${fulfilled}`);
  if (batchTotal === 0 && reqs.length > 0) {
    console.log("\n  Requisitions have been created, approved and fulfilled, yet NOT ONE");
    console.log("  of those actions appears in the audit log. The accountability trail");
    console.log("  for the requisition lifecycle is empty.");
  }
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
