const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";           // 13.3 x 7.5
pres.author = "Godwin Ahiamadia";
pres.title  = "CMC Inventory & Requisition Management System";

// ── Palette: cocoa ───────────────────────────────────────────────────────────
const COCOA = "3E2416";   // deep cocoa — dominant
const COCOA2= "5A3A25";   // lighter cocoa
const GOLD  = "C8873B";   // cocoa pod gold — accent
const CREAM = "F7F2EA";   // light background
const SAGE  = "5F7A52";   // cocoa leaf — positive
const RUST  = "9C4A2F";   // problem/warning
const INK   = "2A2A2A";
const MUTE  = "6E6259";

const HFONT = "Cambria";
const BFONT = "Calibri";

// ── helpers ──────────────────────────────────────────────────────────────────
function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: COCOA };
  return s;
}
function lightSlide(title, kicker) {
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.7, y: 0.42, w: 11.9, h: 0.28, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 12, bold: true, color: GOLD, charSpacing: 2
    });
  }
  s.addText(title, {
    x: 0.7, y: kicker ? 0.72 : 0.55, w: 11.9, h: 0.75, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 34, bold: true, color: COCOA
  });
  return s;
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.10,
    fill: { color: fill || CREAM }, line: { color: fill || CREAM, width: 0 },
    shadow: { type: "outer", color: "BBAFA3", blur: 8, offset: 2, angle: 90, opacity: 0.35 }
  });
}
function numCircle(s, x, y, d, n, bg, fg) {
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { color: bg }, line: { color: bg, width: 0 }
  });
  s.addText(String(n), {
    x, y, w: d, h: d, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 15, bold: true, color: fg,
    align: "center", valign: "middle"
  });
}

