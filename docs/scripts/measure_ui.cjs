/**
 * Measure the live UI instead of guessing. Reports computed font sizes and
 * box heights for the elements that drive perceived "bigness".
 */
const fs = require("fs");
const puppeteer = require("puppeteer-core");

const APP = "https://cocoa-inventory.vercel.app";
const API = "https://cocoa-inventory-backend.onrender.com";
const STAFF_ID = process.env.SHOT_STAFF_ID || "ADMIN001";
const PASSWORD = process.env.SHOT_PASSWORD || "admin123";

const CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe"
];
const browserPath = CANDIDATES.find((p) => p && fs.existsSync(p));

(async () => {
  const login = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: STAFF_ID, password: PASSWORD })
  }).then((r) => r.json());
  if (!login.token) throw new Error("login failed");

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: "new",
    defaultViewport: { width: 1440, height: 900 }
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

  await page.goto(APP + "/dashboard", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  const report = await page.evaluate(() => {
    const px = (v) => Math.round(parseFloat(v) * 10) / 10;
    const out = { global: {}, elements: [], page: {} };

    out.global.htmlFontSize = getComputedStyle(document.documentElement).fontSize;
    out.global.bodyFontSize = getComputedStyle(document.body).fontSize;
    out.global.zoom = getComputedStyle(document.body).zoom || "normal";
    out.page.scrollHeight = document.documentElement.scrollHeight;
    out.page.viewportHeight = window.innerHeight;

    const pick = (sel, label) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.elements.push({
        label,
        sel,
        fontSize: px(cs.fontSize),
        lineHeight: cs.lineHeight,
        padding: `${px(cs.paddingTop)}/${px(cs.paddingBottom)}`,
        height: Math.round(r.height),
        width: Math.round(r.width)
      });
    };

    pick(".app-header", "app header bar");
    pick(".app-header h1, .app-header .brand, header h1", "header title");
    pick("h1", "first h1 (page title)");
    pick(".nav-tab, [role=tab]", "a tab");
    pick(".feature-panel", "feature panel");
    pick(".feature-panel__header", "panel header");
    pick(".notif-section__title", "Stock Alerts title");
    pick(".notif-item", "a notification row");
    pick(".notif-item__title", "notif row title");
    pick(".inventory-lowstock", "inventory low-stock notice");
    pick("table th", "table header cell");
    pick("button", "a button");
    return out;
  });

  console.log("GLOBAL");
  console.log("  html font-size :", report.global.htmlFontSize);
  console.log("  body font-size :", report.global.bodyFontSize);
  console.log("  page height    :", report.page.scrollHeight, "px in a",
              report.page.viewportHeight, "px viewport →",
              (report.page.scrollHeight / report.page.viewportHeight).toFixed(1), "screens");
  console.log("\nELEMENTS (1440x900 viewport, CSS pixels)");
  console.log("  " + "label".padEnd(30) + "font  height  padding(t/b)");
  for (const e of report.elements) {
    console.log("  " + e.label.padEnd(30) +
                String(e.fontSize).padEnd(6) +
                String(e.height).padEnd(8) + e.padding);
  }

  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
