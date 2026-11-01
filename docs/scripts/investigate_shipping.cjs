/**
 * Read-only. Reconstructs the approval trail for every requisition from a
 * named department, to establish whether an approval step was skipped.
 *
 * logAudit records (user_id, action, batch_id || requisitionId, details), so
 * the audit log is the only record of WHO advanced a requisition and in what
 * order. The requisitions table keeps only the final approver per column.
 */
const API = process.env.API_URL || "https://cocoa-inventory-backend.onrender.com";
const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";
const DEPT = process.argv[2] || "Shipping";

const pad = (s, n) => String(s ?? "").padEnd(n);

(async () => {
  const login = await fetch(API + "/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());
  if (!login.token) throw new Error("login failed");
  const auth = { Authorization: `Bearer ${login.token}` };
  const get = (p) => fetch(API + p, { headers: auth }).then((r) => r.json());

  const [requisitions, logsRaw, users] = await Promise.all([
    get("/requisitions?limit=500"),
    get("/audit-logs?limit=1000"),
    get("/users")
  ]);
  const logs = Array.isArray(logsRaw) ? logsRaw : (logsRaw.logs ?? logsRaw.rows ?? []);
  const userById = new Map((Array.isArray(users) ? users : []).map((u) => [String(u.id), u]));

  const target = requisitions.filter((r) => (r.department ?? "") === DEPT);
  console.log(`requisitions from "${DEPT}": ${target.length}`);
  console.log(`audit entries available    : ${logs.length}\n`);

  // Which approver columns are populated tells us which steps actually ran.
  const STEP_COLUMNS = [
    ["hod_approved_by", "HOD / Deputy HOD"],
    ["branch_account_approved_by", "Branch Accounts"],
    ["ho_account_approved_by", "HO Accounts Mgr"],
    ["it_approved_by", "IT Manager"],
    ["account_approved_by", "Accounts Manager"],
    ["fulfilled_by", "Stores (fulfil)"],
    ["rejected_by", "Rejected by"]
  ];

  for (const r of target) {
    console.log("=".repeat(74));
    console.log(`batch ${r.batch_id}   item ${r.item_id} x${r.quantity}   status: ${r.status}`);
    console.log(`  is_head_office=${r.is_head_office}  is_it_item=${r.is_it_item}  created ${r.created_at}`);
    console.log(`  expected chain for flag ${r.is_head_office}: ` +
      (r.is_head_office ? "HOD -> Accounts Manager -> Stores"
                        : "Branch Accounts -> Accounts Manager -> Stores"));

    console.log("\n  approver columns actually set:");
    let any = false;
    for (const [col, label] of STEP_COLUMNS) {
      const v = r[col];
      if (v !== null && v !== undefined && v !== "") {
        any = true;
        const u = userById.get(String(v));
        console.log("    " + pad(label, 20) + pad(v, 8) + (u ? `${u.staffName} (${u.role})` : "unknown user"));
      }
    }
    if (!any) console.log("    (none)");

    const trail = logs
      .filter((l) => String(l.requisition_id ?? "") === String(r.batch_id) ||
                     String(l.requisition_id ?? "") === String(r.id))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log("\n  audit trail:");
    if (!trail.length) {
      console.log("    (no audit entries found for this batch)");
    } else {
      for (const l of trail) {
        const u = userById.get(String(l.user_id));
        console.log("    " + pad(l.timestamp, 26) + pad(l.action, 24) +
                    (u ? `${u.staffName} (${u.role})` : `user ${l.user_id}`));
      }
    }

    // The verdict that matters: on the branch chain, Branch Accounts must run.
    if (!r.is_head_office) {
      const branchDone = r.branch_account_approved_by !== null &&
                         r.branch_account_approved_by !== undefined;
      const hodDone = r.hod_approved_by !== null && r.hod_approved_by !== undefined;
      console.log("\n  VERDICT:");
      if (hodDone && !branchDone) {
        console.log("    An HOD advanced this BRANCH requisition and Branch Accounts never");
        console.log("    reviewed it. This is the bypass defect, and it fired on live data.");
      } else if (!hodDone && !branchDone && r.status !== "pending") {
        console.log("    Advanced past pending with neither HOD nor Branch Accounts recorded —");
        console.log("    consistent with a row created before is_head_office existed.");
      } else if (branchDone) {
        console.log("    Branch Accounts did review this. Chain followed correctly.");
      } else {
        console.log("    Still pending; nothing skipped yet.");
      }
    }
    console.log();
  }
  console.log("Nothing was modified by this script.");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