// ════════════════════════════════════════════════════════════════════ SLIDE 1
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, {
    x: 9.6, y: -1.5, w: 5.4, h: 5.4,
    fill: { color: COCOA2 }, line: { color: COCOA2, width: 0 }
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 11.1, y: 4.4, w: 3.0, h: 3.0,
    fill: { color: GOLD }, line: { color: GOLD, width: 0 }, transparency: 60
  });
  s.addText("PROPOSAL FOR COCOA MARKETING COMPANY (GHANA) LTD", {
    x: 0.9, y: 1.75, w: 8.6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12, bold: true, color: GOLD, charSpacing: 2
  });
  s.addText("Inventory and Requisition\nManagement System", {
    x: 0.9, y: 2.25, w: 9.0, h: 1.9, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 42, bold: true, color: "FFFFFF", lineSpacing: 48
  });
  s.addText("Replacing paper requisitions and spreadsheet stock records with one\nsecure system every branch and department can use from a browser.", {
    x: 0.9, y: 4.35, w: 8.6, h: 0.9, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 16, color: "E3D8CC", lineSpacing: 24
  });
  s.addShape(pres.ShapeType.rect, {
    x: 0.9, y: 5.55, w: 0.55, h: 0.035, fill: { color: GOLD }, line: { width: 0 }
  });
  s.addText("Presented by Godwin Ahiamadia", {
    x: 0.9, y: 5.8, w: 8.6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13, color: "C9BBAD"
  });
  s.addNotes("Open by naming who this is for and what it replaces. Keep it to two sentences, then move to the problem slide — the client should feel you understand their process before you show anything you built.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 2
{
  const s = lightSlide("Five problems with the way it works today", "The starting point");
  const items = [
    ["Approvals move at walking pace", "A requisition form is carried by hand from desk to desk. If an approver is away or off-site, it waits on their desk."],
    ["No reliable record of who approved what", "Signatures on paper are hard to trace months later. Reconstructing a decision means finding the file."],
    ["Stock records disagree with the shelves", "Spreadsheets are updated after the fact, so an item can read as available when it has already gone."],
    ["Everyone sees everything", "Nothing in a shared spreadsheet enforces who may issue stock, approve a request, or change a figure."],
    ["Requesters are left in the dark", "There is no way to check progress without telephoning whoever is believed to be holding the form."]
  ];
  let y = 1.75;
  items.forEach((it, i) => {
    numCircle(s, 0.72, y + 0.05, 0.42, i + 1, i < 3 ? RUST : COCOA2, "FFFFFF");
    s.addText(it[0], {
      x: 1.35, y: y, w: 5.0, h: 0.32, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 15, bold: true, color: COCOA
    });
    s.addText(it[1], {
      x: 6.5, y: y - 0.02, w: 6.1, h: 0.62, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 12.5, color: MUTE, lineSpacing: 16
    });
    y += 0.95;
  });
  s.addNotes("Do not rush this slide — it is the one that earns you the right to present the rest. Ask which of the five they feel most. Their answer tells you which later slide to spend time on.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 3
{
  const s = lightSlide("The same request, before and after", "What changes");
  card(s, 0.7, 1.75, 5.85, 4.55, "F4EDE4");
  s.addText("TODAY", {
    x: 1.05, y: 2.02, w: 5.1, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12, bold: true, color: RUST, charSpacing: 2
  });
  const before = [
    "Fill in a paper requisition form",
    "Walk it to the head of department",
    "Wait — no way to see where it is",
    "Carry it to accounts for approval",
    "Take it to stores to be issued",
    "Someone updates the spreadsheet later"
  ];
  s.addText(before.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== before.length - 1 } })), {
    x: 1.05, y: 2.45, w: 5.15, h: 3.6, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13.5, color: INK, paraSpaceAfter: 12, lineSpacing: 18,
    valign: "top"
  });

  card(s, 6.9, 1.75, 5.7, 4.55, CREAM);
  s.addText("WITH THE SYSTEM", {
    x: 7.25, y: 2.02, w: 5.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12, bold: true, color: SAGE, charSpacing: 2
  });
  const after = [
    "Submit the request from any browser",
    "It routes itself to the right approver",
    "Requester tracks status at any time",
    "Approvers act from wherever they are",
    "Stores issues against an approved request",
    "Stock updates the moment it is issued"
  ];
  s.addText(after.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== after.length - 1 } })), {
    x: 7.25, y: 2.45, w: 5.0, h: 3.6, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13.5, color: INK, paraSpaceAfter: 12, lineSpacing: 18,
    valign: "top"
  });
  s.addNotes("Walk down the left column, then the right, line by line. The pairing does the persuading — you should not need to editorialise.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 4
{
  const s = lightSlide("How a request moves through the system", "The journey");
  const steps = [
    ["Request", "Staff member picks items and submits"],
    ["Route", "System sends it to the correct approver"],
    ["Approve", "Each approver acts in turn, on any device"],
    ["Issue", "Stores releases the goods"],
    ["Record", "Stock and audit trail update together"]
  ];
  const cw = 2.28, gap = 0.26;
  let x = 0.72;
  steps.forEach((st, i) => {
    card(s, x, 2.3, cw, 2.35, i === steps.length - 1 ? CREAM : "FFFFFF");
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 2.3, w: cw, h: 2.35, rectRadius: 0.10,
      fill: { color: i === steps.length - 1 ? CREAM : "FFFFFF" },
      line: { color: "E2D7C9", width: 1 }
    });
    numCircle(s, x + cw / 2 - 0.24, 2.6, 0.48, i + 1, i === steps.length - 1 ? SAGE : COCOA, "FFFFFF");
    s.addText(st[0], {
      x: x + 0.12, y: 3.28, w: cw - 0.24, h: 0.34, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 15, bold: true, color: COCOA, align: "center"
    });
    s.addText(st[1], {
      x: x + 0.16, y: 3.66, w: cw - 0.32, h: 0.85, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 11.5, color: MUTE, align: "center", lineSpacing: 15
    });
    if (i < steps.length - 1) {
      s.addShape(pres.ShapeType.rightArrow, {
        x: x + cw + 0.03, y: 3.34, w: 0.20, h: 0.20,
        fill: { color: GOLD }, line: { color: GOLD, width: 0 }
      });
    }
    x += cw + gap;
  });
  s.addText("No step can be skipped, and no one can act out of turn.", {
    x: 0.72, y: 5.3, w: 11.9, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 14, italic: true, color: COCOA2
  });
  s.addNotes("Emphasise that routing is automatic. The requester does not choose an approver and cannot bypass one — that is what makes the trail trustworthy.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 5
{
  const s = lightSlide("Three approval routes, chosen automatically", "Built around how CMC works");
  s.addText("The system reads the requesting department and whether the item is IT equipment, then applies the matching route. Nobody has to remember the rule.", {
    x: 0.72, y: 1.72, w: 11.9, h: 0.45, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13.5, color: MUTE, lineSpacing: 18
  });
  const routes = [
    ["Branch request", ["Branch Accounts", "Head Office Accounts", "Stores issues"], COCOA],
    ["Head Office — general", ["Head of Department", "Head Office Accounts", "Stores issues"], COCOA2],
    ["Head Office — IT equipment", ["Head of Department", "IT Manager", "Head Office Accounts", "Stores issues"], GOLD]
  ];
  let rx = 0.72;
  const rw = 3.92;
  routes.forEach((r) => {
    card(s, rx, 2.4, rw, 3.55, CREAM);
    s.addText(r[0], {
      x: rx + 0.28, y: 2.68, w: rw - 0.56, h: 0.55, isTextBox: true, margin: 0,
      fontFace: HFONT, fontSize: 17, bold: true, color: r[2]
    });
    let sy = 3.42;
    r[1].forEach((step, si) => {
      s.addShape(pres.ShapeType.ellipse, {
        x: rx + 0.30, y: sy + 0.07, w: 0.15, h: 0.15,
        fill: { color: si === r[1].length - 1 ? SAGE : r[2] }, line: { width: 0 }
      });
      s.addText(step, {
        x: rx + 0.58, y: sy, w: rw - 0.9, h: 0.3, isTextBox: true, margin: 0,
        fontFace: BFONT, fontSize: 13, bold: si === r[1].length - 1,
        color: si === r[1].length - 1 ? SAGE : INK
      });
      sy += 0.52;
    });
    rx += rw + 0.27;
  });
  s.addNotes("This is your differentiator — off-the-shelf inventory packages assume one approval chain. Say plainly that these three routes were built from CMC's own structure, and ask whether the chains match how they actually work. If they say no, that is a configuration conversation, not a rebuild.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 6
{
  const s = lightSlide("Everyone sees only what their job requires", "Roles and access");
  const roles = [
    ["Staff member", "Raise requests, track their own"],
    ["Head of Department", "Approve for their department"],
    ["Deputy HOD", "Approve in the HOD's absence"],
    ["Branch Accounts", "First approval for branch requests"],
    ["Accounts Manager", "Head Office financial approval"],
    ["IT Manager", "Approve IT equipment requests"],
    ["Stores", "Issue goods, maintain stock records"],
    ["Administrator", "Manage users, departments, oversight"]
  ];
  const gx = 0.72, gy = 1.85;
  roles.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = gx + col * 6.15, y = gy + row * 1.14;
    card(s, x, y, 5.85, 0.96, i === 7 ? CREAM : "FBF8F4");
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.26, y: y + 0.26, w: 0.44, h: 0.44,
      fill: { color: i === 7 ? GOLD : COCOA }, line: { width: 0 }
    });
    // Initial inside the circle — an empty disc reads as a missing icon.
    s.addText(r[0].charAt(0).toUpperCase(), {
      x: x + 0.26, y: y + 0.26, w: 0.44, h: 0.44, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 14, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });
    s.addText(r[0], {
      x: x + 0.88, y: y + 0.17, w: 4.7, h: 0.32, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 14, bold: true, color: COCOA
    });
    s.addText(r[1], {
      x: x + 0.88, y: y + 0.50, w: 4.7, h: 0.3, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 11.5, color: MUTE
    });
  });
  s.addNotes("Eight roles. The point to land: permissions are attached to the role, not to the person, so moving someone between posts is an administrative change rather than a security risk.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 7
{
  const s = lightSlide("Every action leaves a permanent record", "Accountability");
  card(s, 0.72, 1.8, 6.0, 4.35, CREAM);
  s.addText("What is recorded", {
    x: 1.05, y: 2.1, w: 5.4, h: 0.4, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 19, bold: true, color: COCOA
  });
  const logged = [
    "Who submitted a request, and when",
    "Every approval and every rejection",
    "The reason given for a rejection",
    "Goods issued, by whom, against which request",
    "Stock adjustments and item changes",
    "Sign-ins, including failed attempts",
    "User accounts created or deactivated"
  ];
  s.addText(logged.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== logged.length - 1 } })), {
    x: 1.05, y: 2.65, w: 5.35, h: 3.3, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13, color: INK, paraSpaceAfter: 9, lineSpacing: 17,
    valign: "top"
  });

  card(s, 7.05, 1.8, 5.55, 2.05, COCOA);
  s.addText("Records can be added,\nbut never edited or deleted.", {
    x: 7.4, y: 2.18, w: 4.9, h: 0.9, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 19, bold: true, color: "FFFFFF", lineSpacing: 26
  });
  s.addText("Not even by an administrator.", {
    x: 7.4, y: 3.15, w: 4.9, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13, color: GOLD
  });

  card(s, 7.05, 4.1, 5.55, 2.05, "FBF8F4");
  s.addText("Searchable and exportable", {
    x: 7.4, y: 4.42, w: 4.9, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 14, bold: true, color: COCOA
  });
  s.addText("Filter by person, action or date range, and export to a spreadsheet for audit or management review.", {
    x: 7.4, y: 4.85, w: 4.9, h: 1.0, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12.5, color: MUTE, lineSpacing: 17
  });
  s.addNotes("For a finance or audit audience this is often the slide that sells the system. The record is append-only by design — that is what makes it evidence rather than a convenience.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 8
{
  const s = lightSlide("Security built in, not bolted on", "Protecting the data");
  const secs = [
    ["Passwords are never stored", "Passwords are stored as one-way encrypted values. Nobody — including the administrator or the developer — can read a user's password."],
    ["Permissions checked on every action", "Access is re-verified against live records each time, so a change of role or a deactivated account takes effect immediately, not at next sign-in."],
    ["Sessions expire automatically", "A sign-in lasts eight hours, limiting exposure if a device is left unattended."],
    ["Encrypted connections throughout", "All traffic between the browser, the system and the database is encrypted in transit."]
  ];
  let cy = 1.85;
  secs.forEach((sc, i) => {
    card(s, 0.72, cy, 11.88, 1.05, i % 2 === 0 ? "FBF8F4" : CREAM);
    s.addShape(pres.ShapeType.ellipse, {
      x: 1.02, y: cy + 0.3, w: 0.45, h: 0.45,
      fill: { color: SAGE }, line: { width: 0 }
    });
    s.addText("✓", {
      x: 1.02, y: cy + 0.3, w: 0.45, h: 0.45, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 17, bold: true, color: "FFFFFF",
      align: "center", valign: "middle"
    });
    s.addText(sc[0], {
      x: 1.68, y: cy + 0.19, w: 3.85, h: 0.35, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 14.5, bold: true, color: COCOA
    });
    s.addText(sc[1], {
      x: 5.6, y: cy + 0.18, w: 6.75, h: 0.72, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 12, color: MUTE, lineSpacing: 16
    });
    cy += 1.17;
  });
  s.addNotes("Keep this non-technical. If asked how passwords are protected, the honest answer is industry-standard one-way hashing (bcrypt) — but only give the term if they ask for it.");
}

// ════════════════════════════════════════════════════════════════════ SLIDE 9
{
  const s = lightSlide("Already built, deployed and running", "Where the project stands");
  card(s, 0.72, 1.8, 3.82, 2.0, CREAM);
  s.addText("Nothing to install", {
    x: 1.02, y: 2.12, w: 3.25, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 15, bold: true, color: COCOA });
  s.addText("Runs in any web browser on a computer, tablet or phone.", {
    x: 1.02, y: 2.55, w: 3.25, h: 1.0, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12.5, color: MUTE, lineSpacing: 17 });

  card(s, 4.75, 1.8, 3.8, 2.0, CREAM);
  s.addText("No servers to buy", {
    x: 5.05, y: 2.12, w: 3.25, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 15, bold: true, color: COCOA });
  s.addText("Hosted and maintained externally, with automatic backups.", {
    x: 5.05, y: 2.55, w: 3.25, h: 1.0, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12.5, color: MUTE, lineSpacing: 17 });

  card(s, 8.78, 1.8, 3.82, 2.0, CREAM);
  s.addText("Works across sites", {
    x: 9.08, y: 2.12, w: 3.25, h: 0.35, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 15, bold: true, color: COCOA });
  s.addText("Head office and every takeover centre use the same system.", {
    x: 9.08, y: 2.55, w: 3.25, h: 1.0, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12.5, color: MUTE, lineSpacing: 17 });

  card(s, 0.72, 4.05, 11.88, 2.1, COCOA);
  s.addText("Ready for a pilot", {
    x: 1.08, y: 4.35, w: 5.3, h: 0.4, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 20, bold: true, color: "FFFFFF" });
  s.addText("The system is live and fully functional. The sensible next step is a supervised pilot with one department, which lets us confirm the approval chains match your process before rolling out more widely.", {
    x: 1.08, y: 4.85, w: 10.9, h: 1.0, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13.5, color: "E3D8CC", lineSpacing: 19 });
  s.addNotes("Be straight here. It is built and deployed, but it has not yet run a real workload at CMC. Proposing a pilot rather than a full switch is both honest and better selling — it lowers their perceived risk.");
}

// ═══════════════════════════════════════════════════════════════════ SLIDE 10
{
  const s = lightSlide("What is ready now, and what comes next", "An honest roadmap");
  card(s, 0.72, 1.8, 5.85, 4.4, CREAM);
  s.addText("Working today", {
    x: 1.05, y: 2.1, w: 5.2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 19, bold: true, color: SAGE });
  const now = [
    "Requisitions with multiple items in one request",
    "All three approval routes, end to end",
    "Rejection with a recorded reason",
    "Stock issue and automatic deduction",
    "Low-stock and out-of-stock alerts",
    "Barcode scanning when adding items",
    "Full audit trail with export",
    "User, role and department management"
  ];
  s.addText(now.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== now.length - 1 } })), {
    x: 1.05, y: 2.62, w: 5.2, h: 3.4, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12.5, color: INK, paraSpaceAfter: 8, lineSpacing: 16, valign: "top" });

  card(s, 6.75, 1.8, 5.85, 4.4, "FBF8F4");
  s.addText("Planned next", {
    x: 7.08, y: 2.1, w: 5.2, h: 0.4, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 19, bold: true, color: GOLD });
  const next = [
    "Purchase orders raised automatically at reorder level",
    "Email and SMS alerts to approvers",
    "Management reports on consumption and cycle times",
    "Dedicated mobile application",
    "Offline capability for low-connectivity sites",
    "Supplier and delivery tracking"
  ];
  s.addText(next.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i !== next.length - 1 } })), {
    x: 7.08, y: 2.62, w: 5.2, h: 3.4, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12.5, color: INK, paraSpaceAfter: 8, lineSpacing: 16, valign: "top" });
  s.addNotes("Showing the roadmap builds credibility — it signals you know the difference between what exists and what is promised. Do not let anything from the right-hand column drift into the present tense while you speak.");
}

