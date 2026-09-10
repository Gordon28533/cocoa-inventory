# CMC Inventory & Requisition System — Presenter Script

**Audience:** Cocoa Marketing Company (Ghana) Ltd — management
**Goal:** secure agreement to a four-week pilot with one department
**Length:** 12 slides, roughly 15–20 minutes plus questions

A note on discipline: there are no statistics anywhere in this deck, because we have no measured data from CMC. If someone asks "how much time will this save?", the honest answer is *"I don't know yet — that's exactly what the pilot would tell us."* That answer builds more credibility than a number you invented.

---

## 1 — Title

> Inventory and Requisition Management System
> Proposal for Cocoa Marketing Company (Ghana) Ltd

**Say:** Two sentences only. Name who it's for and what it replaces, then move on. Do not open with technology.

---

## 2 — Five problems with the way it works today

1. **Approvals move at walking pace** — a form is carried by hand from desk to desk; if an approver is away, it waits.
2. **No reliable record of who approved what** — paper signatures are hard to trace months later.
3. **Stock records disagree with the shelves** — spreadsheets are updated after the fact.
4. **Everyone sees everything** — a shared spreadsheet enforces nothing.
5. **Requesters are left in the dark** — no way to check progress except by telephone.

**Say:** This slide earns you the right to present the rest. Don't rush it. Then ask directly: *"Which of these five do you feel most?"* Their answer tells you which later slide to spend your time on. Listen properly — this is the most valuable thirty seconds of the meeting.

---

## 3 — The same request, before and after

| Today | With the system |
|---|---|
| Fill in a paper requisition form | Submit from any browser |
| Walk it to the head of department | It routes itself to the right approver |
| Wait — no way to see where it is | Requester tracks status at any time |
| Carry it to accounts for approval | Approvers act from wherever they are |
| Take it to stores to be issued | Stores issues against an approved request |
| Someone updates the spreadsheet later | Stock updates the moment it is issued |

**Say:** Walk down the left column, then the right. The pairing does the persuading — resist the urge to add commentary.

---

## 4 — How a request moves through the system

**Request → Route → Approve → Issue → Record**

**Say:** The key point is that routing is *automatic*. The requester does not choose their approver and cannot skip one. That is precisely what makes the audit trail worth trusting.

---

## 5 — Three approval routes, chosen automatically

| Branch request | Head Office — general | Head Office — IT equipment |
|---|---|---|
| Branch Accounts | Head of Department | Head of Department |
| Head Office Accounts | Head Office Accounts | IT Manager |
| Stores issues | Stores issues | Head Office Accounts |
| | | Stores issues |

**Say:** This is your differentiator. Off-the-shelf inventory packages assume a single approval chain — that's why they don't fit an organisation with branches and a head office. These three routes were built from CMC's own structure.

Then ask: *"Do these chains match how you actually work?"* If they say no, that is a configuration conversation, not a rebuild. Say so — it removes a fear they may not voice.

---

## 6 — Everyone sees only what their job requires

Eight roles: Staff member · Head of Department · Deputy HOD · Branch Accounts · Accounts Manager · IT Manager · Stores · Administrator

**Say:** Permissions attach to the *role*, not the person. So moving someone between posts is an administrative change, not a security risk.

---

## 7 — Every action leaves a permanent record

Recorded: submissions, every approval and rejection, the reason for a rejection, goods issued and by whom, stock adjustments, sign-ins including failed attempts, user accounts created or deactivated.

**Records can be added, but never edited or deleted — not even by an administrator.**

**Say:** For a finance or audit audience this is often the slide that closes the deal. Append-only by design is what makes the log *evidence* rather than a convenience.

---

## 8 — Security built in, not bolted on

- **Passwords are never stored** — one-way encrypted; nobody can read them, including you.
- **Permissions checked on every action** — a demotion or deactivation takes effect immediately.
- **Sessions expire automatically** — eight hours.
- **Encrypted connections throughout.**

**Say:** Keep it non-technical. If asked how passwords are protected, the honest term is industry-standard one-way hashing (bcrypt) — but only offer the jargon if they ask for it.

---

## 9 — Already built, deployed and running

Nothing to install · No servers to buy · Works across sites

**Ready for a pilot.**

**Say:** Be straight here. It is built and live, but it has **not** yet carried a real CMC workload. Proposing a supervised pilot rather than a full switch is both the honest position and the better sell — it lowers their perceived risk. Do not claim battle-tested.

---

## 10 — What is ready now, and what comes next

**Working today:** multi-item requisitions · all three approval routes end to end · rejection with recorded reason · stock issue and automatic deduction · low-stock and out-of-stock alerts · barcode scanning when adding items · full audit trail with export · user, role and department management

**Planned next:** automatic purchase orders at reorder level · email and SMS alerts · management reports on consumption and cycle times · mobile application · offline capability · supplier and delivery tracking

**Say:** Showing a roadmap builds credibility — it proves you know the difference between what exists and what is promised. **Watch your tenses.** Nothing from the right-hand column may drift into the present tense while you speak.

---

## 11 — What adopting it would involve

| | Phase | Detail | When |
|---|---|---|---|
| 1 | Set up | Departments, roles, accounts; agree approval chains | Week 1 |
| 2 | Load stock | Clean and import existing spreadsheets | Week 1–2 |
| 3 | Train | Short session per role | Week 2 |
| 4 | Pilot | One department live, paper continues in parallel | Week 3–4 |
| 5 | Roll out | Extend once the pilot settles | Month 2 |

**Say:** State the parallel-running point explicitly. Cautious clients need to hear they are not being asked to abandon the paper trail on day one.

---

## 12 — The ask

**A pilot with one department. Four weeks.**

What you need from them:
- A department to pilot with — ideally one that raises requisitions regularly
- A contact who can confirm the approval chains are right
- Their current stock records, in whatever form they exist

**Say:** Close on something small and concrete, not a general request for approval. Have the live system open in another browser tab so you can demonstrate the moment they say yes.

---

## Before you walk into the room

- [ ] **Change the admin password.** It is still the published default `admin123`.
- [ ] **Seed real inventory items.** The system currently has none — a live demo of an empty list undoes the whole pitch.
- [ ] **Create one demo account per role** so you can show the approval chain from both sides.
- [ ] **Wake the server first.** The free hosting tier sleeps when idle and the first request can take up to a minute. Load the site five minutes before you present.
- [ ] Have the site open in a second tab, already signed in.

## Questions you should expect

**"What does it cost to run?"** — Currently on free hosting tiers, which suit a pilot. A production deployment for an organisation this size would need a paid tier; you can price it once the pilot shows the real usage.

**"What if the internet goes down at a branch?"** — Today the system needs connectivity. Offline capability is on the roadmap. Do not pretend otherwise; branches with unreliable connections are a genuine consideration and saying so is a mark of seriousness.

**"Who supports it?"** — You do, during the pilot. Be clear about what happens after, because they will be thinking about it even if they don't ask.

**"Can it handle everyone using it at once?"** — Honest answer: it has not been load-tested, and the pilot is partly there to find out. There is a known refinement needed around simultaneous stock issues, which is straightforward to address before wider rollout.
