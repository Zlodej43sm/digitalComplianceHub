# Verification

`rtk pnpm verify` runs TypeScript, Node test suites, production build guards and built-Worker HTTP checks. Identity tests execute real migration/seed SQL through Node SQLite, not a mocked SQL parser. This adapter is not a claim of D1 runtime equivalence; a separate local D1 runtime walkthrough is recorded in [Phase 2 verification](../docs/phase-2-verification.md).

Hosted MFA, identity-provider integration and browser journeys require the manual completion gate in [the hosted runbook](../docs/cloudflare-environments.md). No end-to-end browser suite is implemented yet.
