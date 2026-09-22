"""
Cross-check round 2. Every claim below was checked against the code and found
to describe something the system does not do.

Verified against Backend/lib/database.js, Backend/lib/roles.js,
Backend/lib/auth.js, Backend/routes/requisitionRoutes.js and src/.

  Claim                                    Reality
  ---------------------------------------  --------------------------------------
  "94% line coverage", "100% coverage"     No coverage instrumentation was run.
  "two outstanding failures"               All 74 tests pass; stale text.
  departments "parent department refs"     Table has id, name, description,
                                           is_head_office. No parent column.
  status "constrained through a database   status is VARCHAR(50). No ENUM type.
   ENUM"
  "applicable workflow path identifier"    No such column; path is derived.
  rejection reason on Requisitions         No such column; it goes to
                                           audit_logs.details.
  "Notification Service", "immediate       No notification module exists anywhere
   system notifications", "every state     in Backend/. The UI panel polls for
   transition generates a notification"    pending items; nothing is pushed.
  Deputy HOD "delegation"                  No delegation feature. Both roles are
                                           simply permitted at the same step.
  IT workflow "applies to requisitions     Only head-office IT items. A branch IT
   that involve IT items"                  item follows the branch path and gets
                                           no IT Manager review.
"""
from docx import Document
from docx.shared import Pt
import copy

DOC = r"C:\Users\PC\cocoa-inventory\CHAPTER ONE-FIVE (CORRECTED).docx"
doc = Document(DOC)
ps = doc.paragraphs


def set_text(p, text):
    for r in list(p.runs)[1:]:
        r._element.getparent().remove(r._element)
    if p.runs:
        p.runs[0].text = text
    else:
        p.add_run(text)


def rewrite(marker, new):
    for p in doc.paragraphs:
        if marker in p.text:
            set_text(p, new)
            return True
    return False


