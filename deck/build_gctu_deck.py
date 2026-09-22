"""
Rebuild the project-defence deck inside the GCTU IT Department template.

The template's own master, theme, footer ("GCTU_FOCIS  IT DEPART22MENT 2022"),
slide-number placeholders and university logo are preserved. Section titles are
the template's mandated ones, in the template's order. Three extra slides are
created by deep-copying an existing content slide so they carry the same footer
and slide-number placeholders.

Every factual claim below is drawn from the corrected dissertation or from the
repository. Nothing is invented — in particular the REFERENCES slide lists only
entries that actually exist in the dissertation.
"""
import copy
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

TPL = (r"C:\Users\PC\AppData\Roaming\Claude\local-agent-mode-sessions"
       r"\d45320d3-5cd6-44bd-aa24-bb9fc9105633\b59a9749-214f-4899-8ba5-a674d98fee61"
       r"\local_e3fbd18b-fc87-4943-8ca2-7f9f3493b441\uploads"
       r"\IT PROJECT PRESENTATION TEMPLATE.pptx")
OUT = r"C:\Users\PC\cocoa-inventory\deck\CMC Inventory System - Defence (GCTU Template).pptx"
SHOTS = r"C:\Users\PC\cocoa-inventory\docs\screenshots\slide"

BODY = dict(x=Inches(0.92), y=Inches(2.00), w=Inches(11.50), h=Inches(4.76))
INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x5A, 0x5A, 0x5A)

prs = Presentation(TPL)


# ---------------------------------------------------------------- helpers
def duplicate_slide(prs, src_index):
    """Deep-copy a slide (with its footer/slide-number placeholders) to the end."""
    src = prs.slides[src_index]
    dest = prs.slides.add_slide(src.slide_layout)
    for shp in list(dest.shapes):
        shp._element.getparent().remove(shp._element)
    for shp in src.shapes:
        dest.shapes._spTree.append(copy.deepcopy(shp._element))
    return dest


def reorder(prs, order):
    """order = list of current slide indices, in the desired new sequence."""
    lst = prs.slides._sldIdLst
    ids = list(lst)
    for e in ids:
        lst.remove(e)
    for i in order:
        lst.append(ids[i])


def clear_body(slide):
    """Remove any content placeholder, leaving title/footer/slide-number."""
    for shp in list(slide.shapes):
        if shp.has_text_frame and shp != slide.shapes.title:
            nm = shp.name.lower()
            if "content" in nm or "text placeholder" in nm:
                shp._element.getparent().remove(shp._element)


def set_title(slide, text):
    t = slide.shapes.title
    t.text_frame.text = text
    return t


def add_body(slide, bullets, size=18, gap=9, markers=True):
    """bullets: list of (level, text, bold) or plain strings."""
    clear_body(slide)
    tb = slide.shapes.add_textbox(BODY["x"], BODY["y"], BODY["w"], BODY["h"])
    tf = tb.text_frame
    tf.word_wrap = True
    first = True
    for item in bullets:
        if isinstance(item, str):
            lvl, txt, bold = 0, item, False
        else:
            lvl, txt, bold = item
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.level = lvl
        p.space_after = Pt(gap)
        r = p.add_run()
        if not markers or bold:
            r.text = txt
        else:
            r.text = ("• " if lvl == 0 else "– ") + txt
        r.font.size = Pt(size if lvl == 0 else size - 2)
        r.font.bold = bold
        r.font.color.rgb = INK if lvl == 0 else MUTED
    return tb


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


# ---------------------------------------------------------------- 3 extra slides
# Slide index 3 (AIM & OBJECTIVES) is the cleanest source: title + content +
# footer + slide number. Duplicate it three times, then reorder everything.
for _ in range(3):
    duplicate_slide(prs, 3)

# current indices: 0..11 template, 12,13,14 = the duplicates
reorder(prs, [0, 1, 2, 3, 4, 5, 6, 7,
              8, 12,          # SYSTEM DESIGN  x2
              9, 13, 14,      # SYSTEM IMPLEMENTATION x3
              10, 11])        # CONCLUSIONS, REFERENCES
S = prs.slides

