# POC Phase 7 — Verification, recovery and demo release

Status: not started. Depends on: Phases 1–6 for the full POC, or Phases 1–4 for an explicitly reduced manual-workflow demo. Estimate: 1.5–3 engineering days.

Goal: deliver a reproducible, invite-only Cloudflare demo that can be presented, reset and recovered.

## Implementation scope

1. Run and fix the agreed permission, workflow, upload and browser checks. Verify direct API requests, file endpoints, notifications, statistics and client-visible histories, not just hidden UI controls.
2. Review Access configuration and alternate deployment routes, MFA, session expiry, CSRF protection, no-store headers, CSP, request/upload limits and secrets. Inspect operational logs for tokens, file content and unnecessary personal information.
3. Deliver export/restore scripts covering D1 metadata and the R2 object manifest/bytes, plus environment-guarded demo reset. Before reset, export the current demo. Restore into a disposable target and verify version checksums and permissions.
4. Document backward-compatible migrations and Worker rollback. Rehearse one rollback; distinguish code rollback from database recovery. Restore jobs/outbox in a controlled state so replay does not duplicate decisions or notifications.
5. Deploy the versioned release to the protected customer-demo environment using scoped credentials. Seed synthetic fixtures and verify the full hosted journey. Keep dev/demo storage and secrets separate.
6. Produce the runbook, fixture pack, test evidence, access instructions, known limitations, expected usage costs and teardown/expiry procedure. Record the actual deployment identifier and URL.

For a reduced Phase 4 release, exclude AI/statistics features and their tests explicitly. Keep identity, organization isolation, comment visibility, document restrictions, action audit, workflow integrity and recovery checks mandatory. Present the release as a manual-workflow demo.

## Deliverables

- A protected Cloudflare URL and a recorded release version.
- Working verification, hosted smoke, export, restore and reset commands from the main plan.
- Reproducible instructions for clean local startup, deployment, invite setup and demo presentation.
- Completed acceptance record listing checks, outcomes and remaining limitations.

## Run and inspect

1. From a clean checkout, follow the documented local setup and run verification/browser checks.
2. On the hosted demo, complete the walkthrough using real permitted test identities. Confirm signed-out users and unrelated organizations cannot access its records/files.
3. Attempt forbidden approvals, conflicting final decisions, internal-note access and unknown uploads. Confirm all are blocked appropriately.
4. Export the seeded demo, reset it and restore into the disposable target. Compare counts, document checksums, states, decision snapshots and permissions.
5. Rehearse compatible code rollback and confirm the existing records still load correctly.
6. Have a second person follow the runbook without hidden setup steps.

Completion gate: all required checks pass; the hosted walkthrough succeeds; reset/recovery is repeatable; the user receives the URL, access setup, verification record and limitations. Only then expand the allowlist to invited prospective customers within the authorized release scope.

This completes the POC. Real customer documents, live OCR/LLMs and bank integrations remain separately scoped follow-up work. Overall scope: [POC plan](../cloudflare-poc-plan.md).
