# Cloudflare POC deployment — demo account picker

For the current phase, hosted and local builds use the same fictional account picker. Cloudflare Access, IdP login and MFA are not required. Anyone with the demo URL can select any of the five accounts. This mode is for synthetic demonstrations only; real bank authentication remains deferred.

The code retains an optional `authMode: "access"` adapter for a future phase, but protected-host development and acceptance are excluded from Phases 1–7. The fictional picker is the active deployment mode.

The account picker creates an opaque 30-minute session. Cookies are HttpOnly, SameSite=Strict and Secure on HTTPS. Server-side organization, staff-assignment and administrator restrictions remain enforced within the selected session. Same-origin mutation checks remain enabled. Page assets and the account list are public.

## Configuration

`cloudflare.hosted.json` contains the shared account, database and hostname identifiers. An ignored `cloudflare.local.json`, if present, overrides it. Only accountId, environment hostname and databaseId are required; Access issuer/audience are no longer used. The hosted session adapter accepts the configured HTTPS origin. Local loopback HTTP works for development and preview.

```bash
rtk pnpm configure:cloudflare demo
rtk pnpm build:cloudflare demo
rtk pnpm deploy:cloudflare demo
```

The generated configuration retains private EU R2 bindings and disables alternate workers.dev/preview aliases. No Access application is created by these scripts.

## Database and deployment

Authenticate with `rtk pnpm exec wrangler login` if needed. For a new demo database, apply migrations and the same synthetic identities used locally:

```bash
rtk pnpm exec wrangler d1 migrations apply dch-demo-metadata --remote --config wrangler.demo.generated.json
rtk pnpm exec wrangler d1 execute dch-demo-metadata --remote --config wrangler.demo.generated.json --file seeds/hosted-demo.sql
rtk pnpm deploy:cloudflare demo
```

Deploy through the generated source configuration so Wrangler registers the Worker's `queue` and `scheduled` handlers. The Vite output remains the local production preview artifact.

The hosted seed uses separate demo-prefixed identity IDs and INSERT OR IGNORE, preserving any existing Access-backed users. Never apply this seed to a real-data database.

If the hostname already has a Cloudflare Access application, remove protection for this exact POC hostname in Zero Trust. A Worker deployment alone cannot remove an existing edge Access policy. Preserve unrelated applications and policies.

For a new environment, create `dch-ENV-metadata` with D1 `--jurisdiction eu` and `dch-ENV-documents` with R2 `--jurisdiction eu`. Keep R2 public endpoints disabled. The existing configured demo resources need not be recreated.

## Acceptance checks

1. Open the hostname signed out: the fictional account picker appears without Cloudflare login.
2. Select each account. Northstar, manager and compliance see the canonical seven-case dataset across all workflow states; Cedar sees none; admin has a separate shell.
3. Try another organization's API query: denied. No-session business API requests return 401.
4. Sign out and reuse the old session cookie: denied. Verify Secure, HttpOnly and SameSite on hosted cookies.
5. Cross-origin login/logout requests fail; static assets load without a session.

Use the same walkthrough with `rtk pnpm setup:local` and `rtk pnpm dev`. Real identity verification/MFA must be designed before any real-data pilot; the retained Access verifier is not the active POC entry point.