# ---------------------------------------------------------------- 1. Title
t = S[0].shapes.title
t.text_frame.text = "Ghana Communication Technology University"

sub = [s for s in S[0].shapes if s.name.startswith("Subtitle")][0]
tf = sub.text_frame
tf.word_wrap = True
lines = [
    ("Department of Information Technology", 16, False),
    ("BSc Information Technology", 16, False),
    ("A Web-Based Inventory and Requisition Management System "
     "for Cocoa Marketing Company (Ghana) Limited", 18, True),
    ("Godwin Ahiamadia  |  [Index Number]", 15, False),
    ("Supervisor: [Name of Supervisor]", 15, False),
    ("September 2026", 15, False),
]
tf.text = ""
for i, (txt, sz, bold) in enumerate(lines):
    p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
    p.alignment = PP_ALIGN.CENTER
    p.space_after = Pt(7)
    r = p.add_run()
    r.text = txt
    r.font.size = Pt(sz)
    r.font.bold = bold
    r.font.color.rgb = INK if bold else MUTED
notes(S[0], "Good morning. My name is Godwin Ahiamadia. My project is a web-based "
            "inventory and requisition management system built for Cocoa Marketing "
            "Company Ghana Limited. The system is deployed and live, and I will "
            "demonstrate it during this presentation.")

# ---------------------------------------------------------------- 2. Background
set_title(S[1], "BACKGROUND TO THE STUDY")
add_body(S[1], [
    "Cocoa Marketing Company (Ghana) Ltd is the marketing and export subsidiary "
    "of COCOBOD, operating a head office alongside regional branches.",
    "Its stores hold consumables, spare parts and IT equipment that departments "
    "draw on request rather than purchase directly.",
    "Requests are raised on paper forms that are hand-carried from desk to desk "
    "for signatures before stores will issue anything.",
    "Stock balances are kept in ledgers and spreadsheets held locally by Stores.",
    "Because approval authority differs between head office and the branches, and "
    "differs again for IT equipment, the paper process carries rules that exist "
    "only in the knowledge of the staff applying them.",
])
notes(S[1], "Set the scene. CMC is a real organisation with a real stores function. "
            "The key point to land is the last one: the approval rules are real and "
            "they are complex, but today they live in people's heads rather than in "
            "any system. That is what makes this worth automating.")

# ---------------------------------------------------------------- 3. Problem
set_title(S[2], "PROBLEM STATEMENT")
add_body(S[2], [
    "No single source of truth for stock — ledgers and departmental spreadsheets "
    "disagree, and neither is current.",
    "Paper requisitions stall in transit, and the originator has no way to see "
    "where a request has reached or who is holding it.",
    "Approval authority is not enforced by the record. A signature step can be "
    "skipped and the form still reaches Stores.",
    "Stock is issued without a systematic check that the quantity exists, so "
    "over-issue is discovered only at the next stock count.",
    "There is no reliable audit trail linking an issue of stock back to the person "
    "who authorised it.",
])
notes(S[2], "Five deficiencies. If asked which matters most: the third and fourth. "
            "Unenforced authority and unchecked issue are the two that carry real "
            "financial exposure — everything else is inconvenience.")

# ---------------------------------------------------------------- 4. Aim & objectives
set_title(S[3], "AIM & OBJECTIVES")
add_body(S[3], [
    (0, "Aim", True),
    (1, "To design, implement and deploy a web-based system that centralises CMC's "
        "inventory records and enforces its requisition approval process.", False),
    (0, "Objectives", True),
    (1, "Analyse the existing manual inventory and requisition procedures.", False),
    (1, "Design a normalised relational schema for inventory, requisitions, users "
        "and departments.", False),
    (1, "Implement role-based access control across the eight operational roles.", False),
    (1, "Implement the approval workflows so that authority is enforced by the "
        "system rather than by convention.", False),
    (1, "Prevent over-issue of stock when requests are fulfilled concurrently.", False),
    (1, "Test the system, deploy it, and record an audit trail of every action.", False),
], size=17, gap=5)
notes(S[3], "Six objectives. Slide 14 returns to these one by one and states whether "
            "each was met. Objective five is the one to be ready to defend in "
            "technical detail — see the design slides.")

