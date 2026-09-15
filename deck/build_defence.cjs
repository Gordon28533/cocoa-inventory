/**
 * build_defence.cjs — 15-slide final year project defence deck.
 *
 * Every figure here matches the corrected dissertation: PostgreSQL (not MySQL),
 * no optimistic concurrency control, 70 passing tests (37 backend + 33 frontend).
 * Screenshots are the real captures from docs/screenshots.
 */
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const SHOTS = path.join(__dirname, "..", "docs", "screenshots");
const shot = (f) => path.join(SHOTS, f);
const has = (f) => fs.existsSync(shot(f));

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";                 // 13.3 x 7.5
pres.author = "Godwin Ahiamadia";
pres.title  = "Web-Based Inventory and Requisition Management System";

// ── Academic palette: navy authority, restrained ─────────────────────────────
const NAVY  = "1B2A4A";
const NAVY2 = "2E4370";
const GOLD  = "C99A2E";
const SLATE = "44506A";
const MUTE  = "6B7280";
const INK   = "1F2430";
const LIGHT = "F4F6FA";
const SAGE  = "3F7D58";
const RUST  = "A6442E";

const HF = "Cambria";     // headings
const BF = "Calibri";     // body

const dark = () => { const s = pres.addSlide(); s.background = { color: NAVY }; return s; };

function slide(title, kicker) {
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6, y: 0.36, w: 12.1, h: 0.26, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 11, bold: true, color: GOLD, charSpacing: 2
    });
  }
  s.addText(title, {
    x: 0.6, y: kicker ? 0.64 : 0.5, w: 12.1, h: 0.7, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 30, bold: true, color: NAVY
  });
  return s;
}

function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: fill || LIGHT }, line: { color: "E2E7F0", width: 1 }
  });
}

function numDot(s, x, y, d, n, bg) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg }, line: { width: 0 } });
  s.addText(String(n), {
    x, y, w: d, h: d, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle"
  });
}

function bullets(s, items, x, y, w, h, size) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== items.length - 1 } })), {
    x, y, w, h, isTextBox: true, margin: 0, valign: "top",
    fontFace: BF, fontSize: size || 13.5, color: INK, paraSpaceAfter: 9, lineSpacing: 19
  });
}

// Slide figures use the viewport captures in docs/screenshots/slide, which are
// 1440x900. The appendix images are full-page and far too tall for a 16:9
// slide — placed side by side they shrink to an illegible strip.
const slideShot = (f) => path.join(SHOTS, "slide", f);
const hasSlideShot = (f) => fs.existsSync(slideShot(f));

function figure(s, file, x, y, w, caption) {
  if (!hasSlideShot(file)) return;
  const h = w * (900 / 1440);               // preserve the 16:10 capture ratio
  s.addImage({ path: slideShot(file), x, y, w, h });
  s.addShape(pres.ShapeType.rect, {
    x, y, w, h, fill: { type: "none" }, line: { color: "D8DEEA", width: 1 }
  });
  if (caption) {
    s.addText(caption, {
      x, y: y + h + 0.12, w, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 10.5, italic: true, color: MUTE, align: "center"
    });
  }
}

// ═══════════════════════════════════════════════════════════════════ 1 TITLE
{
  const s = dark();
  s.addShape(pres.ShapeType.ellipse, { x: 10.2, y: -1.8, w: 5.2, h: 5.2, fill: { color: NAVY2 }, line: { width: 0 } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.6, y: 4.9, w: 2.6, h: 2.6, fill: { color: GOLD }, line: { width: 0 } });

  s.addText("FINAL YEAR PROJECT DEFENCE", {
    x: 0.9, y: 1.5, w: 9.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 11.5, bold: true, color: GOLD, charSpacing: 2 });
  s.addText("A Web-Based Inventory and\nRequisition Management System", {
    x: 0.9, y: 2.0, w: 9.6, h: 1.8, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 34, bold: true, color: "FFFFFF", lineSpacing: 42 });
  s.addText("Case study: Cocoa Marketing Company (Ghana) Limited", {
    x: 0.9, y: 3.95, w: 9.0, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 15, color: "C9D2E4" });
  s.addShape(pres.ShapeType.rect, { x: 0.9, y: 4.6, w: 0.5, h: 0.03, fill: { color: GOLD }, line: { width: 0 } });
  s.addText("Godwin Ahiamadia", {
    x: 0.9, y: 4.9, w: 9.0, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 15, bold: true, color: "FFFFFF" });
  s.addText("Supervisor: [name]     •     [Department]     •     2026", {
    x: 0.9, y: 5.35, w: 9.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12, color: "9FADC7" });
  s.addNotes("Fill in supervisor and department before the day. Say your name, the title, and the organisation, then move on — the panel has the title page in front of them. Target: 20 seconds.");
}

