# Digital Compliance Hub

A synthetic-data document-review POC for corporate clients, relationship managers and compliance officers. Phase 2 implements identity, server-enforced roles and organization boundaries. Hosted deployment and MFA verification are pending Cloudflare access and configuration. Stored cases, documents, review actions and AI processing arrive in later phases.

## Start locally

Use Node.js 24 LTS (24.13.0+ within 24.x), pnpm 11.4.0 and RTK. No Cloudflare account or secrets are needed for local development.

```bash
rtk pnpm install --frozen-lockfile
rtk pnpm setup:local
rtk pnpm dev
```

Open [the local workspace](http://127.0.0.1:5178). Sign in using one of the fictional test accounts. This development-only login does not demonstrate MFA and is excluded from production bundles. The server loads roles and organization assignments from D1 on every request; URL paths and browser headers cannot select privileges.

| Account | Effective access |
| --- | --- |
| Northstar client | Northstar Demo Ltd; three read-only scenario outlines |
| Cedar client | Cedar Demo Ltd; empty workspace, no Northstar records |
| Alex Morgan | Manager assigned to Northstar only |
| Jamie Taylor | Compliance officer assigned to Northstar only |
| Demo administrator | Separate administration shell; no business-data access |

Use separate browser profiles for concurrent identities. Sign out before changing accounts. Local sessions last 30 minutes and use an opaque HttpOnly, SameSite=Strict cookie; only its hash is stored. Setup is repeatable and does not reset existing identities or data. Local state lives in ignored `.wrangler/state/`.

Routes are `/workspace/client/cases`, `/workspace/manager/cases`, and `/workspace/compliance/cases`. Each account can open only its own role layout. `/api/me` returns the effective session; `/api/workspace` returns authorized synthetic outlines. Uploads and decisions are not implemented. See the [demo contract](docs/poc-demo-contract.md).

## Verification

```bash
rtk pnpm verify
```

Runs strict TypeScript checking, JWT and authorization tests against an in-memory SQLite database using the real migration SQL, production compilation, bundle-boundary checks and HTTP checks on port 4179. Node's built-in SQLite is experimental and used only by the test adapter; deployed storage uses D1. Keep port 4179 free.

The built Worker requires a valid Cloudflare Access JWT and provisioned membership for pages, assets and protected APIs. Only `/api/health` exposes an unauthenticated constant health response at the Worker layer; hosted Access still covers the whole hostname. Running `rtk pnpm preview --port 4178` locally therefore returns 401 for protected pages. Use `pnpm dev` for local test sign-in.

Checks cover JWT signature/issuer/audience/expiry, unknown identities, cross-bank constraints, two client organizations, staff assignments, admin isolation, forged role headers, CSRF, expiry, disabled users and logout revocation. Production bundles exclude the local login adapter and browser-side case fixtures. [Verification record](docs/phase-2-verification.md).

## Cloudflare deployment

Follow the [Phase 2 hosted runbook](docs/cloudflare-environments.md). `wrangler.jsonc` is local-only. Real dev/demo configs are generated from ignored `cloudflare.local.json`; identifiers and hostname are required rather than fabricated.

```bash
rtk pnpm configure:cloudflare dev
rtk pnpm build:cloudflare dev
```

These commands need completed configuration and do not deploy. A hosted build validates the production boundary. Provision Access/MFA and isolated EU D1/private R2 resources before deploying the built configuration. Public workers.dev and preview aliases are disabled. Do not deploy the raw source entry point or a development server.

## Project layout

```text
src/web/                    React role workspaces and session handling
src/api/                    Hono API, JWT verification, authorization
src/domain/                 Domain types and status vocabulary
src/contracts/              Shared API contracts
src/adapters/cloudflare/    Worker and separately compiled local identity adapter
fixtures/                   Fictional outlines served only after authorization
migrations/                 Versioned D1 schema
seeds/                      Local fixtures and hosted identity seed template
tests/                      JWT, SQL, policy and configuration checks
scripts/                    Build guards, configuration and HTTP smoke checks
docs/poc-phases/             Bounded implementation briefs
```

Cloudflare Vite runs the API in the Workers runtime. Node.js runs development/build tooling; the Worker is not a Node.js server. Dependencies and the compatibility date are pinned. The Worker inspector is disabled to avoid local port conflicts.

GitHub Actions installs the lockfile and runs `pnpm verify` with read-only repository permissions. It does not deploy; no remote CI run is claimed by local verification. Secrets, local account configuration and generated files are ignored. Never put secrets in browser `VITE_*` variables. Keep pnpm's release-age and reviewed build-script policy intact.

Phase 2's hosted completion gate remains open. [Current phase](docs/poc-phases/02-identity-and-cloudflare.md) · [POC plan](docs/cloudflare-poc-plan.md) · [Next: cases and documents](docs/poc-phases/03-cases-and-documents.md).
