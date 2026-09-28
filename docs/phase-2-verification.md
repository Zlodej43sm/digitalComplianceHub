# Hosted POC update

Deployed Worker version `6482960c-229c-42e9-a906-9ff8a29c8d2a` to `dch.cooptinyteam.org` with the demo account picker. Seeded five separate `demo-*` identities, preserving the existing Access-backed admin. All eight test groups passed. Compiled demo-session HTTP checks are part of `pnpm verify`.

Remaining external blocker: the hostname still redirects to Cloudflare Access. The authenticated zone-level Access applications API returned HTTP 403 (authentication error). No edge policy was modified. The account-level applications listing was empty. Remove this hostname's Access protection using a credential with the appropriate Access permissions or the Zero Trust dashboard; then repeat the hosted walkthrough.

# Current scope change

Hosted builds now include the fictional-account picker, as requested. The previous Access-only build boundary below is historical and superseded. HTTPS session tests cover Secure cookies, canonical host, role isolation and CSRF. Live deployment/edge-policy changes are separate from these local code checks.

# Phase 2 verification record

28 September 2026. Local implementation verified; hosted completion gate open.

## Implemented

- Versioned D1 identity schema with composite bank/organization constraints, unique issuer/subject identities, restricted role membership and explicit staff assignments.
- Cloudflare Access JWT verification using pinned `jose`, trusted issuer JWKS, RS256, audience, subject, expiry, issue time and a maximum assertion age of one hour.
- Default-deny server policies, current-user endpoint, scoped synthetic examples and a separate admin endpoint/shell.
- Loopback-only test identities with opaque expiring HttpOnly cookies, hashed stored tokens and logout revocation. The adapter is removed by the production build.
- Same-origin JSON mutations with required Origin and custom CSRF header; no-store responses; session-expiry handling.
- Hosted configuration/build commands that require real identifiers, protect all assets through the Worker and disable public Worker/preview aliases. Private EU R2 binding prepared; no file operations yet.

## Executed successfully

- `rtk pnpm setup:local`: actual Wrangler D1 migrations and five local identities seeded successfully.
- `rtk pnpm verify`: TypeScript, six test groups, production build, bundle boundary and built-Worker HTTP smoke checks passed.
- Real local Workers/D1 HTTP walkthrough: Northstar client, manager and compliance each received three outlines; Cedar received zero; admin business access returned 403. Every account's logout invalidated its cookie on the next current-user request.
- Development HTML and local account listing returned 200; unauthenticated current-user requests returned 401.

The test groups cover invalid/expired/wrong issuer/wrong audience assertions, cross-bank foreign keys, organization scoping, role/header tampering, staff assignment revocation, unknown/disabled users, CSRF, logout, expiry, local-cookie rejection by hosted authentication, and generated environment validation. Node SQLite executes actual migration SQL; it is a test-only adapter. The HTTP walkthrough additionally exercised the actual D1 emulator.

## Not verified / remaining

- Cloudflare account authentication was expired (`wrangler whoami` could not refresh it). No cloud resources, hostname or Access policy were created or deployed.
- Real identity-provider login, MFA, hosted membership mapping, remote D1/R2 jurisdiction/private settings and alternate-route denial remain unverified. Follow [the hosted runbook](cloudflare-environments.md).
- Automated browser inspection was blocked by browser security policy when opening the local page. No visual/browser-flow pass is claimed. Complete the documented local browser walkthrough manually.
- No remote CI execution is claimed. No uploads, persisted case workflows, approvals, analysis, immutable audit or production banking-data support is implemented in this phase.

Phase 2 is not complete until its hosted acceptance gate passes. The next feature scope remains Phase 3: cases and documents.
