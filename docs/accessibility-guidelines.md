# Accessibility Guidelines

This project now relies on a small set of frontend accessibility conventions. When we touch UI code, we should preserve these patterns so the experience stays consistent.

## Core expectations

- Give each page a clear document title.
- Keep one main page heading per screen when practical.
- Use visible labels for form fields instead of placeholder-only inputs.
- Connect helper and error text with `aria-describedby` where it improves context.
- Set `aria-invalid` when a field is in an error state.
- Return keyboard focus to the triggering control after closing a modal.
- Use meaningful button labels when the same action repeats in a table or list.
- Add table captions and `scope="col"` or `scope="row"` where data tables need extra context.

## Existing shared patterns

- [useDocumentTitle.js](/C:/Users/PC/cocoa-inventory/src/hooks/useDocumentTitle.js)
  Sets route-level document titles consistently.
- [ModalCard.jsx](/C:/Users/PC/cocoa-inventory/src/Component/ui/ModalCard.jsx)
  Handles dialog focus entry, focus trapping, escape-to-close, and focus return.
- [StateNotice.jsx](/C:/Users/PC/cocoa-inventory/src/Component/ui/StateNotice.jsx)
  Provides shared status and error announcements with live-region semantics.
- [styles.css](/C:/Users/PC/cocoa-inventory/src/styles.css)
  Includes helper classes such as `.skip-link`, `.field-help`, and `.sr-only`.

## Working guidance

- Prefer updating shared UI components before adding one-off accessibility behavior.
- Keep loading and success messages specific enough to explain what is happening.
- When a workflow changes state after a submit, think about where keyboard focus should land next.
- If a table action would be ambiguous to a screen reader, include the row subject in the button label.

## Quick check before merging

- Can the main workflow be completed with keyboard only?
- Does each important screen have a useful document title?
- Are errors announced clearly?
- Do repeated actions still make sense out of visual context?
