/**
 * Read-only production diagnostic. Changes nothing.
 *
 * The approval chain is chosen from is_head_office, which is COPIED onto each
 * requisition row when it is created. Correcting the departments table
 * therefore fixes future requisitions only -- anything already raised keeps
 * the flag it was born with. This reports both: which departments are
 * misclassified, and which live requisitions are already on the wrong chain.
 */
const API = process.env.API_URL || "https://cocoa-inventory-backend.onrender.com";
const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";

// Departments that exist AT head office. A branch is a physical site.
const LIKELY_HEAD_OFFICE = ["IT", "HR", "Finance", "Stores", "Head Office"];

const pad = (s, n) => String(s ?? "").padEnd(n);

(async () => {
  const login = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());
  if (!login.token) throw new Error("login failed: " + JSON.stringify(login));

  const auth = { Authorization: `Bearer ${login.token}` };
  const get = (p) => fetch(API + p, { headers: auth }).then((r) => r.json());

  const departments = await get("/departments");
  const requisitions = await get("/requisitions?limit=500");

  console.log("=".repeat(76));
  console.log("DEPARTMENTS — is_head_office drives the approval chain");
  console.log("=".repeat(76));
  console.log("  " + pad("department", 28) + pad("is_head_office", 16) + "chain applied");
  const misclassified = [];
  for (const d of departments) {
    const ho = d.is_head_office ? 1 : 0;
    const chain = ho ? "HOD -> Accts Mgr -> Stores" : "Accounts -> Accts Mgr -> Stores";
    const suspect = LIKELY_HEAD_OFFICE.includes(d.name) && !ho;
    if (suspect) misclassified.push(d);
    console.log("  " + pad(d.name, 28) + pad(ho, 16) + chain + (suspect ? "   <-- SUSPECT" : ""));
  }

  console.log("\n" + "=".repeat(76));
  console.log("LIVE REQUISITIONS — grouped by department and the flag they carry");
  console.log("=".repeat(76));

  const byDept = new Map();
  for (const r of requisitions) {
    const key = `${r.department ?? r.department_id}|${r.is_head_office ? 1 : 0}`;
    if (!byDept.has(key)) byDept.set(key, []);
    byDept.get(key).push(r);
  }

  const TERMINAL = new Set(["fulfilled", "rejected"]);
  let affectedOpen = 0;
  let affectedTotal = 0;

  console.log("  " + pad("department", 26) + pad("flag", 6) + pad("count", 7) + pad("open", 6) + "statuses");
  for (const [key, rows] of [...byDept.entries()].sort()) {
    const [dept, flag] = key.split("|");
    const open = rows.filter((r) => !TERMINAL.has(r.status)).length;
    const statuses = [...new Set(rows.map((r) => r.status))].join(", ");
    const suspect = misclassified.some((m) => m.name === dept) && flag === "0";
    if (suspect) { affectedTotal += rows.length; affectedOpen += open; }
    console.log("  " + pad(dept, 26) + pad(flag, 6) + pad(rows.length, 7) + pad(open, 6) +
                statuses + (suspect ? "   <-- wrong chain" : ""));
  }

  const batches = new Set(requisitions.map((r) => r.batch_id));
  console.log("\n" + "=".repeat(76));
  console.log("SUMMARY");
  console.log("=".repeat(76));
  console.log(`  requisition rows            : ${requisitions.length}`);
  console.log(`  distinct batches            : ${batches.size}`);
  console.log(`  departments misclassified   : ${misclassified.length}` +
              (misclassified.length ? ` (${misclassified.map((d) => d.name).join(", ")})` : ""));
  console.log(`  rows already on wrong chain : ${affectedTotal}`);
  console.log(`  of those, still open        : ${affectedOpen}` +
              (affectedOpen ? "   <-- these skipped HOD approval and are still moving" : ""));
  console.log("\n  Nothing was modified by this script.");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
