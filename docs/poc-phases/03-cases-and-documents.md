# POC Phase 3 — Client cases and private documents

Status: implemented locally; hosted migration/deployment and browser walkthrough pending. Depends on: Phase 2.

Goal: a client can create, populate and submit a persistent case using the supplied synthetic files.

## Implementation scope

1. Add case, document, document-version and audit schemas. Include bank/organization ownership, assigned staff, timestamps and case revision. Keep SQL inside repositories and validate API inputs at runtime.
2. Build the client case list, creation form, detail page, document list and submission action. A minimal staff detail view may reuse these components with staff permissions.
3. Generate the synthetic fixture pack, including invoice v1/v2, contract and missing/mismatched combinations. Record approved content hashes on the server. Accept only those exact bytes, allowed formats, files up to 10 MB and at most 10 stored file versions per case.
4. Implement staged R2 upload, server-calculated checksum, metadata finalization and orphan cleanup. Generate object keys on the server. Preserve each document version under a new key and authorize every download.
5. Allow clients to modify Draft or AwaitingClient cases only. Initial submission requires required case fields and at least one permitted document; the manager handles package completeness in Phase 4. Block mutation of submitted/finalized content outside the defined commands.
6. Commit state changes and their audit records atomically. Add revision checks and idempotency for submit/finalization. Record successful file serving and failed access attempts appropriately; a served download is not proof a person read the file.
7. Provide user-visible validation and upload errors, no-store file responses and safe filenames. Do not parse or preview unknown files.

## Deliverables

- A persistent client workspace with create, upload, version history, authorized download and submit.
- Downloadable synthetic fixture pack and local/demo seed support for this phase.
- Migration files, document-storage adapter and initial audit timeline.
- Tests for ownership, file limits, finalization failure, repeat submission and revision conflicts.

## Run and inspect

1. Create a case as organization A, upload its fixture invoice and contract, then refresh/restart locally. Data must remain available.
2. In a draft, upload invoice v2 and verify that v1 remains unchanged and downloadable to permitted users.
3. Submit once, repeat the request and try a conflicting revision. Only one valid transition should appear in the audit timeline.
4. As organization B, request A's case, list entries and document-version endpoint directly. None may expose A's data.
5. Try an unknown PDF, a renamed forbidden file, an oversized file and an excess version. Each must fail without creating a usable document entry.
6. Interrupt upload/finalization. Reconciliation must remove or clearly identify incomplete objects rather than leaving a valid-looking broken document.

Completion gate: a client can submit a durable, private package, and the negative access/upload checks pass. Manager review is intentionally added next.

Next: [Phase 4](04-review-workflow.md). Overall scope: [POC plan](../cloudflare-poc-plan.md).
