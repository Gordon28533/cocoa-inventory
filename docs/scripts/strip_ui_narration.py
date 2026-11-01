"""
Remove the instructional narration from the interface.

Every heading in this application was followed by a sentence restating what the
heading already said -- "Inventory Management / Review stock levels, open item
details, and keep inventory records current." That is tutorial voice. An
operational tool that explains itself on every screen reads as a demo, and the
lines cost vertical space on every panel.

Removed: narration under a heading, and the dashboard's welcome/tab-guide pair.
Kept: text that carries information the interface does not otherwise show --
the pickup-code instruction, the password-rules field help, and the barcode
scanner hint. Those are help, not narration.
"""
import pathlib, sys

SRC = pathlib.Path(r"C:\Users\PC\cocoa-inventory\src")

# (relative path, exact text to remove or replace, replacement)
EDITS = [
# ── Dashboard: welcome line + tab guide ──────────────────────────────────────
("Pages/Dashboard.js",
 """          <p className="dashboard-welcome">
            Welcome back, {user || "team member"}! Manage your inventory efficiently.
          </p>
          <p className="dashboard-subtitle">
            Use the tabs below to move between inventory, requisitions, approvals, fulfillment, and administration tasks.
          </p>
""", ""),
# `user` was destructured solely for the welcome line. Left in place it becomes
# an unused variable, which fails the Vercel build because CI=true promotes the
# ESLint warning to an error.
("Pages/Dashboard.js",
 "  const { token, user, role: userRole, currentPath, setCurrentPath } = useAuth();",
 "  const { token, role: userRole, currentPath, setCurrentPath } = useAuth();"),

# ── Panel headings ───────────────────────────────────────────────────────────
("Component/InventoryList.jsx",
 """            <p className="section-subtitle">Review stock levels, open item details, and keep inventory records current.</p>\n""", ""),
("Component/DepartmentManager.jsx",
 """          <p className="section-subtitle">Add, edit, and retire departments used for routing, approvals, and user assignment.</p>\n""", ""),
("Component/MyRequisitions.jsx",
 """          <p className="section-subtitle">Track your submitted batches, approval progress, and pickup codes.</p>\n""", ""),

# ── Fulfilment ───────────────────────────────────────────────────────────────
("Component/RequisitionFulfill.jsx",
 """          <p className="section-subtitle">
            Track batches still awaiting approval, open ready batches, and verify pickup details before fulfillment.
          </p>
""", ""),
("Component/RequisitionFulfill.jsx",
 """              <p className="section-subtitle">These batches are still moving through the approval chain.</p>\n""", ""),
("Component/RequisitionFulfill.jsx",
 """              <p className="section-subtitle">These batches are approved and ready for code verification.</p>\n""", ""),
("Component/RequisitionFulfill.jsx",
 """            <p className="section-subtitle">Paste a pickup code to locate the matching batch and verify the receiver.</p>\n""", ""),

# ── Item detail ──────────────────────────────────────────────────────────────
("Component/InventoryDetails.jsx",
 """            <p className="inventory-details__subtitle">
              Review the current stock position, category, and last update before returning to the workspace.
            </p>
""", ""),

# ── Notifications: the per-section counts already carry this ────────────────
("Component/NotificationsPanel.jsx",
 """          <p className="section-subtitle">
            {totalAlerts > 0
              ? `${totalAlerts} item${totalAlerts !== 1 ? "s" : ""} need${totalAlerts === 1 ? "s" : ""} your attention.`
              : "You're all caught up."}
          </p>
""", ""),

# ── Administration ───────────────────────────────────────────────────────────
("Pages/AdminAddUser.js",
 """          <p className="section-subtitle">Confirm your password before opening staff administration tools.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """          <p className="section-subtitle">Create staff accounts, manage approval roles, and keep branch setup complete.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """            <p className="section-subtitle">Create new staff accounts and assign the right role and department from the start.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """            <p className="section-subtitle">Review access across the organization and deactivate stale accounts when needed.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """            <p className="section-subtitle">Aggregate snapshot of inventory, requisitions, and user accounts.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """              <p className="section-subtitle">Inspect notable system activity and recent account actions.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """              <p className="section-subtitle">Maintain the department list used by routing, approvals, and user assignments.</p>\n""", ""),
("Pages/AdminAddUser.js",
 """            <p className="section-subtitle">Keep your own admin access secure without leaving the management workspace.</p>\n""", ""),

# ── Change password ──────────────────────────────────────────────────────────
("Pages/ChangePasswordPage.js",
 """      <p className="login-subtitle">Update your account password before returning to the workspace.</p>\n""", ""),

# ── Login heading ────────────────────────────────────────────────────────────
("Pages/LoginPage.js",
 """<h2 id={subtitleId}>Welcome Back</h2>""",
 """<h2 id={subtitleId}>Sign in</h2>"""),
]

applied, missed = 0, []
for rel, old, new in EDITS:
    p = SRC / rel
    text = p.read_text(encoding="utf-8")
    if old not in text:
        missed.append((rel, old.strip().splitlines()[0][:72]))
        continue
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    applied += 1
    label = "replaced" if new else "removed "
    print(f"  {label}  {rel:<34} {old.strip().splitlines()[0][:66]}")

print(f"\n{applied}/{len(EDITS)} applied")
if missed:
    print("\nNOT FOUND:")
    for rel, frag in missed:
        print(f"  {rel:<34} {frag}")
    sys.exit(1)

# ---------------------------------------------------------------- verify
print("\n=== residual narration check ===")
PHRASES = [
    "Use the tabs below", "Welcome back", "Manage your inventory efficiently",
    "Review stock levels", "Add, edit, and retire departments",
    "Track your submitted batches", "still moving through the approval chain",
    "ready for code verification", "Paste a pickup code",
    "Review the current stock position", "need your attention",
    "You're all caught up", "Confirm your password before",
    "Create staff accounts, manage", "assign the right role and department",
    "Review access across the organization", "Aggregate snapshot",
    "Inspect notable system activity", "Maintain the department list",
    "Keep your own admin access", "Update your account password before",
    "Welcome Back",
]
all_text = "\n".join(
    p.read_text(encoding="utf-8")
    for p in SRC.rglob("*.js*") if ".test." not in p.name
)
bad = [ph for ph in PHRASES if ph in all_text]
for ph in PHRASES:
    print(f"  {'STILL PRESENT' if ph in all_text else 'clear        '}  {ph}")
print(f"\n{'FAILED' if bad else 'all narration removed'}")

# What deliberately stays
print("\n=== kept on purpose (functional help, not narration) ===")
for ph in ["Share this pickup code", "barcode-scan-hint", "create-user-password-hint"]:
    print(f"  {'present' if ph in all_text else 'MISSING'}  {ph}")
