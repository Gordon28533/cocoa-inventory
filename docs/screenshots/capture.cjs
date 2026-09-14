/**
 * capture.cjs — screenshot every interface of the live system.
 *
 * Drives the Chrome already installed on this machine (puppeteer-core, no
 * bundled Chromium download) against the deployed application, so the images
 * are of the real running system rather than a local dev build.
 *
 * Usage:  node capture.cjs
 * Output: docs/screenshots/NN-name.png
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const APP = "https://cocoa-inventory.vercel.app";
const API = "https://cocoa-inventory-backend.onrender.com";
const OUT = __dirname;

const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function findBrowser() {
  for (const p of CHROME_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error("No Chrome or Edge found in the usual install locations.");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const executablePath = findBrowser();
  console.log("Using browser:", executablePath);

  // Authenticate once over the API; the token is then seeded into localStorage
  // so each view renders as a signed-in administrator.
  const login = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());

  if (!login.token) throw new Error("Login failed: " + JSON.stringify(login));
  console.log("Signed in as", login.staffName, "-", login.role);

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ["--hide-scrollbars", "--force-color-profile=srgb"]
  });

  const page = await browser.newPage();

  // Wait for the view to finish loading rather than guessing at a delay. A
  // fixed pause caught the audit log mid-fetch and captured "Loading audit
  // log…" instead of the table.
  const waitSettled = async (label) => {
    await page
      .waitForFunction(
        () => !/\bLoading\b[^\n]{0,40}(…|\.\.\.)/i.test(document.body.innerText || ""),
        { timeout: 60000 }
      )
      .catch(() => console.log(`  !!  ${label}: still loading at timeout`));
    await sleep(700);
  };

  const shot = async (n, name, note) => {
    await waitSettled(name);
    const file = path.join(OUT, `${String(n).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ${String(n).padStart(2, "0")}  ${name.padEnd(26)} ${note || ""}`);
  };

  // ── 1. Login (signed out) ────────────────────────────────────────────────
  await page.goto(APP + "/login", { waitUntil: "networkidle2" });
  await shot(1, "login", "signed out");

  // ── seed the session ─────────────────────────────────────────────────────
  await page.evaluate((s) => {
    localStorage.setItem("token", s.token);
    localStorage.setItem("role", s.role);
    localStorage.setItem("user", s.user);
    localStorage.setItem("staffId", s.staffId);
    localStorage.setItem("department_id", String(s.departmentId ?? ""));
  }, {
    token: login.token,
    role: login.role,
    user: login.staffName,
    staffId: login.staffId,
    departmentId: login.department_id
  });

  // Approvals and Fulfil are role-gated to approver and stores accounts, so an
  // administrator session cannot reach them. They are captured separately.
  const views = [
    ["dashboard",          "inventory-list",     "inventory"],
    ["dashboard",          "stock-alerts",       "notifications"],
    ["dashboard",          "requisition-form",   "requisition"],
    ["dashboard",          "my-requisitions",    "myreq"],
    ["dashboard",          "departments",        "departments"]
  ];

  let n = 2;
  for (const [route, name, tabKey] of views) {
    await page.goto(`${APP}/${route}`, { waitUntil: "networkidle2" });

    // The free Render tier sleeps when idle, so the first data request can take
    // the better part of a minute. Wait for the tab strip to exist rather than
    // guessing at a fixed delay — the earlier run captured blank pages.
    await page
      .waitForFunction(
        () => document.querySelectorAll('[role="tab"], .nav-tab').length > 0,
        { timeout: 90000 }
      )
      .catch(() => console.log(`  !!  ${name}: tab strip never rendered`));
    await sleep(600);

    // Switch to the tab by its visible label rather than an internal key.
    const clicked = await page.evaluate((key) => {
      const labels = {
        inventory:     /Inventory List/i,
        notifications: /Notifications/i,
        requisition:   /New Requisition|Requisition/i,
        myreq:         /My Requisitions/i,
        approval:      /Approvals/i,
        fulfill:       /Fulfil/i,
        departments:   /Departments/i
      };
      const re = labels[key];
      const tabs = [...document.querySelectorAll('[role="tab"], .nav-tab')];
      const hit = tabs.find((t) => re.test(t.textContent || ""));
      if (hit) { hit.click(); return hit.textContent.trim(); }
      return null;
    }, tabKey);

    if (!clicked) { console.log(`  --  ${name.padEnd(26)} tab not present, skipped`); continue; }
    await shot(n++, name, `tab: ${clicked}`);
  }

  // ── Admin-only pages ─────────────────────────────────────────────────────
  await page.goto(APP + "/admin/users", { waitUntil: "networkidle2" });
  await shot(n++, "user-management", "admin password gate");

  await page.goto(APP + "/audit-logs", { waitUntil: "networkidle2" });
  await shot(n++, "audit-log", "admin only");

  // ── Mobile rendering, to evidence the responsive layout ──────────────────
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
  await page.goto(APP + "/dashboard", { waitUntil: "networkidle2" });
  // The tab choice persists in localStorage, so reset to the main view rather
  // than documenting whichever tab the previous capture happened to leave open.
  await page
    .waitForFunction(() => document.querySelectorAll('[role="tab"], .nav-tab').length > 0, { timeout: 90000 })
    .catch(() => {});
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('[role="tab"], .nav-tab')]
      .find((x) => /Inventory List/i.test(x.textContent || ""));
    if (t) t.click();
  });
  await shot(n++, "mobile-dashboard", "390x844");

  await page.goto(APP + "/login", { waitUntil: "networkidle2" });
  await shot(n++, "mobile-login", "390x844");

  await browser.close();
  console.log("\nSaved to:", OUT);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
