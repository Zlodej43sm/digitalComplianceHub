# POC Phase 7 — Verification, recovery and demo release

Status: implemented for the public synthetic POC. Cloudflare Access, MFA and protected-host acceptance were explicitly excluded from this phase. Depends on: Phases 1–6.

Goal: deliver a reproducible Cloudflare demo using synthetic data that can be presented, reset and recovered.

## Implementation scope

1. Run and fix the agreed permission, workflow, upload and browser checks. Verify direct API requests, file endpoints, notifications, statistics and client-visible histories, not just hidden UI controls.
2. Verify session expiry, CSRF protection, no-store headers, CSP, request/upload limits and secrets. Inspect operational logs for tokens, file content and unnecessary personal information. Cloudflare Access and MFA are deferred.
3. Deliver export/restore scripts covering D1 metadata and the R2 object manifest/bytes, plus environment-guarded demo reset. Before reset, export the current demo. Restore into a disposable target and verify version checksums and permissions.
4. Document backward-compatible migrations and Worker rollback. Rehearse one rollback; distinguish code rollback from database recovery. Restore jobs/outbox in a controlled state so replay does not duplicate decisions or notifications.
5. Deploy the versioned release to the public synthetic-demo environment using scoped credentials. Seed synthetic fixtures and verify the full hosted journey. Keep dev/demo storage and secrets separate.
6. Produce the runbook, fixture pack, test evidence, access instructions, known limitations, expected usage costs and teardown/expiry procedure. Record the actual deployment identifier and URL.

For a reduced Phase 4 release, exclude AI/statistics features and their tests explicitly. Keep identity, organization isolation, comment visibility, document restrictions, action audit, workflow integrity and recovery checks mandatory. Present the release as a manual-workflow demo.

## Deliverables

- A Cloudflare synthetic-demo URL and a recorded release version.
- Working verification, hosted smoke, export, restore and reset commands from the main plan.
- Reproducible instructions for clean local startup, deployment and demo presentation.
- Completed acceptance record listing checks, outcomes and remaining limitations.

## Run and inspect

1. From a clean checkout, follow the documented local setup and run verification/browser checks.
2. On the hosted demo, complete the walkthrough using the fictional account picker. Confirm signed-out API requests and unrelated organizations cannot access records/files.
3. Attempt forbidden approvals, conflicting final decisions, internal-note access and unknown uploads. Confirm all are blocked appropriately.
4. Export the seeded demo, reset it and restore into the disposable target. Compare counts, document checksums, states, decision snapshots and permissions.
5. Rehearse compatible code rollback and confirm the existing records still load correctly.
6. Have a second person follow the runbook without hidden setup steps.

Completion gate: all checks for the public synthetic scope pass; the hosted walkthrough succeeds; reset/recovery is repeatable; and the URL, verification record and limitations are documented.

This completes the POC. Real customer documents, live OCR/LLMs and bank integrations remain separately scoped follow-up work. Overall scope: [POC plan](../cloudflare-poc-plan.md).

Implemented artifacts: hosted security smoke, versioned D1/R2 backup manifests, guarded disposable restore, backup-first reset, release preflight, public fictional-account Worker entry point, [release runbook](../release-runbook.md) and [acceptance record](../release-acceptance.md). Protected Access mode remains optional future work and is not part of Phase 7 acceptance.