// ═══════════════════════════════════════════════════════════════ 2 PROBLEM
{
  const s = slide("The problem this project addresses", "Motivation");
  const rows = [
    ["Approval latency", "Paper requisitions are carried by hand between offices; an absent approver stops the request entirely."],
    ["Weak accountability", "Reconstructing who approved what, and when, means locating a physical file."],
    ["Data inconsistency", "Spreadsheets are updated after the fact, so records show stock that has already gone."],
    ["Unauthorised access", "A shared spreadsheet enforces no separation of duties."],
    ["No status visibility", "A requester cannot see progress without telephoning each approver in turn."]
  ];
  let y = 1.62;
  rows.forEach((r, i) => {
    numDot(s, 0.62, y + 0.04, 0.38, i + 1, i < 3 ? RUST : SLATE);
    s.addText(r[0], {
      x: 1.18, y: y, w: 3.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 14, bold: true, color: NAVY });
    s.addText(r[1], {
      x: 4.6, y: y - 0.02, w: 8.1, h: 0.55, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12.5, color: MUTE, lineSpacing: 16 });
    y += 0.92;
  });
  s.addText("Identified through structured interviews and process observation at CMC.", {
    x: 0.62, y: 6.35, w: 12.1, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12, italic: true, color: SLATE });
  s.addNotes("These five are from Chapter One and came out of the fieldwork, not from the literature. If asked how you established them, the answer is structured interviews plus observing the existing paper process. Don't rush — this slide justifies the whole project.");
}

// ═════════════════════════════════════════════════════════ 3 AIM & OBJECTIVES
{
  const s = slide("Aim and objectives", "What the project set out to do");
  card(s, 0.62, 1.55, 12.1, 0.95, "EEF2F9");
  s.addText("Aim", {
    x: 0.95, y: 1.72, w: 1.2, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12, bold: true, color: GOLD });
  s.addText("To design and implement a web-based system that automates inventory control and multi-step requisition approval for a multi-branch organisation.", {
    x: 0.95, y: 2.0, w: 11.4, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 14, color: NAVY });

  const objs = [
    "Analyse the existing manual processes and identify their weaknesses",
    "Design a centralised system providing real-time stock visibility",
    "Develop role-based requisition routing across the organisation's approval structures",
    "Implement access control and an append-only audit trail",
    "Safeguard data integrity under concurrent access",
    "Test and evaluate against functional and non-functional requirements"
  ];
  let oy = 2.85;
  objs.forEach((o, i) => {
    numDot(s, 0.68, oy, 0.36, i + 1, NAVY);
    s.addText(o, {
      x: 1.2, y: oy - 0.02, w: 11.4, h: 0.42, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13.5, color: INK });
    oy += 0.62;
  });
  s.addNotes("Read the aim, then say you will return to each objective at the end and show how it was met. That promise gives the presentation its spine and the panel will hold you to it — slide 13 delivers it.");
}