# ---------------------------------------------------------------- 5. Significance
set_title(S[4], "SIGNIFICANCE OF THE STUDY")
add_body(S[4], [
    "For CMC — requisitions move at the speed of the network rather than the speed "
    "of a courier, and stock figures reflect what has actually been issued.",
    "For management — every approval and every issue is attributable, which makes "
    "internal audit possible without a manual reconstruction of paper trails.",
    "For practice — the approach generalises to other COCOBOD subsidiaries and to "
    "public-sector stores functions that share the same multi-site structure.",
    "Academically — the project is a worked application of role-based access "
    "control, workflow enforcement and database concurrency control to a problem "
    "where all three are simultaneously required.",
])
notes(S[4], "Keep this brief. The examiner wants to know the work matters beyond the "
            "single organisation — the third bullet is the one that answers that.")

# ---------------------------------------------------------------- 6. Literature
set_title(S[5], "LITERATURE REVIEW")
add_body(S[5], [
    "Role-based access control, formalised by Ferraiolo and Kuhn and standardised "
    "by NIST, is the predominant access model for enterprise systems because it "
    "scales with organisational structure (Stallings & Brown, 2018).",
    "Relational normalisation with primary-key, foreign-key and uniqueness "
    "constraints is the established basis for enforcing data integrity in the "
    "database rather than the application (Elmasri & Navathe, 2016).",
    "Concurrent access to shared records requires explicit concurrency control; "
    "without it, check-then-act sequences interleave and corrupt counts "
    "(Kleppmann, 2017).",
    "Agile iterative development is better suited than Waterfall to systems whose "
    "requirements emerge through use (Sommerville, 2016; Pressman & Maxim, 2020).",
    (0, "The gap: commercial inventory modules assume a single approval chain. None "
        "reviewed model a chain that switches on both item type and originating "
        "site, which is precisely CMC's requirement.", True),
], size=15, gap=7)
notes(S[5], "The final bullet is the contribution claim — say it deliberately. If "
            "pressed on which commercial systems were reviewed, refer to Chapter 2.")

# ---------------------------------------------------------------- 7. Methodology
set_title(S[6], "METHODOLOGY")
add_body(S[6], [
    "Agile, iterative development — requirements were refined across successive "
    "increments rather than fixed in advance (Sommerville, 2016).",
    "Requirements were established by studying the existing paper procedure and "
    "the approval rules applied to it.",
    (1, "Iteration 1 — authentication and the role model", False),
    (1, "Iteration 2 — inventory management and stock alerts", False),
    (1, "Iteration 3 — requisition capture and the approval chains", False),
    (1, "Iteration 4 — fulfilment, stock deduction and audit logging", False),
    "Testing ran alongside development, with an automated suite maintained across "
    "the whole codebase.",
    "Tools: React, Node.js/Express, PostgreSQL, Git and GitHub, with deployment to "
    "Vercel, Render and Neon.",
], size=16, gap=6)
notes(S[6], "If asked why Agile rather than Waterfall: the approval rules were not "
            "fully known at the outset — they were discovered by working through "
            "cases. That is the honest answer and it is the correct one.")

# ---------------------------------------------------------------- 8. Systems analysis
set_title(S[7], "SYSTEMS ANALYSIS")
add_body(S[7], [
    (0, "The existing system", True),
    (1, "Paper form raised → carried for signatures → Stores issues goods → ledger "
        "updated by hand, sometimes days later.", False),
    (1, "Weaknesses: no status visibility, authority unenforced, stock figures "
        "stale, no audit trail.", False),
    (0, "Functional requirements of the proposed system", True),
    (1, "Authenticate users and resolve their role and department; manage inventory; "
        "raise a requisition; route it for approval; fulfil it against stock; record "
        "every action to an audit log.", False),
    (0, "Non-functional requirements", True),
    (1, "Authority enforced per request; integrity preserved under concurrent "
        "fulfilment; accessible over the web across sites; responsive interface.", False),
], size=16, gap=6)
notes(S[7], "This is the bridge slide — it states what the current system does badly "
            "and what the new one must therefore do. Keep it short; the design "
            "slides are where the substance is.")

