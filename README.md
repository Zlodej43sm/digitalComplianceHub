# Digital Compliance Hub

Synthetic-data document-review POC. The current phase uses the same fictional-account picker locally and on Cloudflare. No Cloudflare Access login or MFA is required; anyone with the URL can select a demo account.

## Run locally

```bash
rtk pnpm install --frozen-lockfile
rtk pnpm setup:local
rtk pnpm dev
```

Open http://127.0.0.1:5178. Requires Node.js 24 and pnpm 11.4.0.

Clients can create persistent drafts, upload only the supplied synthetic PDF fixtures, retain immutable versions, download authorized versions, and submit a package. Manager/compliance workflow decisions arrive in Phase 4. Cedar remains isolated from Northstar, and the demo administrator has no business-data access.

Fixture files are in `fixtures/documents/`. Only their exact approved bytes are accepted; arbitrary or renamed PDFs are rejected. Each case is limited to 10 versions and each file to 10 MB.

Server roles, organization scope, CSRF protections and expiring HttpOnly cookies remain in place. HTTPS cookies are Secure. Account selection is a demo convenience, not verified identity. Only synthetic content belongs in this POC.

## Verify and deploy

```bash
rtk pnpm verify
rtk pnpm build:cloudflare demo
```

Verification covers type checking, identity/policy tests, production compilation and HTTP smoke checks. The built preview now offers the same account picker as development. Apply local setup before exercising its account list.

Follow the [hosted deployment runbook](docs/cloudflare-environments.md) for database seeding, deployment and removing any existing Access policy on the POC hostname. Building the app does not change an edge policy or deploy it.

[Phase 2](docs/poc-phases/02-identity-and-cloudflare.md) · [POC plan](docs/cloudflare-poc-plan.md) · [Verification history](docs/phase-2-verification.md).
