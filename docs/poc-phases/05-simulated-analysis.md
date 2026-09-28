# POC Phase 5 — Simulated document analysis

Status: not started. Depends on: Phase 4. Estimate: 1–2 engineering days.

Goal: demonstrate how document assistance fits the review process, while clearly identifying all extraction and summary outputs as simulated.

## Implementation scope

1. Define an analysis-provider contract whose input references scoped document versions and whose output contains extracted fields, source page references, findings and a suggested summary/request.
2. Implement a deterministic fixture provider in TypeScript. Approved fixture hashes map to predefined fields and evidence locations. Simple explicit rules compare the returned invoice/contract fields and flag the known discrepancy.
3. Add analysis-run/job/outbox records and a Cloudflare Queues consumer. Publish after document finalization through a reliable outbox dispatcher, with a retry sweep for failed publication. Seeded earlier documents may be analyzed through an authorized request.
4. Expose queued, processing, completed and failed states. Use unique job/version identifiers, bounded retries and dead-letter/manual retry handling. Queue messages carry scoped identifiers rather than document contents.
5. Display findings next to the referenced fixture page/preview, labeled “Simulated analysis.” Require staff approval to turn a proposed message into a client-facing request; analysis cannot make a compliance decision.
6. Mark results for replaced versions as historical. A late v1 job must never overwrite v2 results or mutate a finalized case. Failed analysis leaves manual review usable and visibly identifies the missing assistance.

No model API, Python service, GPU, real OCR or model-quality claim is part of this phase.

## Deliverables

- A replaceable analysis interface with one fixture implementation.
- Working local and hosted queue/outbox flow, status UI and failure handling.
- Version-linked findings, fixture evidence and staff-editable draft requests.
- Tests for duplicate delivery, publication failure, stale-version results and role boundaries.

## Run and inspect

1. Submit the mismatched fixture and observe the job lifecycle until the expected discrepancy appears.
2. Open the referenced page and verify that its displayed value matches the fixture finding.
3. Deliver a job twice; there must be one logical result and no duplicate customer notification.
4. Simulate publication/consumer failure. Verify recovery or a visible failed state with an authorized retry path.
5. Upload v2 while v1 analysis is pending. Release the v1 result late and confirm that v2 remains current.
6. Complete manual review while analysis is unavailable. Confirm that any outgoing request is explicitly approved by staff and the case decision remains human-controlled.

Completion gate: simulated assistance is understandable, repeatable and honest about its limits; processing failures do not corrupt workflow state.

Next: [Phase 6](06-demo-experience.md). Overall scope: [POC plan](../cloudflare-poc-plan.md).