# ---------------------------------------------------------------- 9. Design 1
set_title(S[8], "SYSTEM DESIGN")
add_body(S[8], [
    (0, "Architecture — three tiers", True),
    (1, "React single-page application (Vercel) → Express REST API (Render) → "
        "PostgreSQL database (Neon).", False),
    (1, "Authentication is stateless: a signed JWT carries identity, but the user's "
        "role is re-read from the database on every request, so a revoked or "
        "changed role takes effect immediately.", False),
    (0, "Data model — five tables", True),
    (1, "departments, users, inventory, requisitions, audit_logs.", False),
    (1, "A multi-item request is stored as one row per line item, all sharing a "
        "batch_id, rather than a header row plus a junction table — so each line "
        "carries its own status and approver and can be decided individually.", False),
    (1, "Integrity is enforced in the database where it can be: foreign keys from "
        "users and requisitions to departments and from the audit log to users; "
        "uniqueness on both Staff ID and staff name; and a CHECK constraint "
        "forbidding a negative stock quantity.", False),
], size=15, gap=5)
notes(S[8], "Three points examiners reliably probe. First, why re-read the role "
            "rather than trust the token — because a token issued before a demotion "
            "would otherwise stay privileged until it expired. Second, why a CHECK "
            "constraint as well as application logic — because the constraint holds "
            "even if a future code path forgets to check. Third, why no "
            "requisition_items junction table — because per-line status and approver "
            "columns allow item-by-item decisions; the cost is that request-level "
            "attributes repeat on every line of a batch.")

# ---------------------------------------------------------------- 10. Design 2
set_title(S[9], "SYSTEM DESIGN — APPROVAL WORKFLOWS")
add_body(S[9], [
    "Every requisition carries two flags — whether it originates at head office, "
    "and whether it is for an IT item. Those two flags select the approval chain "
    "automatically; the originator chooses nothing.",
    (1, "Branch, any item  →  Accounts  →  Accounts Manager  →  Stores fulfils", True),
    (1, "Head office, non-IT  →  HOD or Deputy HOD  →  Accounts Manager  →  Stores fulfils", True),
    (1, "Head office, IT item  →  HOD or Deputy HOD  →  IT Manager  →  Accounts Manager  →  Stores fulfils", True),
    "The chain is implemented as a guarded state machine: each transition checks "
    "both the approver's role and the requisition's current status before it will "
    "advance.",
    "An attempt to approve out of turn is refused with a message naming the user's "
    "role, the request's current status, and the chain that actually applies — so "
    "the refusal is diagnostic rather than merely negative.",
], size=16, gap=6)
notes(S[9], "This slide is the heart of the contribution. If asked what happens when "
            "someone tries to skip a step: the transition is refused, because the "
            "guard tests status as well as role, so a step cannot be jumped even by "
            "someone who holds a valid approving role. Note that HOD and Deputy HOD "
            "share one step rather than forming two — either may take it, and taking "
            "it advances the status so the other cannot act again. Be ready for one "
            "sharp question: an IT item requested by a BRANCH follows the branch "
            "path and so receives no IT Manager review. That is a genuine gap in the "
            "routing rules, it is recorded as a limitation in Chapter One, and the "
            "fix is to make the is_it_item flag trigger IT review irrespective of "
            "origin.")

# ---------------------------------------------------------------- 11. Implementation 1
set_title(S[10], "SYSTEM IMPLEMENTATION")
add_body(S[10], [
    (0, "Technology", True),
    (1, "React 18 with React Router and role-guarded routes; Node.js and Express; "
        "PostgreSQL; bcrypt at ten rounds for password hashing; JSON Web Tokens "
        "for session identity.", False),
    (0, "Delivered functionality", True),
    (1, "Authentication by Staff ID; eight operational roles; inventory management "
        "with low-stock and out-of-stock alerts; a guided requisition wizard; "
        "single and batch approve/reject; fulfilment with stock deduction; and an "
        "audit-log viewer.", False),
    (0, "Preventing over-issue under concurrency", True),
    (1, "The row is locked with SELECT … FOR UPDATE, the decrement is guarded by a "
        "WHERE clause that re-tests the quantity, and the database CHECK constraint "
        "backs both. Two simultaneous fulfilments cannot drive stock negative.", False),
], size=15, gap=6)
notes(S[10], "Be precise about the concurrency mechanism: row-level locking plus a "
             "guarded conditional update, with a CHECK constraint as the final "
             "backstop. If asked why not optimistic concurrency with a version "
             "column — fulfilment is a short, write-heavy transaction, so taking the "
             "lock is cheaper than detecting a conflict and retrying.")

