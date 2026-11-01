# Multi-site redesign — design note

Status: **for review, nothing built yet**
Context: pilot is live with 5 requisitions, 6 items, real users.

This note records the model CMC actually operates, how far the current system
is from it, and a migration path that does not disturb the running pilot until
you approve it.

---

## 1. What the system assumes today, and why it is wrong

| The system assumes | CMC actually operates |
|---|---|
| One stock pool. `inventory.quantity` is a single global number. | Head office Stores is the central store. Tema, Kumasi and Takoradi each have **their own store**. |
| "Department" and "location" are the same thing — `Tema Takeover Center` is a department row, and so is `IT`. | Departments exist **at** locations. There is an Accounts department at head office *and* at Tema. |
| A takeover-centre requisition goes Accounts → Accounts Manager → Stores. | It starts with the **centre's own HOD**, then Accounts, then that centre's **Regional Manager**. |
| One Accounts Manager authority for everything. | Each centre has **its own Regional Manager**, with authority only over that centre. |
| Every requisition is a department asking a store for goods. | There is a **second transaction type**: a centre's store requesting replenishment from head office. |

The single-quantity assumption is the expensive one. In the model you describe
there is no such thing as a global quantity for an item — there is Tema's
stock, Kumasi's stock and head office's stock, and goods move between them.

---

## 2. Proposed model

### 2.1 Sites

```
sites
  id          SERIAL PRIMARY KEY
  name        VARCHAR(100) NOT NULL UNIQUE   -- 'Head Office', 'Tema', 'Kumasi', 'Takoradi'
  is_central  SMALLINT NOT NULL DEFAULT 0    -- 1 for head office only
```

`is_central` replaces `departments.is_head_office`. It sits on the thing it
actually describes — a location — which is why the current flag has been
impossible to set sensibly.

### 2.2 Departments become site-scoped

A department exists at a site. "Accounts" at Tema and "Accounts" at head
office are different rows, with different HODs.

```
departments
  id       SERIAL PRIMARY KEY
  site_id  INTEGER NOT NULL REFERENCES sites(id)
  name     VARCHAR(100) NOT NULL
  UNIQUE (site_id, name)
```

### 2.3 Users belong to a site and a department

```
users
  + site_id  INTEGER NOT NULL REFERENCES sites(id)
```

Every user is "role X, in department Y, at site Z". That is what makes
"the Regional Manager for Tema" expressible — and what stops the Tema Regional
Manager approving Kumasi's requisitions.

**Storekeepers at a takeover centre:** you said Stores sits under the Accounts
department at a centre. The simplest faithful representation is to give the
centre's storekeeper `department = Accounts`, `role = stores`. Their requests
then naturally go to the HOD of Accounts at that site, with no department
hierarchy table needed. Flag if that misrepresents it.

### 2.4 Stock becomes per-site

`inventory` keeps the catalogue (what an item *is*). Quantities move out:

```
inventory              -- the catalogue, one row per item
  id, name, category, type, unit, description

inventory_stock        -- how much of it is where
  item_id       VARCHAR(50) NOT NULL REFERENCES inventory(id)
  site_id       INTEGER     NOT NULL REFERENCES sites(id)
  quantity      INTEGER     NOT NULL DEFAULT 0
  reorder_level INTEGER     NOT NULL DEFAULT 0
  updated_at    TIMESTAMP   NOT NULL DEFAULT NOW()
  PRIMARY KEY (item_id, site_id)
  CHECK (quantity >= 0)
```

Reorder level moves here too: Tema may want to reorder toner at 20 while head
office reorders at 200. The `CHECK (quantity >= 0)` and the existing
`SELECT … FOR UPDATE` concurrency guard carry over unchanged — they just
operate on `(item_id, site_id)` instead of `item_id`.

### 2.5 New role

`regional_manager`, added to `USER_ROLES`, scoped by `site_id` like every
other role.

---

## 3. The three workflows

**A — Departmental requisition at head office** *(close to what exists)*

```
Requester (HO dept) → HOD of that dept → [IT Manager, if IT] → Accounts Manager → HO Stores
```

