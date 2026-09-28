# Digital Compliance Hub

A synthetic-data document-review POC for corporate clients, relationship managers and compliance officers. Phase 1 provides a local, read-only workspace foundation. No sign-in, persistent cases, uploads, decisions or AI processing are implemented yet.

## Start locally

Requirements: Node.js 24 LTS (24.13.0 or later in the 24.x line), pnpm 11.4.0, and RTK for this workspace's shell convention. If installed locally, `nvm use` selects Node 24. No Cloudflare account or secrets are needed.

```bash
rtk pnpm install --frozen-lockfile
rtk pnpm dev
```

Open [the local workspace](http://127.0.0.1:5178). The dev server binds to loopback. If that port is occupied, use `rtk pnpm dev --port 5180` and open that port instead. The workspace selector navigates between fictional role layouts; it is not authentication and cannot grant access to any real records.

| Preview        | Local route                         |
| -------------- | ----------------------------------- |
| Client         | `/preview/client/cases`             |
| Manager        | `/preview/manager/cases`            |
| Compliance     | `/preview/compliance/cases`         |
| Case outline   | `/preview/client/cases/FX-2026-001` |
| Review process | `/preview/client/workflow`          |
| Demo guide     | `/preview/client/guide`             |
| Health API     | `/api/health`                       |

Search the three example cases, open their outlines, change the local workspace, and refresh a nested route. All scenario records are static and fictional. The scenario contract is in [docs/poc-demo-contract.md](docs/poc-demo-contract.md).

## Verify and inspect the production build

```bash
rtk pnpm verify
rtk pnpm preview
```

`verify` runs strict TypeScript checking, the production build and HTTP smoke checks against the built Worker on loopback port 4179. Keep that port free. `preview` serves the built application on [port 4173](http://127.0.0.1:4173).

The production build deliberately shows a setup screen. The local preview module, example-case screens and workspace selector are excluded at build time. This is a temporary Phase 1 boundary, not a replacement for the Access authentication and resource authorization to be added in Phase 2.

The health endpoint returns only `status` and a constant service name. All other API paths, including case requests, return JSON 404. No case mutation or upload endpoint exists.

## Project layout

```text
src/web/                    React layouts and styles
src/api/                    Portable Hono API
src/domain/                 Planned domain types and status vocabulary
src/contracts/              Shared API contracts
src/adapters/cloudflare/    Workers entry point
fixtures/                   Fictional presentation scenarios
migrations/                 Reserved for Phase 2 D1 migrations
tests/                      Verification scope and later feature tests
scripts/                    Production HTTP smoke runner
docs/poc-phases/             Bounded implementation briefs
```

The app uses the Cloudflare Vite plugin to execute the API in the local Workers runtime. Node.js runs development/build tooling; the Worker is not a Node.js server. The approach follows Cloudflare's [React/Vite guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/).

## Configuration and CI

- `.env.example` and `.dev.vars.example` document the empty Phase 1 configuration. No copy step is required to start. Browser `VITE_*` values must never contain secrets.
- `.env*`, `.dev.vars*`, local credentials/configuration, editor files and generated output are ignored. Example files remain tracked.
- `wrangler.jsonc` reserves distinct local/dev/demo Worker names. Public workers.dev and preview URLs are disabled; no domains or D1/R2 bindings are provisioned. See [environment reservations](docs/cloudflare-environments.md).
- The Worker inspector is disabled by default so local development and verification do not compete for the common debugger port.
- pnpm's build-script policy allows only the pinned esbuild/workerd install scripts required by the tooling. Keep this list reviewed alongside dependency updates.
- GitHub Actions installs the lockfile and runs `pnpm verify` on pushes/PRs, with read-only repository permissions. It does not deploy or require Cloudflare credentials. The workflow can run after a GitHub repository is connected.
- Use `rtk pnpm exec prettier --write src fixtures scripts vite.config.ts` to format source changes.

There is intentionally no deploy command in Phase 1. A production build alone does not make this application ready to accept banking documents.

## Next phase

Continue with [Phase 2 — identity and private Cloudflare environment](docs/poc-phases/02-identity-and-cloudflare.md). The full [POC phase plan](docs/cloudflare-poc-plan.md) defines the subsequent document, review, analysis and release work.

See [Phase 1 verification](docs/phase-1-verification.md) for the completed checks and current limitations.
