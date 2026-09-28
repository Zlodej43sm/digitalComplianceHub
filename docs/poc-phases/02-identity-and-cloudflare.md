# POC Phase 2 — Identity, permissions and private Cloudflare environment

Status: local implementation and automated checks complete; hosted deployment/MFA gate pending. Depends on: Phase 1.

Implementation: [local setup](../../README.md), [hosted runbook](../cloudflare-environments.md), [verification and limitations](../phase-2-verification.md).

Goal: log in to a hosted app with real identity verification and server-enforced roles before introducing document access.

## Implementation scope

1. Create D1 migrations for a fictional bank, two corporate organizations, user memberships and staff assignments. Seed separate client identities, a manager, a compliance officer and a restricted demo administrator.
2. Configure Cloudflare Access with the selected identity provider and MFA. Validate JWT signature, issuer, audience and expiry in the API; map the validated subject to application membership. Unknown identities receive no application access.
3. Implement a shared deny-by-default authorization layer and a current-user endpoint. Roles and organization scope come from server records; a browser header or role selector cannot grant privileges.
4. Connect the role-layout shells to the actual account. Keep business permissions separate from demo administration; an administrator does not automatically become a compliance approver.
5. Configure protected Cloudflare dev/demo environments, a dev D1 database and private R2 storage with the chosen jurisdiction settings. Deploy the shell to a developer-only hostname. Prevent Access bypass through alternate Worker and preview URLs.
6. Establish same-origin request handling, CSRF protection for mutations, session-expiry behavior, secret handling and no-store policies for identity responses. Add a local-only identity adapter for repeatable tests that a deployed build cannot activate.

Hosted prerequisites: Cloudflare account permissions, hostname, identity-provider access, invited test identities and a scoped deployment credential. If unavailable, finish local authorization work and list the exact missing configuration; do not claim hosted verification passed.

## Deliverables

- Login/logout/session-expiry behavior and role-specific landing pages.
- Versioned identity schema, synthetic memberships and local setup script.
- Protected developer deployment and documented environment/binding configuration.
- Authentication and permission tests, including local-adapter deployment rejection.

## Run and inspect

1. Run local setup, then log in with each test identity in separate browser profiles.
2. Confirm each profile receives its own role and organization from the current-user endpoint.
3. Send direct API requests with no token, an expired token, an invalid signature or the wrong audience. No protected response should succeed.
4. Attempt to supply another organization or role through request parameters and headers. Server membership must still control access.
5. Open the custom hostname and every available alternate deployment route while signed out. Protected content must not become accessible through another route.

Completion gate: verified identities and default-deny policies work locally and on the protected developer deployment. Future resource endpoints must reuse and extend these checks.

Next: [Phase 3](03-cases-and-documents.md). Overall scope: [POC plan](../cloudflare-poc-plan.md).
