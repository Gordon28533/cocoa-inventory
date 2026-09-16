"""
Correct the claims that survived the earlier Chapter 3-4 pass.

Three classes of defect:
  (a) Chapters 1, 2, 4 and 5 assert that the system implements Petri Net
      soundness verification and Optimistic Concurrency Control with version
      stamping. Neither exists in the codebase. The real mechanism is a
      row-level lock (SELECT ... FOR UPDATE), a guarded conditional decrement
      with RETURNING, and a CHECK (quantity >= 0) constraint.
  (b) Chapter 4 reports "All 47 functional test cases passed" and "all ten
      concurrent test runs" — fabricated figures that also contradict the
      corrected count of 70 automated tests stated elsewhere in the chapter.
  (c) Two in-text citations have no entry in the reference list.

Chapter 2's *descriptions* of Petri nets and OCC as techniques in the
literature are left intact — a literature review may legitimately survey
methods the system does not adopt. Only claims of implementation are changed.

The term "Business Rules Engine" is also left intact: unlike OCC, it names
logic that genuinely exists (the routing that selects one of three approval
paths from the is_head_office and is_it_item flags at submission time).
"""
from docx import Document

DOC = r"C:\Users\PC\cocoa-inventory\CHAPTER ONE-FIVE (CORRECTED).docx"
doc = Document(DOC)
ps = doc.paragraphs


def set_text(p, text):
    """Replace the whole paragraph, preserving run[0]'s formatting."""
    for r in list(p.runs)[1:]:
        r._element.getparent().remove(r._element)
    if p.runs:
        p.runs[0].text = text
    else:
        p.add_run(text)


def replace_in_runs(p, old, new):
    """Targeted substring replace that preserves multi-run formatting."""
    for r in p.runs:
        if old in r.text:
            r.text = r.text.replace(old, new)
            return True
    joined = "".join(r.text for r in p.runs)
    if old in joined:
        set_text(p, joined.replace(old, new))
        return True
    return False


# ---------------------------------------------------------------- (a) + (b)
FULL = [
(50,
 "From an academic perspective, this study contributes a documented case study "
 "in the application of approval-workflow design, ACID transaction theory and "
 "NIST RBAC standards to a real-world organizational problem. Its distinctive "
 "feature is the combination, within a single cohesive web application, of "
 "conditional multi-path approval routing selected automatically from the "
 "properties of each request, role-based authorisation re-evaluated on every "
 "request, and database-level protection of stock quantities under concurrent "
 "fulfilment. This provides an empirical basis for future research in "
 "enterprise information systems design and deployment."),

(129,
 "Many existing web-based inventory systems employ naive read-then-write "
 "operations that are vulnerable to TOCTOU race conditions in multi-user "
 "environments. Few systems document explicit concurrency control strategies "
 "at the application level. The proposed system addresses this gap by "
 "serialising contention on an inventory row with a pessimistic row-level lock "
 "(SELECT ... FOR UPDATE), re-asserting the availability condition inside the "
 "decrementing UPDATE itself so that no deduction can rest on a stale read, "
 "and backing both with a CHECK (quantity >= 0) constraint that makes a "
 "negative quantity unrepresentable at the database level."),

(136,
 "The literature confirms that the transition from manual to automated, "
 "role-specific inventory and requisition management workflows is not merely a "
 "technological convenience but an operational necessity for organizations "
 "seeking to maintain competitive efficiency, financial accountability, and "
 "regulatory compliance. Theoretical frameworks, including formal workflow "
 "modelling, ACID transaction theory for data integrity assurance, and NIST "
 "RBAC formalization for access control specification, informed the proposed "
 "system's design, although formal soundness verification was not itself "
 "carried out within the scope of this project. Empirical evidence from "
 "implemented systems such as Cayuse, Odoo, and BarCloud validates the "
 "practical effectiveness of the design patterns employed while also "
 "highlighting specific capability gaps that the proposed system is uniquely "
 "positioned to address. The following chapter presents the methodology "
 "through which these theoretical and empirical insights are translated into a "
 "concrete system design and implementation."),

(419,
 "The testing programme, comprising unit, integration and functional testing "
 "together with a targeted concurrency regression test, confirms that the "
 "system meets the documented functional requirements and demonstrates "
 "protection against the over-issue vulnerability identified in the problem "
 "statement. Seventy automated test cases pass — 37 backend and 33 frontend — "
 "and the concurrency guard is exercised by a regression test that reproduces "
 "the interleaving the row-level lock exists to prevent, requiring the "
 "fulfilment to fail and roll back rather than deduct. As recorded in Section "
 "4.6, this is a logical test of the guard rather than a load test: the system "
 "has not been exercised under sustained concurrent traffic, and throughput "
 "under contention is unmeasured. The following chapter synthesises the "
 "findings of the project, evaluates the extent to which the stated objectives "
 "have been achieved, and provides recommendations for future development."),

(433,
 "From an academic perspective, this project contributes a documented "
 "empirical case study in the application of approval-workflow design, ACID "
 "transaction theory and NIST RBAC standards to a real-world organizational "
 "problem in the context of a developing economy. Its contribution lies in "
 "combining conditional multi-path routing, per-request role re-evaluation and "
 "database-level concurrency protection in one deployed system, providing a "
 "replicable model for future enterprise information systems projects in "
 "similar organizational contexts."),
]

print("=== Rewriting paragraphs that claimed unimplemented mechanisms ===")
for idx, new in FULL:
    before = ps[idx].text[:60]
    set_text(ps[idx], new)
    print(f"  [{idx}] rewritten  (was: {before}…)")

# ---------------------------------------------------------------- (c) citations
print("\n=== Resolving dangling citations ===")
ok = replace_in_runs(ps[388], "(Rostami, 2023)", "(Stallings & Brown, 2018)")
print(f"  [388] Rostami 2023 -> Stallings & Brown 2018 : {ok}")

ok = replace_in_runs(ps[444], " (Kumar Anugula Sethupathy, 2019)", "")
print(f"  [444] Kumar Anugula Sethupathy 2019 removed  : {ok}")

# ---------------------------------------------------------------- tidy typo
ok = replace_in_runs(ps[114], "(Kleppmann, 2017), .", "(Kleppmann, 2017).")
print(f"  [114] stray comma-period after citation fixed : {ok}")

doc.save(DOC)
print("\nsaved.")

# ---------------------------------------------------------------- verify
d2 = Document(DOC)
txt = "\n".join(p.text for p in d2.paragraphs)
checks = {
    "Rostami": "Rostami" in txt,
    "Kumar Anugula Sethupathy": "Kumar Anugula Sethupathy" in txt,
    "47 functional test cases": "47 functional test cases" in txt,
    "ten concurrent test runs": "ten concurrent test runs" in txt,
    "version stamping": "version stamping" in txt,
    "Petri Net-based workflow correctness verification":
        "Petri Net-based workflow correctness verification" in txt,
    "OCC with version stamping": "OCC with version stamping" in txt,
}
print("\n=== Residual check (all should be False) ===")
for k, v in checks.items():
    print(f"  {'STILL PRESENT' if v else 'clear        '}  {k}")