// ═══════════════════════════════════════════════════ 4 LITERATURE / GAP
{
  const s = slide("Literature review: the gap", "Related work");
  card(s, 0.62, 1.6, 5.9, 4.5);
  s.addText("What existing systems provide", {
    x: 0.95, y: 1.85, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 17, bold: true, color: NAVY });
  bullets(s, [
    "Full ERP suites (Odoo, SAP) — complete but costly and complex to deploy",
    "Stock-only tools (BarCloud) — track items, no approval workflow",
    "Routing platforms (Cayuse) — workflow, no inventory",
    "Spreadsheets — flexible, no control or audit trail"
  ], 0.95, 2.35, 5.25, 3.5, 13);

  card(s, 6.8, 1.6, 5.92, 4.5, "EEF2F9");
  s.addText("What none of them fit", {
    x: 7.15, y: 1.85, w: 5.3, h: 0.35, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 17, bold: true, color: RUST });
  bullets(s, [
    "Conditional routing that differs by branch and by item category",
    "A head office and branches with genuinely different approval chains",
    "Affordable deployment for a mid-sized public-sector organisation",
    "Requisition lifecycle and stock control in one system"
  ], 7.15, 2.35, 5.3, 3.5, 13);

  s.addText("The gap: existing solutions assume a single approval chain. CMC has three.", {
    x: 0.62, y: 6.35, w: 12.1, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 13, bold: true, italic: true, color: NAVY });
  s.addNotes("This is the contribution claim, so be precise. The gap is not 'no inventory software exists' — it is that off-the-shelf packages assume one approval chain, which does not fit an organisation with a head office and branches operating under different financial controls.");
}

// ═════════════════════════════════════════════════════════ 5 METHODOLOGY
{
  const s = slide("Methodology", "How the work was carried out");
  const phases = [
    ["Requirements", "Interviews and process observation at CMC"],
    ["Design", "Architecture, data model, workflow specification"],
    ["Iterative build", "Agile sprints, each delivering a working increment"],
    ["Testing", "Unit, integration and component testing throughout"],
    ["Deployment", "Continuous deployment to the live environment"]
  ];
  const cw = 2.26, gap = 0.28;
  let x = 0.62;
  phases.forEach((p, i) => {
    card(s, x, 2.3, cw, 2.5, i === 4 ? "EAF3EE" : "FFFFFF");
    numDot(s, x + cw / 2 - 0.22, 2.58, 0.44, i + 1, i === 4 ? SAGE : NAVY);
    s.addText(p[0], {
      x: x + 0.1, y: 3.2, w: cw - 0.2, h: 0.32, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13.5, bold: true, color: NAVY, align: "center" });
    s.addText(p[1], {
      x: x + 0.14, y: 3.58, w: cw - 0.28, h: 1.0, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 11, color: MUTE, align: "center", lineSpacing: 14 });
    if (i < phases.length - 1) {
      s.addShape(pres.ShapeType.rightArrow, {
        x: x + cw + 0.04, y: 3.32, w: 0.2, h: 0.2, fill: { color: GOLD }, line: { width: 0 } });
    }
    x += cw + gap;
  });
  s.addText("Agile was chosen because the approval rules could only be confirmed by showing working software to the people who operate the process.", {
    x: 0.62, y: 5.3, w: 12.1, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 13, italic: true, color: SLATE });
  s.addNotes("Expect: 'why Agile and not waterfall?' The answer on the slide is the honest one — the approval rules were tacit knowledge that only surfaced when staff saw a working screen. A fixed specification written up front would have been wrong.");
}

// ═══════════════════════════════════════════════════════ 6 ARCHITECTURE
{
  const s = slide("System architecture", "Three-tier design");
  const tiers = [
    ["Tier 1 — Presentation", "React single-page application", "Deployed on Vercel's edge network", NAVY],
    ["Tier 2 — Application", "Node.js and Express REST API", "Authentication, authorisation, workflow and business rules", NAVY2],
    ["Tier 3 — Data", "PostgreSQL", "Hosted on Neon; ACID transactions and referential integrity", SLATE]
  ];
  let y = 1.7;
  tiers.forEach((t) => {
    card(s, 0.62, y, 12.1, 1.35, "FFFFFF");
    s.addShape(pres.ShapeType.roundRect, {
      x: 0.62, y, w: 3.5, h: 1.35, rectRadius: 0.08, fill: { color: t[3] }, line: { width: 0 } });
    s.addText(t[0], {
      x: 0.95, y: y + 0.3, w: 3.0, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13, bold: true, color: "FFFFFF" });
    s.addText(t[1], {
      x: 0.95, y: y + 0.66, w: 3.0, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12, color: "D7DEEC" });
    s.addText(t[2], {
      x: 4.4, y: y + 0.45, w: 8.0, h: 0.5, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13, color: INK });
    y += 1.5;
  });
  s.addText("Each tier deploys independently. The API is stateless, so it scales horizontally without session affinity.", {
    x: 0.62, y: 6.3, w: 12.1, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12.5, italic: true, color: SLATE });
  s.addNotes("Say PostgreSQL, not MySQL — the project migrated during development and the dissertation reflects that. If asked why: PostgreSQL's stricter type handling surfaced three latent defects that MySQL had silently tolerated. That is a genuinely good answer.");
}