// ═══════════════════════════════════════════════════════════════════ SLIDE 11
{
  const s = lightSlide("What adopting it would involve", "Getting started");
  const phases = [
    ["Set up", "Create departments, roles and user accounts. Agree the approval chains.", "Week 1"],
    ["Load stock", "Clean and import existing item records from current spreadsheets.", "Week 1-2"],
    ["Train", "Short session per role. Most staff only need to learn one screen.", "Week 2"],
    ["Pilot", "One department runs live while paper continues in parallel.", "Week 3-4"],
    ["Roll out", "Extend to remaining departments and branches once the pilot settles.", "Month 2"]
  ];
  let py = 1.9;
  phases.forEach((p, i) => {
    card(s, 0.72, py, 11.88, 0.82, i === phases.length - 1 ? CREAM : "FBF8F4");
    numCircle(s, 1.0, py + 0.19, 0.44, i + 1, i === phases.length - 1 ? SAGE : COCOA, "FFFFFF");
    s.addText(p[0], {
      x: 1.66, y: py + 0.25, w: 2.3, h: 0.32, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 14.5, bold: true, color: COCOA });
    s.addText(p[1], {
      x: 4.05, y: py + 0.24, w: 6.6, h: 0.4, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 12.5, color: MUTE });
    s.addText(p[2], {
      x: 10.8, y: py + 0.25, w: 1.55, h: 0.32, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 12.5, bold: true, color: GOLD, align: "right" });
    py += 0.93;
  });
  s.addText("Running the paper process alongside the system during the pilot means nothing is lost if a correction is needed.", {
    x: 0.72, y: 6.6, w: 11.88, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 13, italic: true, color: COCOA2 });
  s.addNotes("The parallel-running point matters to cautious clients. Say it explicitly: they are not being asked to abandon the paper trail on day one.");
}

