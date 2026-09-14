# Interface Screenshots

Captured from the **live deployed system** at `https://cocoa-inventory.vercel.app`
by `capture.cjs`, which drives the installed Chrome through `puppeteer-core`.
Nothing here is a mockup or a rendering of a design — every image is the running
application with real data from the production database.

Regenerate at any time with:

```
cd docs/screenshots
node capture.cjs
```

Captured at 1440×900 (desktop, ×2 pixel density) and 390×844 (mobile, ×3),
full page, signed in as an administrator.

| # | File | Interface | Figure caption suggestion |
|---|---|---|---|
| 01 | `01-login.png` | Sign-in screen | Authentication screen, showing employee-number sign-in |
| 02 | `02-inventory-list.png` | Inventory dashboard | Inventory management with search, sort, status badges and low-stock banner |
| 03 | `03-stock-alerts.png` | Notifications | Stock alerts grouped by severity |
| 04 | `04-requisition-form.png` | Raise a requisition | Step one of the requisition wizard |
| 05 | `05-my-requisitions.png` | My requisitions | Requester's own batches with status tracking |
| 06 | `06-departments.png` | Department management | Departments used for routing and approvals |
| 07 | `07-user-management.png` | User management | Administrative re-authentication gate before staff administration |
| 08 | `08-audit-log.png` | Audit log | Append-only audit trail with filtering, pagination and CSV export |
| 09 | `09-mobile-dashboard.png` | Dashboard (mobile) | Responsive layout at 390px |
| 10 | `10-mobile-login.png` | Sign-in (mobile) | Responsive authentication screen |

## Not captured

**Approvals** and **Fulfilment** are gated to approver and stores roles, so an
administrator session cannot reach them — the tabs are not rendered. Capturing
them needs a session for one of those accounts. Two options:

1. Sign in as the HOD (approvals) or Stores (fulfilment) and take the screenshot
   manually, saving as `11-approvals.png` / `12-fulfilment.png`.
2. Set `SHOT_STAFF_ID` and `SHOT_PASSWORD` before running the script and add the
   relevant tab to the `views` list:

   ```
   set SHOT_STAFF_ID=5567
   set SHOT_PASSWORD=...
   node capture.cjs
   ```

## Note on the state shown

These images reflect the database as it stood at capture time — six inventory
items, 78 audit entries, and the departments configured so far. If the
dissertation quotes any figure visible in a screenshot, re-capture after the
data is final so the text and the images agree.
