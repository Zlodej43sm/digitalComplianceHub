# D1 migrations

`0001_identity.sql` defines bank/organization boundaries, unique verified identities, one effective membership per identity, explicit staff assignments and development session storage. SQL uses composite foreign keys and parameterized application queries.

Run `rtk pnpm setup:local` for local migrations and synthetic seeds. The hosted procedure is in [the runbook](../docs/cloudflare-environments.md). Never apply `seeds/local.sql` to a hosted database. The deployed Worker never reads local-session authentication records.
