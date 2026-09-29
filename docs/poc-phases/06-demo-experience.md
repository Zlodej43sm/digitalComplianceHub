# POC Phase 6 — Customer demo experience

Status: implemented. Depends on: Phase 5 for the full POC. Estimate: 1–2 engineering days.

Goal: make the working journey easy for prospective customers to understand and navigate.

## Implementation scope

1. Improve each role's landing page: clients see their cases and requested actions; managers see assigned formal checks; compliance staff see assigned reviews. Every case shows its current state and next responsible actor.
2. Refine the case-detail layout for documents, version history, findings, messages and the audience-appropriate audit timeline. Preserve the permission rules already implemented.
3. Add basic statistics: counts by status, awaiting-client work and elapsed review time. Derive all values from persisted records and apply the same scope rules as case lists. Label calculations so pending cases are not counted as completed turnaround.
4. Improve in-app notifications, safe deep links, loading/empty/error states and expired-session recovery. Add consistent forms, keyboard navigation and readable contrast.
5. Put all user-facing text in translation catalogs and provide Ukrainian/English text for the core journey. Store dates consistently and format them for display; interface language must not change rules or permissions.
6. Prepare repeatable seeded complete, missing-document and discrepancy scenarios plus the eight-minute demo script. Keep synthetic-data and simulated-analysis labels visible.

This phase polishes working screens. It does not add a reporting warehouse, regulatory rule packs, Excel/PDF exports, email/SMS or customer onboarding.

## Deliverables

- Consistent role-specific UI, limited statistics and usable in-app notifications.
- Ukrainian/English core interface and tested empty/error states.
- Deterministic demonstration scenarios and presentation instructions.
- Browser checks for key navigation, notification scope and statistic accuracy.

## Run and inspect

1. Run the full eight-minute scenario in separate client, manager and compliance profiles, using only the UI.
2. At each step, identify what is missing and who must act next without reading implementation documentation.
3. Compare dashboard totals against the seeded case list and expected state changes.
4. As the second organization, inspect statistics, notification links and timelines for leakage.
5. Switch between Ukrainian and English and verify the core journey remains usable. Check long labels and keyboard navigation.
6. Trigger an empty queue, failed analysis, failed upload and expired session; each should give a meaningful next action.

Completion gate: a second person can follow the walkthrough and explain its result. Record usability issues separately from optional new features; fix issues that prevent the demo before release.

Implemented artifacts: the scoped `/api/dashboard` summary, role-specific bilingual workspaces, safe `#case=` deep links, deterministic seven-status `pnpm seed:scenarios` bootstrap and the [eight-minute walkthrough](../demo-walkthrough.md). Pending cases are excluded from completed-turnaround calculations.

Next: [Phase 7](07-verification-and-release.md). Overall scope: [POC plan](../cloudflare-poc-plan.md).
