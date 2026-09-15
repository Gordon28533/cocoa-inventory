/**
 * capture_slides.cjs — viewport-sized captures for use on slides.
 *
 * The appendix images are full-page, which makes them very tall; placed side by
 * side on a 16:9 slide they shrink to an illegible strip. These are 1440x900
 * viewport captures (16:10), which sit on a slide at a readable size.
 *
 * Output: docs/screenshots/slide/NN-name.png
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const APP = "https://cocoa-inventory.vercel.app";
const API = "https://cocoa-inventory-backend.onrender.com";
const OUT = path.join(__dirname, "slide");

const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";

const CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe"
];
const browserPath = CANDIDATES.find((p) => p && fs.existsSync(p));
if (!browserPath) throw new Error("Chrome not found");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const login = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());
  if (!login.token) throw new Error("login failed");

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ["--hide-scrollbars"]
  });
  const page = await browser.newPage();

  await page.goto(APP + "/login", { waitUntil: "networkidle2" });
  await page.evaluate((s) => {
    localStorage.setItem("token", s.t);
    localStorage.setItem("role", s.r);
    localStorage.setItem("user", s.u);
    localStorage.setItem("staffId", s.i);
    localStorage.setItem("department_id", String(s.d ?? ""));
  }, { t: login.token, r: login.role, u: login.staffName, i: login.staffId, d: login.department_id });

  const settle = async () => {
    await page
      .waitForFunction(
        () => !/\bLoading\b[^\n]{0,40}(…|\.\.\.)/i.test(document.body.innerText || ""),
        { timeout: 60000 }
      )
      .catch(() => {});
    await sleep(700);
  };

  const grab = async (name) => {
    await settle();
    await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: false });
    console.log("  " + name);
  };

  const tab = async (re) => {
    await page
      .waitForFunction(() => document.querySelectorAll('[role="tab"], .nav-tab').length > 0, { timeout: 90000 })
      .catch(() => {});
    await page.evaluate((src) => {
      const r = new RegExp(src, "i");
      const t = [...document.querySelectorAll('[role="tab"], .nav-tab')].find((x) => r.test(x.textContent || ""));
      if (t) t.click();
    }, re);
    await sleep(500);
  };

  await page.goto(APP + "/dashboard", { waitUntil: "networkidle2" });
  await tab("Inventory List");
  await grab("inventory");

  await tab("Notifications");
  await grab("alerts");

  await tab("Requisition");
  await grab("requisition");

  await page.goto(APP + "/audit-logs", { waitUntil: "networkidle2" });
  await grab("audit");

  await browser.close();
  console.log("\nSaved to: " + OUT);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