**B — Departmental requisition at a takeover centre** *(new: starts with the centre's HOD)*

```
Requester (Tema dept) → HOD of that dept at Tema → Accounts (Tema) → Regional Manager (Tema) → Tema Stores
```

Fulfilment deducts from **Tema's** stock, not head office's.

**C — Store replenishment, centre → head office** *(entirely new)*

```
Tema storekeeper → Head of Accounts (Tema) → Regional Manager (Tema)
    → [IT Manager at HO, if IT] → Accounts Manager (HO) → HO Stores issues
```

On fulfilment this is a **transfer**, not an issue: head office stock
decreases and Tema stock increases by the same amount, in one transaction.
That is a different operation from workflow A and B, where stock simply
leaves the system.

---

## 4. Mixed IT and non-IT on one slip — your question

Today `is_it_item` is a **batch-level** checkbox, so a slip is entirely IT or
entirely not. A slip containing a laptop and a ream of paper cannot be
represented, and if it could, the IT Manager would be approving stationery.

Four ways to handle it:

| Option | What happens | Cost |
|---|---|---|
| **Auto-split (recommended)** | Requester fills one slip. On submission the system creates two requisitions — IT lines and non-IT lines — each following its correct chain, linked by a shared reference. | Two tracking refs per mixed slip; "My Requisitions" must group them. |
| Route everything through IT | Any slip containing one IT item goes to the IT Manager. | IT Manager approves items outside their remit. Weakens the control. |
| Per-line approval | Each line carries its own chain and status. | Most faithful, most complex UI and state machine. |
| Reject mixed slips | Validation forces separate submissions. | Simplest to build, worst for the requester, and they will work around it. |

**Recommendation: auto-split.** Your schema already stores one row per line
item with its own status and approver columns — the structure for this is
present. The requester's experience is unchanged (still one slip), approvers
only ever see what they are entitled to decide, and the audit trail stays
truthful about who approved what. The only real cost is that one submission
yields two references, which the interface can present as a single grouped
entry.

---

## 5. Migration plan

Ordered so that each step is independently reversible and the pilot keeps
working throughout.

1. **Create `sites`**, seed `Head Office (is_central = 1)`, `Tema`, `Kumasi`,
   `Takoradi`. Nothing reads it yet.
2. **Add `departments.site_id`.** Existing department rows — IT, HR, Finance,
   Stores, Shipping — map to Head Office, since you confirmed current stock and
   users are all there. The three `… Takeover Center` department rows are
   retired: they were locations masquerading as departments.
3. **Add `users.site_id`**, default Head Office for every existing user. You
   then reassign anyone who actually sits at a centre.
4. **Create `inventory_stock`** and copy every current `inventory.quantity`
   into `(item, Head Office)` — matching your statement that all present stock
   is at head office. Centres start at zero until you enter opening figures.
5. **Dual-read period.** Routes read from `inventory_stock` but
   `inventory.quantity` is kept in sync, so a rollback is one deploy.
6. **Add `regional_manager`** and the workflow-B and workflow-C chains.
7. **Drop `inventory.quantity`** and `departments.is_head_office` once the new
   path has run clean for an agreed period.

Steps 1–4 are additive and safe to run against the live pilot. Step 5 onward
changes behaviour and wants a quiet window.

---

## 6. What this touches

- `Backend/lib/database.js` — schema, migrations, seed
- `Backend/lib/roles.js` — new role, site-aware helpers
- `Backend/routes/requisitionRoutes.js` — the state machine gains workflows B
  and C, and every guard becomes site-aware
- `Backend/routes/inventoryRoutes.js` — stock reads and writes become per-site
- `Backend/lib/requisitions.js` — fulfilment deducts per-site; transfers are new
- `src/` — site context throughout; requisition and transfer as distinct flows;
  admin screens for sites, per-site stock and opening balances
- Tests — the approval-chain suite roughly doubles

This is a v2, not a patch. Estimate it in weeks, not days.

---

## 7. Open questions

1. Is "Matakrade" in your note a third centre, or Takoradi? The seed has Tema,
   Kumasi and Takoradi.
2. Can a department at a centre request directly from head office, or only ever
   through its own centre's store?
3. Does the head office Accounts Manager approve centre *departmental*
   requisitions, or only replenishments? Workflow B above assumes the Regional
   Manager is the final approver for a centre's own stock.
4. Who enters opening stock figures for each centre — and should that be
   auditable as an adjustment rather than a silent edit?
