# Verification

`rtk pnpm verify` runs TypeScript, Node test suites, production build guards and built-Worker HTTP checks. Identity tests execute real migration/seed SQL through Node SQLite, not a mocked SQL parser. This adapter is not a claim of D1 runtime equivalence; a separate local D1 runtime walkthrough is recorded in [Phase 2 verification](../docs/phase-2-verification.md).

`rtk pnpm smoke:hosted ORIGIN` exercises hosted headers, cookies, CSRF, tenant scope, statistics, notifications, direct file authorization, role denial and fixture restrictions. MFA, Access allowlists and the visual walkthrough remain manual completion gates in the [release runbook](../docs/release-runbook.md).