// ═════════════════════════════════════════════════════════ 7 DATA MODEL
{
  const s = slide("Database design", "Data model");
  const tables = [
    ["departments", "Organisational units. Carries the head-office flag that selects the approval route."],
    ["users", "Accounts with role and department. Passwords stored as bcrypt hashes."],
    ["inventory", "Stock items keyed by the organisation's own item codes."],
    ["requisitions", "One row per requested item; rows sharing a batch identifier move together."],
    ["audit_logs", "Append-only record of every significant action."]
  ];
  let y = 1.68;
  tables.forEach((t, i) => {
    card(s, 0.62, y, 12.1, 0.82, i % 2 ? "FFFFFF" : LIGHT);
    s.addText(t[0], {
      x: 1.0, y: y + 0.26, w: 2.6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: "Consolas", fontSize: 13, bold: true, color: NAVY });
    s.addText(t[1], {
      x: 3.9, y: y + 0.24, w: 8.5, h: 0.4, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12.5, color: MUTE });
    y += 0.94;
  });
  s.addText("Normalised to Third Normal Form. The schema is created and migrated idempotently at application startup, so a fresh deployment provisions itself.", {
    x: 0.62, y: 6.42, w: 12.1, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12.5, italic: true, color: SLATE });
  s.addNotes("Full schema is Appendix A. The point worth making aloud is the head-office flag on departments: routing branches on a stored boolean rather than comparing department names as strings, so renaming a department cannot break the workflow.");
}

// ════════════════════════════════════════════════════ 8 THREE WORKFLOWS
{
  const s = slide("Three approval routes, selected automatically", "Core contribution");
  s.addText("The route is determined from the requesting department's classification and whether the item is IT equipment. No user chooses the path.", {
    x: 0.62, y: 1.55, w: 12.1, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 13, color: MUTE });
  const routes = [
    ["Workflow 1 — Branch", ["Branch Accounts", "Head Office Accounts", "Stores issues"], NAVY],
    ["Workflow 2 — Head Office", ["HOD / Deputy HOD", "Accounts Manager", "Stores issues"], NAVY2],
    ["Workflow 3 — Head Office IT", ["HOD / Deputy HOD", "IT Manager", "Accounts Manager", "Stores issues"], GOLD]
  ];
  let rx = 0.62;
  const rw = 3.95;
  routes.forEach((r) => {
    card(s, rx, 2.2, rw, 3.6);
    s.addText(r[0], {
      x: rx + 0.25, y: 2.45, w: rw - 0.5, h: 0.4, isTextBox: true, margin: 0,
      fontFace: HF, fontSize: 15, bold: true, color: r[2] });
    let sy = 3.05;
    r[1].forEach((step, si) => {
      const last = si === r[1].length - 1;
      s.addShape(pres.ShapeType.ellipse, {
        x: rx + 0.28, y: sy + 0.06, w: 0.14, h: 0.14,
        fill: { color: last ? SAGE : r[2] }, line: { width: 0 } });
      s.addText(step, {
        x: rx + 0.54, y: sy - 0.02, w: rw - 0.8, h: 0.3, isTextBox: true, margin: 0,
        fontFace: BF, fontSize: 12.5, bold: last, color: last ? SAGE : INK });
      sy += 0.52;
    });
    rx += rw + 0.2;
  });
  s.addText("Implemented as an explicit guarded state machine: each transition tests the current status, the acting role, and the requisition's flags together. Any unmatched combination is refused.", {
    x: 0.62, y: 6.05, w: 12.1, h: 0.55, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12.5, italic: true, color: SLATE });
  s.addNotes("This is the slide that carries the contribution. Be ready for: 'what happens if someone tries to approve out of turn?' — the transition table has no matching branch and the request is refused with a message naming the role and the current status. Code is Appendix B.3.");
}

