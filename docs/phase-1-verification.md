# Phase 1 — implementation and verification

Completed locally on 28 September 2026. No deployment, Cloudflare provisioning, account invitation or real banking data processing was performed.

## Delivered

- Initialized the local Git repository; no remote, commit or publication was created.
- React/TypeScript/Vite interface with local client, manager and compliance layouts; searchable fictional cases, case outlines, review-process page and demo guide.
- Hono health API running in the local Cloudflare Workers runtime, with constant JSON fields, no-store responses, defensive headers and JSON 404s for unimplemented routes.
- Planned domain types, a role/action matrix, case-state contract and three defined fixture scenarios, including corrected invoice v2.
- Locked dependencies, narrowly allowed tooling build scripts, ignored secrets, strict type checking, build/smoke verification and a GitHub Actions workflow.
- Separate dev/demo Worker name reservations, no actual D1/R2 bindings or fake resource identifiers.
- Production setup screen; compile-time exclusion of the local role-preview module.

## Verification evidence

| Check | Result |
| --- | --- |
| `rtk pnpm install --frozen-lockfile` | Passed with pnpm 11.4.0 / Node 24.13.0. |
| `rtk pnpm verify` | Passed: TypeScript, Worker/client production build and built-runtime HTTP smoke checks. |
| Health endpoint | HTTP 200; only `{ status: "ok", service: "digital-compliance-hub" }`; Cache-Control no-store. |
| Unknown API routes / health POST | JSON 404; no case/upload/mutation endpoints exposed. |
| Nested production SPA routes | Serve the built application, not Vite source files. |
| Local client/manager/compliance navigation | Verified in the browser; workspace heading/profile/navigation update with selection. |
| Search and case outline | Search for FX-2026-003 filters to its single case; its detail describes invoice v1/v2 mismatch and correction. |
| Direct-link refresh | Reloading the nested case detail preserves the intended screen. |
| Review-process page | Verified the client correction path explicitly returns to manager review. |
| Desktop layout | Visually inspected in the browser. |
| Production preview at a role URL | Browser displays setup screen, without workspace controls. Compiled client JavaScript excludes the selector text and fixture IDs. |
| `rtk pnpm audit --prod` | No known vulnerabilities reported at verification time; not a penetration test or a guarantee. |

The machine's existing port 5173 was occupied. This project uses loopback port 5178 by default. The inspector is disabled to avoid conflicts with other development sessions. Dependency versions were adjusted to satisfy pnpm's default minimum release age; that protection was not disabled.

## Run and limitations

Run `rtk pnpm dev` and open `http://127.0.0.1:5178`. Stop with Ctrl+C. `rtk pnpm preview` serves the production setup screen on port 4173 after a build.

Phase 1 is read-only and local. Authentication, authorization on real resources, persisted cases, document files/uploads, compliance decisions and analysis are not implemented. Do not treat illustrative case states as executed actions. The browser check covers the foundation, not the future end-to-end banking workflow. CI configuration is present; no remote CI run has occurred because no GitHub remote was connected.

Next implementation scope: [Phase 2](poc-phases/02-identity-and-cloudflare.md).