# ---------------------------------------------------------------- 12. Implementation 2 (screenshots)
set_title(S[11], "SYSTEM IMPLEMENTATION — SCREENS")
clear_body(S[11])
shots = [("inventory.png", "Inventory management"),
         ("alerts.png", "Stock alerts"),
         ("requisition.png", "Requisition capture"),
         ("audit.png", "Audit log")]
IW, IH, GX, GY = 3.52, 2.20, 0.40, 0.14
x0 = (13.333 - (IW * 2 + GX)) / 2
y0 = 1.92
for i, (fn, cap) in enumerate(shots):
    r, c = divmod(i, 2)
    x = x0 + c * (IW + GX)
    y = y0 + r * (IH + GY + 0.22)
    S[11].shapes.add_picture(f"{SHOTS}\\{fn}", Inches(x), Inches(y),
                             width=Inches(IW), height=Inches(IH))
    cb = S[11].shapes.add_textbox(Inches(x), Inches(y + IH + 0.02),
                                  Inches(IW), Inches(0.22))
    p = cb.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    rr = p.add_run()
    rr.text = cap
    rr.font.size = Pt(11)
    rr.font.color.rgb = MUTED
notes(S[11], "These are screen captures of the deployed system, not mock-ups. Offer "
             "the live demonstration here: log in, raise a requisition, approve it "
             "through the chain, fulfil it, and show the audit entry. If the network "
             "fails, these four images carry the same story.")

# ---------------------------------------------------------------- 13. Implementation 3 (testing)
set_title(S[12], "SYSTEM IMPLEMENTATION — TESTING")
add_body(S[12], [
    "Seventeen test files: six exercising the backend and eleven exercising the "
    "React frontend.",
    (0, "All seventy-four automated cases pass — 41 backend and 33 frontend.", True),
    "Backend tests run on the Node.js built-in test runner; frontend tests run on "
    "Jest with React Testing Library.",
    "Coverage spans authentication, departments, item authorisation, requisitions, "
    "users and server health, together with the interface components.",
    (0, "Reported honestly: the suite did not begin in this state. On first "
        "execution only 3 of 33 backend cases passed, because the tests had not "
        "been maintained through the authentication change and the PostgreSQL "
        "migration. Repairing that drift uncovered two real defects — a "
        "batch-approval fault, and an approval guard that let a Head of "
        "Department bypass the branch chain. Both are fixed, each covered by a "
        "regression test verified to fail without the fix.", True),
], size=14, gap=6)
notes(S[12], "Do not skip the last bullet. Volunteering that the suite had rotted, "
             "and that fixing it exposed real defects, is far stronger than "
             "claiming everything passed first time — and it is what actually "
             "happened. The two defects: batch approve and reject rejected the "
             "placeholder identifier the interface always sends; and the pending "
             "approval transition tested the approver's role without also testing "
             "whether the requisition originated at head office, so an HOD could "
             "pull a branch requisition into the head-office chain and skip Branch "
             "Accounts permanently. The second was found by checking the code "
             "against this deck's own workflow slide — a good answer if you are "
             "asked how you assured quality.")

# ---------------------------------------------------------------- 14. Conclusions
set_title(S[13], "CONCLUSIONS AND RECOMMENDATIONS")
add_body(S[13], [
    (0, "Conclusions", True),
    (1, "All six objectives were met. The system is built, tested and deployed, and "
        "enforces in software the approval authority that previously depended on "
        "convention.", False),
    (0, "Limitations", True),
    (1, "Not yet run against live CMC production data; no offline capability, so "
        "connectivity is required; reporting is basic, with no analytics dashboard; "
        "and notifications are in-application only.", False),
    (0, "Recommendations", True),
    (1, "Pilot with a single department before wider rollout; add email or SMS "
        "notification at each approval step; add a reporting module for stock "
        "movement and consumption; integrate with HR records so staff data has one "
        "owner; and commission a security review prior to production use.", False),
], size=15, gap=6)
notes(S[13], "State the limitations plainly rather than waiting to be asked — an "
             "examiner who has to extract them reads them as concealed. The first "
             "limitation is the significant one: the system has been exercised with "
             "test data, not live operational data.")