// ═══════════════════════════════════════════════════ 9 SECURITY & INTEGRITY
{
  const s = slide("Security and data integrity", "Objectives 4 and 5");
  card(s, 0.62, 1.6, 5.9, 4.5);
  s.addText("Access control", {
    x: 0.95, y: 1.85, w: 5.2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 17, bold: true, color: NAVY });
  bullets(s, [
    "Eight roles; permissions attach to the role, not the person",
    "Role and active status re-read from the database on every request, so a demotion takes effect immediately",
    "Passwords stored as bcrypt hashes at ten rounds",
    "JWT signed HS256, eight-hour expiry",
    "Append-only audit trail; no route updates or deletes a log row"
  ], 0.95, 2.35, 5.25, 3.5, 12.5);

  card(s, 6.8, 1.6, 5.92, 4.5, "EAF3EE");
  s.addText("Concurrency and integrity", {
    x: 7.15, y: 1.85, w: 5.2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 17, bold: true, color: SAGE });
  bullets(s, [
    "Multi-step operations wrapped in ACID transactions",
    "Stock reads take a row-level lock (SELECT … FOR UPDATE) held to commit",
    "The decrement re-asserts availability in its own WHERE clause",
    "A CHECK (quantity >= 0) constraint makes a negative quantity unrepresentable",
    "Verified by a regression test that reproduces the interleaving"
  ], 7.15, 2.35, 5.3, 3.5, 12.5);
  s.addNotes("Three independent layers, deliberately. The one to emphasise is the second: the decrement is safe on its own terms even without the lock. If asked whether you load-tested it — you did not, and you should say so plainly; it is a logical test of the guard, not a performance test. That honesty is on the limitations slide.");
}

// ═══════════════════════════════════════════════════════ 10 IMPLEMENTATION
{
  const s = slide("Implementation", "Built system");
  const left = [
    ["Frontend", "React 18, React Router, Context API for session state"],
    ["Backend", "Node.js with Express; modular route and service layers"],
    ["Database", "PostgreSQL on Neon, accessed through a connection pool"],
    ["Deployment", "Vercel (frontend) and Render (API), HTTPS throughout"]
  ];
  let y = 1.68;
  left.forEach((r) => {
    card(s, 0.62, y, 5.9, 1.0, "FFFFFF");
    s.addText(r[0], {
      x: 0.95, y: y + 0.18, w: 5.2, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13.5, bold: true, color: NAVY });
    s.addText(r[1], {
      x: 0.95, y: y + 0.52, w: 5.2, h: 0.35, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 11.5, color: MUTE });
    y += 1.12;
  });

  card(s, 6.8, 1.68, 5.92, 4.44, LIGHT);
  s.addText("Delivered functionality", {
    x: 7.15, y: 1.95, w: 5.2, h: 0.35, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 17, bold: true, color: NAVY });
  bullets(s, [
    "Multi-item requisitions handled as a batch",
    "All three approval routes, end to end",
    "Rejection with a recorded reason",
    "Stock issue with automatic deduction",
    "Out-of-stock and low-stock alerting",
    "Barcode scanning when adding items",
    "Audit log with filtering and CSV export",
    "User, role and department administration"
  ], 7.15, 2.45, 5.3, 3.5, 12.5);
  s.addNotes("Keep this brief — it is a list, and the panel can read. Spend the time you save on the workflow slide and the demo.");
}

// ══════════════════════════════════════════════════════════ 11 THE SYSTEM
{
  const s = slide("The system in use", "Demonstration");
  figure(s, "inventory.png", 0.62, 1.55, 6.0, "Inventory dashboard — search, status, low-stock alerting");
  figure(s, "audit.png", 6.72, 1.55, 6.0, "Audit log — filterable, paginated, exportable");
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.62, y: 6.15, w: 12.1, h: 0.75, rectRadius: 0.08,
    fill: { color: NAVY }, line: { width: 0 } });
  s.addText("LIVE DEMONSTRATION  —  cocoa-inventory.vercel.app", {
    x: 0.9, y: 6.33, w: 11.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 14, bold: true, color: "FFFFFF", charSpacing: 1 });
  s.addNotes("DEMO POINT. Load the site five minutes before you present — the free hosting tier sleeps and the first request can take up to a minute. Have it open and signed in on a second tab. If the connection fails, these two screenshots plus the next slide are your fallback: say 'I have captures here' and carry on without apologising.");
}