EDITS = [
# ---------------------------------------------------------------- notifications
("Approvers receive immediate system notifications",
 "Automated Multi-Path Workflow Routing: The routing logic evaluates each "
 "requisition against the originating department's branch classification and "
 "the item category to assign the requisition to the correct approval path "
 "automatically. Outstanding approvals are surfaced to each approver in their "
 "dashboard queue, removing the delay associated with physically carrying a "
 "paper form from desk to desk."),

("It includes the notification system for alerting approvers of pending actions",
 "Sprint 3 (Workflow Logic and Approval Matrix): This Sprint implements the "
 "routing logic and the three specialized approval workflow paths. It includes "
 "the pending-approval queue that surfaces outstanding actions to each "
 "approver, the requisition status tracking interface for submitting users, and "
 "the approval and rejection interfaces for each approver role. By the end of "
 "Sprint 3, the complete requisition lifecycle from submission to fulfillment "
 "is functional."),

("and with the Notification Service to alert relevant approvers of pending actions",
 "The Requisition Service orchestrates the complete lifecycle of a requisition, "
 "from initial submission through the multi-step approval chain to final "
 "fulfillment. It applies the routing logic that determines the appropriate "
 "approval path for each new requisition, and records every transition to the "
 "audit log."),

("Every state transition generates a notification to the affected users",
 "When an employee submits a requisition through the digital storefront, the "
 "request is recorded in the requisitions data store. The routing logic then "
 "inspects the originating department's branch classification and the item "
 "category to select the correct approval path. The requisition subsequently "
 "moves through the required approval steps, with each decision recorded "
 "against the requisition and mirrored in the audit log. Once the final "
 "approval is granted, the requisition enters the fulfilment queue, where the "
 "Stores role confirms physical issuance and the system performs the stock "
 "deduction inside a transaction. Every state transition is written to the "
 "append-only audit trail and becomes visible to the affected users through "
 "their dashboard queues; the system does not push email or SMS notifications. "
 "Figure 3.2 presents the data flow diagram of this design."),

# ---------------------------------------------------------------- delegation
("delegating approval authority to the Deputy HOD during periods of absence",
 "The HOD (Head of Department) role is responsible for the first-level approval "
 "of departmental requisitions. Primary use cases include viewing the queue of "
 "pending requisitions from their department, reviewing requisition details "
 "including the requester's identity and the items requested, and approving or "
 "rejecting requisitions. First-level approval authority is held jointly with "
 "the Deputy HOD: either role may take that step, so departmental approvals are "
 "not blocked by the absence of one post-holder."),

("with the system ensuring that both roles cannot approve the same requisition independently",
 "The Deputy HOD role shares approval permissions with the HOD and may act in "
 "the primary approver's absence. Either role may take the first-level approval "
 "step. Because taking that step advances the requisition's status, and the "
 "guard admits the HOD and Deputy HOD only while the status is still pending, "
 "the second post-holder cannot then act on the same requisition — double "
 "approval at a single stage is prevented by the state machine itself rather "
 "than by a separate check."),

# ---------------------------------------------------------------- schema claims
("parent department references to support hierarchical organizational structures",
 "The Departments table stores department identifiers, names, an optional "
 "description, and a branch classification flag, is_head_office, distinguishing "
 "Head Office from branch departments. The branch classification is critical to "
 "the routing logic, as it determines whether a requisition raised by this "
 "department follows the branch approval path or a head-office path. The table "
 "is flat: no parent-department reference is stored, so nested departmental "
 "hierarchies are not modelled."),

("The status field is constrained through a database ENUM to the defined set of valid states",
 "The Requisitions table records the lifecycle state of each request. Because a "
 "multi-item request is stored as one row per line item sharing a batch_id, "
 "every row carries the requester's identifier, the item and quantity, the "
 "originating department with its is_head_office flag, the is_it_item flag, the "
 "current approval status, and a separate column recording the approving user "
 "at each step. The status field is a VARCHAR whose permitted values are "
 "enforced by the approval state machine in application code rather than by a "
 "database ENUM type. The applicable workflow path is not stored as a column: "
 "it is derived at each transition from the is_head_office and is_it_item "
 "flags, so the path cannot drift out of step with the requisition's own "
 "attributes. A rejection reason, where an approver supplies one, is recorded "
 "in the audit log rather than on the requisition row."),

# ---------------------------------------------------------------- IT path scope
("This workflow applies to requisitions that involve items categorized as IT equipment or services",
 "This workflow applies to requisitions raised by head-office departments that "
 "involve items categorized as IT equipment or services. Recognizing that IT "
 "procurement carries additional technical considerations beyond standard "
 "financial governance, this path includes a mandatory IT Manager review step "
 "after HOD approval. The approval path progresses from Pending to HOD Approval "
 "to IT Manager Approval to Account Approval and finally to Fulfillment. The IT "
 "Manager's role in this path is to validate that the requested equipment meets "
 "organizational IT standards, is compatible with existing infrastructure, and "
 "represents an appropriate technical choice for the stated purpose. It should "
 "be noted that the IT review is scoped to head-office requisitions: an IT item "
 "requested by a branch department follows Workflow 1 and therefore receives "
 "financial approval without a technical review. This is a limitation of the "
 "current routing rules rather than a deliberate exemption, and is recorded as "
 "such in Chapter One."),

# ---------------------------------------------------------------- fabricated metrics
("The unit test suite achieves 94% line coverage of the backend service layer",
 "The testing programme demonstrates that the implemented system meets the "
 "functional requirements articulated in the system analysis phase. Seventy-four "
 "automated test cases pass across seventeen test files — forty-one exercising "
 "the backend routes and helper functions, and thirty-three exercising the React "
 "components. No coverage instrumentation was run, so no line or branch coverage "
 "percentage is claimed: the extent of verification is reported instead as the "
 "set of behaviours the suite actually exercises, enumerated in Appendix C, "
 "together with the three areas recorded there as carrying no automated "
 "coverage. Behaviour across the eight roles and three approval paths was "
 "additionally exercised by hand against the deployed system during development; "
 "because those checks were not captured in a formal test execution log, they "
 "are reported here as developer verification rather than as an auditable "
 "functional test suite."),

# ---------------------------------------------------------------- stale summary
("with the two outstanding failures and the absence of concurrency testing recorded in Appendix C",
 "Chapter Four documented the implementation and testing of the system. The four "
 "key components were implemented in accordance with the design specifications: "
 "the authentication module provides JWT-based authentication with bcrypt "
 "password hashing, re-reading the user's role and active status from the "
 "database on every request so that privilege changes and deactivations take "
 "effect immediately; the inventory module restricts write access to the Stores "
 "and Admin roles; the requisition module implements the three approval paths as "
 "an explicit guarded state machine; and the audit logging module maintains an "
 "append-only record of significant events. The testing programme comprises "
 "seventeen automated test files covering the backend routes and the React "
 "components, all seventy-four cases passing, together with a targeted "
 "regression test for the fulfilment concurrency guard. The limits of that "
 "verification — in particular the absence of load testing under sustained "
 "contention, and the absence of end-to-end browser testing — are recorded in "
 "Appendix C."),
]

print("=== round 2 corrections ===")
for marker, new in EDITS:
    print(f"  {'ok  ' if rewrite(marker, new) else 'MISS'}  {marker[:66]}…")

# ------------------------------------------------- insert the new limitation
anchor = None
for p in doc.paragraphs:
    if p.text.strip().startswith("Integration Limitations:"):
        anchor = p
        break

if anchor is not None:
    new_p = copy.deepcopy(anchor._p)
    anchor._p.addnext(new_p)
    from docx.text.paragraph import Paragraph
    np = Paragraph(new_p, anchor._parent)
    set_text(np,
        "Technical Review Scope: The mandatory IT Manager review applies only to "
        "IT requisitions raised by head-office departments. A requisition for an "
        "IT item raised by a branch department follows the branch financial "
        "approval path and therefore receives no technical review. Extending the "
        "routing rules so that the is_it_item flag triggers IT review "
        "irrespective of the originating branch is identified as future work.")
    print("  ok    inserted 'Technical Review Scope' limitation")
else:
    print("  MISS  could not find the Integration Limitations anchor")

doc.save(DOC)

# ------------------------------------------------- verify
d2 = Document(DOC)
txt = "\n".join(p.text for p in d2.paragraphs)
print("\n=== residual check (all should be clear) ===")
for term in ["94% line coverage", "100% coverage", "two outstanding failures",
             "parent department references", "database ENUM",
             "Notification Service", "immediate system notifications",
             "generates a notification", "delegating approval authority",
             "workflow path identifier"]:
    print(f"  {'STILL PRESENT' if term in txt else 'clear        '}  {term}")
print(f"\nparagraphs: {len(d2.paragraphs)}   images: {len(d2.inline_shapes)}")
