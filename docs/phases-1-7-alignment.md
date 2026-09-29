# POC Phases 1–7 alignment record

Updated: 28 September 2026

Scope: public Cloudflare POC using synthetic documents and fictional identities. Cloudflare Access, MFA, external IdP provisioning and protected-host acceptance are excluded. The same account picker is used by local `pnpm dev` and the hosted demo.

| Phase | Implemented evidence | Verification |
| --- | --- | --- |
| 1 — Foundation | React/TypeScript/Vite UI, Hono API, strict TypeScript, migrations, fixtures, environment separation and CI | `pnpm verify`; production build and local health smoke |
| 2 — Sessions and permissions | Signed 30-minute sessions, secure hosted cookie, logout, CSRF/origin checks, server-derived roles, staff assignments and organization scope | Identity tests plus hosted signed-out, CSRF, role and tenant-denial checks |
| 3 — Cases and documents | Persistent cases, PDF name/kind validation, 10 MB/10-version limits, private R2 objects, version history, cleanup after finalization failure and authorized downloads | Case/document tests cover isolation, submission guard, name/kind and media-type rejection, oversize files, version limit and failed-finalization cleanup |
| 4 — Review workflow | Manager checklist, assigned queues, correction loop, internal/client messages, compliance decision, document snapshots, notifications and revision conflicts | Full correction workflow test covers privacy, assignments, stale revisions and conflicting final decisions |
| 5 — Simulated analysis | D1 job/outbox records, Queue consumer/DLQ, deterministic fixture findings, retries, idempotency and stale-version handling | Analysis tests cover duplicate delivery, publication recovery, stale results and authorization; hosted Queue bindings pass preflight |
| 6 — Demo experience | Role dashboards, status/turnaround statistics, notification links, English/Ukrainian catalogs, scenario seeder and walkthrough | Dashboard scope tests, production UI build and hosted statistics/notification isolation smoke |
| 7 — Release/recovery | Release preflight, hosted smoke, versioned D1/R2 backup, guarded restore/reset, rollback procedure, release runbook and acceptance record | Verified backup with three R2 objects; Worker rollback rehearsal; hosted smoke against recorded release URL/version |

## Commands

```bash
rtk pnpm setup:local
rtk pnpm dev
rtk pnpm release:check
rtk pnpm smoke:hosted https://dch.cooptinyteam.org
rtk pnpm backup:cloudflare demo
```

Deployment and destructive operations require the named environment and exact confirmation values documented in the [release runbook](release-runbook.md).

## Open manual acceptance items

- Repeat the presenter-led eight-minute browser walkthrough after the latest deployment.
- Run reset/reseed only when the operator intentionally authorizes replacement of the current synthetic demo dataset.

These manual items do not hide an implementation gap. They verify presentation readiness and an intentionally destructive operational action. See the [acceptance record](release-acceptance.md) for current evidence and limits.
