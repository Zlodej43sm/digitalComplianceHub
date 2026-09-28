# Phase 7 acceptance record

Date: 2026-09-28

Release-candidate URL: `https://dch.cooptinyteam.org`

Release-candidate Worker version: `70b9ab3a-32ed-47a9-9b43-c9bde6d57247`

Verified backup: `backups/demo-2026-09-28T16-48-07-509Z` (local ignored artifact; D1 SHA-256 `e8f7d74738fe6122138a64906ad9e64869ed1d78b46ed3b57e7f9dc6bf9bada3`; three R2 objects verified)

## Automated evidence

- `pnpm verify`: passed with 18 tests; covers type checking, API permissions, tenant isolation, CSRF/session behavior, document restrictions, failed-finalization cleanup, workflow integrity, analysis recovery, dashboard scope, production build and local smoke.
- `pnpm release:check`: validates pinned tooling, additive migration numbering, EU private storage configuration, queue/DLQ wiring, recovery commands, fixtures and runbooks.
- `pnpm smoke:hosted ORIGIN`: validates security headers, signed-out denial, secure cookie flags, CSRF rejection, organization isolation, statistics, notification scope, direct file denial, role denial and the fixture allowlist.
- Recovery manifest tests reject unknown environments, production restore and invalid checksums.

## Recovery evidence required for a release

- [x] Backup directory recorded locally; approved external retention remains an operator decision.
- [x] D1 logical-export checksum verified. Native D1 export returned Cloudflare authentication error `10000`, so the tested logical fallback was used.
- [x] Every referenced R2 object's size and SHA-256 verified.
- [ ] Restore completed in disposable `dev` resources.
- [ ] Restored counts, decisions, document snapshots and permissions match the manifest.
- [x] Previous compatible Worker version `02183317-eb8f-4e77-ab1c-07e8ab761acf` deployed temporarily; health and persisted dashboard records loaded.
- [x] Earlier release version `b2a553c3-2aa7-45fb-bf88-51939f190db9` restored after rollback rehearsal and hosted security smoke passed.
- [x] Current release version `70b9ab3a-32ed-47a9-9b43-c9bde6d57247` deployed in public demo mode; hosted security smoke passed.

## Hosted acceptance for the public synthetic POC

- [x] Exact URL recorded.
- [x] Worker version ID recorded.
- [x] Public fictional-account picker matches local development behavior.
- [x] Signed-out API calls, CSRF failures and unrelated organization access are blocked by the application.
- [x] Hosted workflow/API smoke completed with synthetic fixtures.
- [x] Cedar statistics, notifications, histories and file URLs reveal no Northstar data in automated hosted checks.
- [x] Backup and Worker rollback rehearsal succeeded.
- [ ] Full presenter-led eight-minute walkthrough repeated after the latest deployment.
- [ ] Reset/reseed rehearsal completed against the demo dataset; reset remains intentionally operator-triggered.

## Current release boundary

The `dch.cooptinyteam.org` deployment is a public, synthetic-data POC with fictional identities. Cloudflare Access, MFA and invite-only release controls are deliberately skipped for Phases 1–7. This deployment must not contain real or sensitive data and must not be represented as production-ready authentication.

## Known POC limitations

- Synthetic PDF fixtures and deterministic extraction only; no customer documents, OCR/LLM inference or regulatory rule packs.
- No bank core, treasury, CRM, DMS, email or SMS integration.
- Demo sessions are short-lived; production identity lifecycle, support and onboarding remain outside this POC.
- Statistics are operational counts derived from D1, not a reporting warehouse.
- Restore targets must be empty disposable resources; the restore command intentionally refuses the demo environment.
