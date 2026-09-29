# Phase 7 release and recovery runbook

This runbook releases only synthetic demonstration data. Do not upload customer, bank, payment or identity documents.

## Current POC access model

The current release intentionally uses `authMode: "demo"`, the same fictional-account picker used by local `pnpm dev`. It contains synthetic fixtures only. Cloudflare Access, MFA, an external identity provider and invite provisioning are excluded from Phases 1–7 by project decision.

Keep this URL limited to POC demonstrations and never upload real customer, bank, payment or identity data. The application still enforces server-side roles, organization scope, secure session cookies, same-origin mutation checks and CSRF headers. The picker is a presentation identity mechanism, not production authentication.

If protected identity is added in a later phase, the environment can use:

```json
{
  "authMode": "access",
  "accessIssuer": "https://TENANT.cloudflareaccess.com",
  "accessAudience": "64-character application audience tag"
}
```

That optional protected deployment requires a separately approved identity design and acceptance run; it is not a release prerequisite for this POC.

## Clean local verification

```bash
rtk corepack enable
rtk pnpm install --frozen-lockfile
rtk pnpm setup:local
rtk pnpm verify
rtk pnpm dev
rtk pnpm seed:scenarios http://127.0.0.1:5178
```

Follow [the eight-minute walkthrough](demo-walkthrough.md). Confirm Cedar cannot see Northstar counts, notifications, cases, messages or files.

## Backup and deployment

Authenticate Wrangler with a scoped token that can deploy the Worker and access only the selected D1, R2 and Queue resources.

```bash
rtk pnpm release:check
rtk pnpm configure:cloudflare demo
rtk pnpm backup:cloudflare demo
rtk pnpm exec wrangler d1 migrations apply dch-demo-metadata --remote --config wrangler.demo.generated.json
rtk pnpm build:cloudflare demo
rtk pnpm deploy:cloudflare demo
rtk pnpm smoke:hosted https://YOUR-DEMO-HOST
```

Record the deployment version printed by Wrangler. Apply migrations before code only when the migration is backward-compatible with the currently deployed Worker. All repository migrations are additive; destructive schema changes require a separate maintenance and recovery plan.

## Backup format

`backup:cloudflare` exports D1 SQL, downloads every R2 object referenced by `document_versions`, validates its stored SHA-256 and size, and writes a versioned `manifest.json`. Backup directories are ignored by Git and may contain sensitive data if this tooling is reused beyond the synthetic POC. Store them encrypted with restricted access and a documented expiry.

## Reset

The unified reset command returns the hosted demo to the canonical seven-case dataset. It creates and verifies a backup first, clears D1/R2, restores fictional identities, seeds through the hosted API, and runs hosted smoke. The environment name and database confirmation must match exactly:

```bash
rtk pnpm reset:default demo --confirm=dch-demo-metadata
```

Use `rtk pnpm reset:default demo --confirm=dch-demo-metadata --dry-run` to validate the command without changing data. The lower-level `reset:cloudflare` command only clears hosted business data and is retained for recovery operations.

For local D1/R2, keep `pnpm dev` running and use:

```bash
rtk pnpm reset:default local
```

## Disposable restore rehearsal

Restore is deliberately blocked for `demo`; use the separately configured `dev` D1/R2 resources, which must be empty:

```bash
rtk pnpm restore:cloudflare dev backups/demo-TIMESTAMP --confirm=dch-dev-metadata
rtk pnpm smoke:hosted https://YOUR-DEV-HOST
```

Compare manifest counts, R2 checksums, case states, decision snapshots and tenant permissions. A database restore is recovery, not code rollback.

## Worker rollback

List versions and record the active and previous IDs:

```bash
rtk pnpm exec wrangler versions list --config wrangler.demo.generated.json
rtk pnpm exec wrangler rollback PREVIOUS_VERSION --config wrangler.demo.generated.json --message "Phase 7 rollback rehearsal" --yes
rtk pnpm smoke:hosted https://YOUR-DEMO-HOST
```

Rollback only to code compatible with every applied migration. Queue messages and outbox rows remain durable. `analysis_jobs.version_id` and `analysis_outbox.job_id` are unique, processing is idempotent, and recorded review decisions are unique per case; do not manually duplicate pending rows during recovery.

## Operational review and teardown

- Keep Worker observability disabled for this POC unless log redaction and retention are approved. Never log session cookies, Access assertions, document bytes or extracted content.
- Review D1 row metrics, Queue retries/DLQ and R2 storage after each demonstration.
- At the agreed expiry, take the final backup if retention is authorized, delete the Worker route, queues, R2 bucket and D1 database, and revoke the deployment token.
- A custom-domain rollback changes Worker code only. DNS, Access policy, D1, R2 and Queues require separate teardown actions.

## Expected low-volume POC cost

At demonstration scale, usage should normally remain inside Cloudflare's included allowances, but billing depends on the account plan and total account usage. As of 28 September 2026, official pricing lists Workers Free at 100,000 requests/day; D1 Free at 5 million rows read/day, 100,000 rows written/day and 5 GB total storage; Queues Free at 10,000 operations/day; and R2 Standard with 10 GB-month, 1 million Class A and 10 million Class B operations/month included. Workers Paid starts at $5/month. Verify current pricing before inviting customers: [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [Queues](https://developers.cloudflare.com/queues/platform/pricing/), [R2](https://developers.cloudflare.com/r2/pricing/).