# ---------------------------------------------------------------- 15. References
set_title(S[14], "REFERENCES")
clear_body(S[14])
REFS = [
    "Banks, A., & Porcello, E. (2020). Learning React: Modern patterns for "
    "developing React apps (2nd ed.). O'Reilly Media.",
    "Casciaro, M., & Mammino, L. (2020). Node.js design patterns (3rd ed.). "
    "Packt Publishing.",
    "Chopra, S., & Meindl, P. (2019). Supply chain management: Strategy, "
    "planning, and operation (7th ed.). Pearson.",
    "Dumas, M., La Rosa, M., Mendling, J., & Reijers, H. A. (2018). "
    "Fundamentals of business process management (2nd ed.). Springer.",
    "Elmasri, R., & Navathe, S. B. (2016). Fundamentals of database systems "
    "(7th ed.). Pearson.",
    "Ghana Cocoa Board. (2024). Cocoa Marketing Company (Ghana) Limited. "
    "https://cocobod.gh",
    "Kleppmann, M. (2017). Designing data-intensive applications. O'Reilly "
    "Media.",
    "Laudon, K. C., & Laudon, J. P. (2020). Management information systems "
    "(16th ed.). Pearson.",
    "Newman, S. (2021). Building microservices: Designing fine-grained systems "
    "(2nd ed.). O'Reilly Media.",
    "OWASP Foundation. (2021). OWASP Top 10: The ten most critical web "
    "application security risks.",
    "The PostgreSQL Global Development Group. (2024). PostgreSQL 16 "
    "documentation.",
    "Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A "
    "practitioner's approach (9th ed.). McGraw-Hill Education.",
    "Richards, G. (2017). Warehouse management (3rd ed.). Kogan Page.",
    "Silberschatz, A., Korth, H. F., & Sudarshan, S. (2020). Database system "
    "concepts (7th ed.). McGraw-Hill.",
    "Sommerville, I. (2016). Software engineering (10th ed.). Pearson.",
    "Stallings, W., & Brown, L. (2018). Computer security: Principles and "
    "practice (4th ed.). Pearson.",
    "van der Aalst, W. M. P. (2016). Process mining: Data science in action "
    "(2nd ed.). Springer.",
    "Wild, T. (2017). Best practice in inventory management (3rd ed.). "
    "Routledge.",
]
COLW, GAPX = 5.55, 0.40
for col in range(2):
    box = S[14].shapes.add_textbox(
        Inches(0.92 + col * (COLW + GAPX)), BODY["y"],
        Inches(COLW), BODY["h"])
    tfc = box.text_frame
    tfc.word_wrap = True
    chunk = REFS[col * 9:(col + 1) * 9]
    for j, ref in enumerate(chunk):
        p = tfc.paragraphs[0] if j == 0 else tfc.add_paragraph()
        p.space_after = Pt(6)
        r = p.add_run()
        r.text = ref
        r.font.size = Pt(10.5)
        r.font.color.rgb = INK
notes(S[14], "Eighteen works, matching the reference list in the dissertation "
             "exactly. If asked which were most influential: Stallings and Brown "
             "for the access-control model, Elmasri and Navathe for the schema "
             "design, and Kleppmann for the concurrency analysis.")

prs.save(OUT)
print("saved:", OUT)
print("slides:", len(prs.slides))
for i, s in enumerate(prs.slides, 1):
    ttl = s.shapes.title.text_frame.text if s.shapes.title is not None else "(none)"
    has_footer = any("Footer" in sh.name for sh in s.shapes)
    has_num = any("Slide Number" in sh.name for sh in s.shapes)
    print(f"  {i:2d}. {ttl[:52]:54s} footer={has_footer} num={has_num}")