// ═══════════════════════════════════════════════════════════════════ SLIDE 12
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, {
    x: -1.6, y: 4.2, w: 5.2, h: 5.2,
    fill: { color: COCOA2 }, line: { width: 0 } });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.9, y: -1.2, w: 3.6, h: 3.6,
    fill: { color: GOLD }, line: { width: 0 }, transparency: 65 });
  s.addText("WHAT I AM ASKING FOR", {
    x: 1.0, y: 1.45, w: 9.0, h: 0.3, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 12, bold: true, color: GOLD, charSpacing: 2 });
  s.addText("A pilot with one department", {
    x: 1.0, y: 1.9, w: 10.0, h: 0.85, isTextBox: true, margin: 0,
    fontFace: HFONT, fontSize: 38, bold: true, color: "FFFFFF" });
  s.addText("Give me one department and four weeks. You keep your paper process running\nthroughout, so there is nothing to lose if it does not suit you.", {
    x: 1.0, y: 2.95, w: 10.2, h: 0.95, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 16, color: "E3D8CC", lineSpacing: 24 });

  const asks = [
    ["A department to pilot with", "Ideally one that raises requisitions regularly"],
    ["A contact for the approval rules", "Someone who can confirm the chains are right"],
    ["Your current stock records", "Whatever spreadsheets you use today"]
  ];
  let ax = 1.0;
  asks.forEach((a) => {
    s.addShape(pres.ShapeType.roundRect, {
      x: ax, y: 4.25, w: 3.66, h: 1.55, rectRadius: 0.10,
      fill: { color: COCOA2 }, line: { color: "6E4B33", width: 1 } });
    s.addText(a[0], {
      x: ax + 0.26, y: 4.5, w: 3.15, h: 0.55, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 13.5, bold: true, color: "FFFFFF", lineSpacing: 18 });
    s.addText(a[1], {
      x: ax + 0.26, y: 5.1, w: 3.15, h: 0.6, isTextBox: true, margin: 0,
      fontFace: BFONT, fontSize: 11.5, color: "C9BBAD", lineSpacing: 15 });
    ax += 3.9;
  });
  s.addText("Thank you — happy to take questions, or demonstrate the system now.", {
    x: 1.0, y: 6.3, w: 10.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: BFONT, fontSize: 14, italic: true, color: GOLD });
  s.addNotes("Close on a small, concrete ask rather than a general request for approval. Have the live system open in another tab so you can demonstrate immediately if they say yes.");
}

const OUT = path.join(__dirname, "CMC Inventory System - Client Presentation.pptx");
pres.writeFile({ fileName: OUT })
  .then(() => console.log("\n  Deck written to:\n  " + OUT + "\n"))
  .catch(e => { console.error("FAILED:", e.message); process.exit(1); });