// ═══════════════════════════════════════════════════════ 12 TESTING
{
  const s = slide("Testing and evaluation", "Verification");
  const stats = [["70", "tests passing"], ["17", "test files"], ["37", "backend"], ["33", "frontend"]];
  let sx = 0.62;
  stats.forEach((st) => {
    card(s, sx, 1.6, 3.0, 1.5, "EEF2F9");
    s.addText(st[0], {
      x: sx, y: 1.75, w: 3.0, h: 0.75, isTextBox: true, margin: 0,
      fontFace: HF, fontSize: 40, bold: true, color: NAVY, align: "center" });
    s.addText(st[1], {
      x: sx, y: 2.55, w: 3.0, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12, color: MUTE, align: "center" });
    sx += 3.13;
  });

  card(s, 0.62, 3.35, 12.1, 2.75, "FFFFFF");
  s.addText("What was tested — and what this does not claim", {
    x: 0.95, y: 3.58, w: 11.4, h: 0.35, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 16, bold: true, color: NAVY });
  bullets(s, [
    "Backend: authentication, authorisation, all three approval routes, fulfilment including the insufficient-stock rollback",
    "Frontend: component rendering, form validation, role-conditional interface behaviour",
    "A regression test reproduces the concurrent-fulfilment interleaving and requires the transaction to roll back",
    "Not claimed: load testing, or any measurement of throughput under contention"
  ], 0.95, 4.05, 11.4, 1.9, 12.5);
  s.addNotes("If asked about the suite's history, tell the truth: it had drifted badly and most of it was failing before repair, because tests were not maintained through the migration. That drift let three real defects reach production. It is a finding about process, and it is in Appendix C — panels respect a candidate who reports it rather than one who quietly fixes it.");
}

// ═══════════════════════════════════════════════════════ 13 OBJECTIVES MET
{
  const s = slide("Objectives: assessment against evidence", "Results");
  const rows = [
    ["1", "Analyse existing processes", "Five deficiency categories documented from fieldwork", "Met"],
    ["2", "Real-time stock visibility", "Live inventory interface with threshold alerting", "Met"],
    ["3", "Role-based approval routing", "Three routes as a guarded state machine", "Met"],
    ["4", "Access control and audit trail", "Eight roles, live privilege checks, append-only log", "Met"],
    ["5", "Integrity under concurrency", "Row locking, guarded decrement, CHECK constraint", "Met"],
    ["6", "Test and evaluate", "70 automated tests; gaps recorded in Appendix C", "Met"]
  ];
  let y = 1.62;
  rows.forEach((r, i) => {
    card(s, 0.62, y, 12.1, 0.75, i % 2 ? "FFFFFF" : LIGHT);
    numDot(s, 0.85, y + 0.2, 0.36, r[0], NAVY);
    s.addText(r[1], {
      x: 1.38, y: y + 0.23, w: 3.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13, bold: true, color: NAVY });
    s.addText(r[2], {
      x: 5.0, y: y + 0.23, w: 6.4, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12, color: MUTE });
    s.addText(r[3], {
      x: 11.6, y: y + 0.23, w: 0.95, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12.5, bold: true, color: SAGE, align: "right" });
    y += 0.84;
  });
  s.addNotes("This pays off the promise made on slide 3. Go one line at a time and name the evidence, not the intention. Objective Five is worth pausing on: it was assessed as only partially met until row locking and the CHECK constraint were added — say so if asked, because it shows the assessment is real rather than decorative.");
}

