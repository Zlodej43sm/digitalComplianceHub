# Digital Compliance Hub

Synthetic-data document-review POC. The current phase uses the same fictional-account picker locally and on Cloudflare. No Cloudflare Access login or MFA is required; anyone with the URL can select a demo account.

For the complete current architecture, workflow, API, database, edge cases, canonical demo data, operational commands, security boundaries, and known limitations, read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).

## Run locally

```bash
rtk pnpm install --frozen-lockfile
rtk pnpm setup:local
rtk pnpm dev
```

Open http://127.0.0.1:5178. Requires Node.js 24 and pnpm 11.4.0.

Clients can create persistent drafts, upload conventionally named PDF documents, retain immutable versions, download authorized versions, and submit a package. Manager and compliance workflows are implemented. Cedar remains isolated from Northstar, and the demo administrator has no business-data access.

Sample fixture files are in `fixtures/documents/`. Uploads currently accept any PDF content as long as the file name matches the expected pattern for the selected kind (e.g. `contract.pdf`, `invoice-v1.pdf`); a mismatched name, non-PDF type, unsupported kind, or oversized file is rejected with a specific reason. Each case is limited to 10 versions and each file to 10 MiB.

Phase 4 connects the manager and compliance workspaces to persisted cases. Managers complete the five-item checklist, request corrections or forward a version snapshot. Compliance can keep internal notes, publish client-visible requests, and approve or reject with a required reason. Corrected uploads invalidate earlier checklist confirmations, and final decisions preserve the reviewed document snapshot.

Phase 5 adds deterministic, clearly labeled simulated analysis. Recognized synthetic fixture content returns predefined extracted fields; any other PDF completes analysis using the case's declared amount and currency as a simulated placeholder, flagged as such in the summary. Staff can inspect extracted fields, page-linked findings, current/historical version status, failures and retries. Suggested correction text becomes client-visible only after an explicit compliance action; analysis never records a decision.

Server roles, organization scope, CSRF protections and expiring HttpOnly cookies remain in place. HTTPS cookies are Secure. Account selection is a demo convenience, not verified identity. Only synthetic content belongs in this POC.

## Verify and deploy

```bash
rtk pnpm verify
rtk pnpm build:cloudflare demo
```

Verification covers type checking, identity/policy tests, production compilation and HTTP smoke checks. The built preview now offers the same account picker as development. Apply local setup before exercising its account list.

Follow the [hosted deployment runbook](docs/cloudflare-environments.md) for database seeding, deployment and removing any existing Access policy on the POC hostname. Building the app does not change an edge policy or deploy it.

## Reset canonical demo data

Keep `pnpm dev` running, then reset local D1/R2 and recreate the seven workflow-status cases:

```bash
rtk pnpm reset:default local
```

Reset the hosted synthetic demo only with the exact environment confirmation. This takes and verifies a backup before clearing D1/R2, restores fictional identities, seeds the same seven cases, and runs hosted smoke:

```bash
rtk pnpm reset:default demo --confirm=dch-demo-metadata
```

Preview either operation without changing data by appending `--dry-run`.

[Phase 2](docs/poc-phases/02-identity-and-cloudflare.md) · [POC plan](docs/cloudflare-poc-plan.md) · [Verification history](docs/phase-2-verification.md).
