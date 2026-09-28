# Verification

Phase 1 uses `pnpm verify`: TypeScript checking, production build, and HTTP smoke checks against the built Worker and static assets. The smoke runner lives in `scripts/smoke.mjs`.

No business authorization, persistence or workflow is implemented yet. Add policy tests and browser journeys with those features in Phases 2–4 rather than tests that claim they work now.