// ═══════════════════════════════════════════════════════ 14 LIMITATIONS
{
  const s = slide("Limitations", "An honest assessment");
  const lim = [
    ["No load or stress testing", "Concurrency safety is established logically and by regression test, not measured under sustained traffic."],
    ["Requires connectivity", "There is no offline capability, which constrains use at sites with unreliable connections."],
    ["Internal requisitions only", "No purchase-order module; external procurement remains outside the system."],
    ["Single-organisation deployment", "The schema is not multi-tenant."],
    ["Not yet operationally trialled", "The system is deployed and functional but has not run a live workload at CMC."]
  ];
  let y = 1.62;
  lim.forEach((l, i) => {
    card(s, 0.62, y, 12.1, 0.92, i % 2 ? "FFFFFF" : "FBF3F0");
    s.addShape(pres.ShapeType.ellipse, {
      x: 0.92, y: y + 0.3, w: 0.32, h: 0.32, fill: { color: RUST }, line: { width: 0 } });
    s.addText(l[0], {
      x: 1.45, y: y + 0.18, w: 3.6, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 13, bold: true, color: NAVY });
    s.addText(l[1], {
      x: 5.15, y: y + 0.16, w: 7.3, h: 0.6, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12, color: MUTE, lineSpacing: 15 });
    y += 1.0;
  });
  // Cards end at 6.54; keep clear air beneath them.
  s.addText("Each limitation has a corresponding entry in the future work section of Chapter Five.", {
    x: 0.62, y: 6.72, w: 12.1, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 12.5, italic: true, color: SLATE });
  s.addNotes("Deliver these calmly and without hedging. A panel will find them anyway; naming them first converts a weakness into evidence of judgement. Do not volunteer anything not on this list, and do not apologise for any of them.");
}

// ═══════════════════════════════════════════════════════ 15 CONCLUSION
{
  const s = dark();
  s.addShape(pres.ShapeType.ellipse, { x: -1.5, y: 4.6, w: 5.0, h: 5.0, fill: { color: NAVY2 }, line: { width: 0 } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.3, y: -1.3, w: 3.4, h: 3.4, fill: { color: GOLD }, line: { width: 0 } });

  s.addText("CONCLUSION", {
    x: 0.9, y: 1.25, w: 9.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 11.5, bold: true, color: GOLD, charSpacing: 2 });
  s.addText("A deployed system, not a prototype", {
    x: 0.9, y: 1.7, w: 10.5, h: 0.7, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 32, bold: true, color: "FFFFFF" });
  s.addText("All six objectives met. The system is live, replacing paper requisitions and spreadsheet stock records with automated routing, enforced access control and a permanent audit trail.", {
    x: 0.9, y: 2.6, w: 10.6, h: 0.8, isTextBox: true, margin: 0,
    fontFace: BF, fontSize: 15, color: "C9D2E4", lineSpacing: 22 });

  const contribs = [
    ["Contribution", "Conditional multi-route approval, absent from comparable systems"],
    ["Future work", "Purchase orders, offline capability, load testing, multi-tenancy"],
    ["Status", "Deployed and operational; pilot at CMC proposed"]
  ];
  let cx = 0.9;
  contribs.forEach((c) => {
    s.addShape(pres.ShapeType.roundRect, {
      x: cx, y: 3.75, w: 3.7, h: 1.6, rectRadius: 0.08,
      fill: { color: NAVY2 }, line: { width: 0 } });
    s.addText(c[0], {
      x: cx + 0.28, y: 3.98, w: 3.1, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 12, bold: true, color: GOLD });
    s.addText(c[1], {
      x: cx + 0.28, y: 4.32, w: 3.15, h: 0.9, isTextBox: true, margin: 0,
      fontFace: BF, fontSize: 11.5, color: "DCE3F0", lineSpacing: 15 });
    cx += 3.9;
  });

  s.addText("Thank you — I welcome your questions.", {
    x: 0.9, y: 5.85, w: 10.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: HF, fontSize: 18, bold: true, color: GOLD });
  s.addNotes("Close on the contribution, not on gratitude. Then stop talking and let them ask. Anticipate: why PostgreSQL over MySQL; how do you know the workflow is correct; what happens under concurrent fulfilment; why no load testing; how would this scale to another organisation. Answers to all five are in the notes of earlier slides.");
}

const OUT = path.join(__dirname, "CMC Inventory System - Project Defence.pptx");
pres.writeFile({ fileName: OUT })
  .then(() => console.log("\n  Defence deck written to:\n  " + OUT + "\n"))
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
