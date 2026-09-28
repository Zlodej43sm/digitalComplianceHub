# POC Phase 2 — Demo sessions and organization permissions

Scope amended by user: Cloudflare hosting must behave like local `pnpm dev`, with a fictional-account picker and no Cloudflare Access protection.

Implemented: D1 identities, two organizations, server-derived roles, explicit staff assignments, separate demo admin, 30-minute sessions, logout, CSRF and no-store responses. Hosted HTTPS uses Secure cookies. Static pages and demo account selection are public. Selecting another role requires signing out and choosing another fictional identity.

Cloudflare Access/MFA and real identity verification are deferred. Anyone with the URL can choose any demo role; organization isolation applies within a selected session, not between visitors who can choose another account.

Completion: local tests/build pass and hosted account-picker walkthrough passes after deployment and removal of any pre-existing Access protection. See [deployment instructions](../cloudflare-environments.md). No live edge-policy change is implied by repository edits.

Next: [Phase 3 — cases and documents](03-cases-and-documents.md).
