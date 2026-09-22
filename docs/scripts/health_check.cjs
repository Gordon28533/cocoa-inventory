/**
 * Live health and security check against the deployed system.
 * Unauthenticated only — nothing is created, modified or deleted.
 */
const API = process.env.API_URL || "https://cocoa-inventory-backend.onrender.com";
const APP = process.env.APP_URL || "https://cocoa-inventory.vercel.app";

const pad = (s, n) => String(s).padEnd(n);

async function probe(label, url, opts = {}, expect = null) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opts, redirect: "manual" });
    const ms = Date.now() - t0;
    let body = "";
    try { body = (await r.text()).slice(0, 160).replace(/\s+/g, " "); } catch {}
    const verdict = expect === null ? "" : (r.status === expect ? "  OK" : `  EXPECTED ${expect}`);
    console.log(`  ${pad(label, 42)} ${r.status}  ${pad(ms + "ms", 8)}${verdict}`);
    return { status: r.status, ms, body, headers: r.headers };
  } catch (e) {
    console.log(`  ${pad(label, 42)} ERROR  ${e.message}`);
    return { status: 0, error: e.message };
  }
}

(async () => {
  console.log("=".repeat(74));
  console.log("LIVE DEPLOYMENT CHECK  " + new Date().toISOString());
  console.log("=".repeat(74));

  console.log("\n-- Frontend (Vercel) --");
  await probe("GET /", APP, {}, 200);
  await probe("GET /login", APP + "/login", {}, 200);
  const spa = await probe("GET /a-route-that-does-not-exist", APP + "/zzz-nope");

  console.log("\n-- Backend (Render) — reachability --");
  const root = await probe("GET /", API);
  await probe("GET /items  (no token)", API + "/items", {}, 401);
  await probe("GET /requisitions  (no token)", API + "/requisitions", {}, 401);
  await probe("GET /users  (no token)", API + "/users", {}, 401);
  await probe("GET /audit-logs  (no token)", API + "/audit-logs", {}, 401);
  await probe("GET /protected  (no token)", API + "/protected", {}, 401);
  await probe("GET /me  (no token)", API + "/me", {}, 401);

  console.log("\n-- Auth surface --");
  const bad = await probe("POST /login  (wrong credentials)", API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId: "NOSUCHUSER999", password: "definitely-not-the-password" })
  }, 401);
  console.log(`     body: ${bad.body}`);

  const malformed = await probe("POST /login  (empty body)", API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  console.log(`     body: ${malformed.body}`);

  const forged = await probe("GET /items  (forged token)", API + "/items", {
    headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.notarealsignature" }
  }, 401);
  console.log(`     body: ${forged.body}`);

  console.log("\n-- Security headers on the API --");
  if (root.headers) {
    for (const h of ["access-control-allow-origin", "x-powered-by",
                     "strict-transport-security", "x-content-type-options",
                     "x-frame-options", "content-security-policy"]) {
      const v = root.headers.get(h);
      console.log(`  ${pad(h, 32)} ${v === null ? "(absent)" : v}`);
    }
  }

  console.log("\n-- Rate limiting on /login --");
  let limited = null;
  for (let i = 1; i <= 12; i++) {
    const r = await fetch(API + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: "RATE_PROBE", password: "x" })
    });
    if (r.status === 429) { limited = i; break; }
  }
  console.log(limited
    ? `  429 returned after ${limited} attempts — rate limiting active`
    : "  no 429 after 12 failed attempts — login rate limiting NOT observed");

  console.log("\n-- SPA fallback behaviour --");
  console.log(`  unknown frontend route returned ${spa.status} ` +
              `(200 = SPA fallback serving index.html, correct for client routing)`);
})();
