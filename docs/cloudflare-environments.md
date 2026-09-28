# Phase 2 Cloudflare deployment runbook

Status: prepared, not executed. No remote resources were provisioned or deployed during Phase 2 implementation. Wrangler authentication was expired. Hosted MFA and routing verification are still required.

## 1. Supply missing account configuration

Authenticate interactively with `rtk pnpm exec wrangler login`, then check `rtk pnpm exec wrangler whoami`. Do not share tokens in chat or commit them. CI deployment is not configured; a future deployment credential should be scoped to the chosen account/resources and kept in the CI secret store.

Provide a developer hostname on a Cloudflare-managed zone, the selected identity provider, a Cloudflare Access application, and five separate invited test identities. Copy `cloudflare.example.json` to ignored `cloudflare.local.json` and fill in the actual account ID, Access issuer, hostname, audience and D1 database ID for `dev`. Fill `demo` only when preparing the separate customer environment. These are configuration identifiers, not authentication secrets.

| Resource | Developer environment | Customer demo environment |
| --- | --- | --- |
| Worker | digital-compliance-hub-dev | digital-compliance-hub-demo |
| D1 | dch-dev-metadata | dch-demo-metadata |
| Private R2 | dch-dev-documents | dch-demo-documents |
| Access audience / hostname | Separate developer application | Separate customer application |

Queues are deferred to Phase 5. R2 has no document endpoints yet.

## 2. Protect the hostname before deployment

In Cloudflare Zero Trust, create a self-hosted Access application for the complete developer hostname, with no path restriction. Allow only the invited development identities through the selected IdP. Require MFA through the supported IdP authentication-method policy or Access independent MFA, and verify it with a real login. Do not add Bypass or Service Auth policies. Configure application session duration to one hour or less; the Worker rejects assertions older than one hour.

Copy the application's audience (AUD) and the exact issuer `https://TEAM.cloudflareaccess.com` into local configuration. Map JWT `sub` identities, not browser-supplied email/role headers, to memberships. Application admission and database membership are separate checks. Unknown identities get 403, even if Access admits them.

MFA requirements depend on the IdP's supported claims; a successful local sign-in is not evidence of hosted MFA. Follow [Cloudflare's MFA documentation](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/) and [JWT verification guidance](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## 3. Create isolated resources

Select the intended account before these remote commands. Keep public bucket access disabled, including r2.dev and public custom domains. No CORS rule is needed: documents will be served through the authenticated Worker in Phase 3.

```bash
rtk pnpm exec wrangler d1 create dch-dev-metadata --jurisdiction eu --update-config false
rtk pnpm exec wrangler r2 bucket create dch-dev-documents --jurisdiction eu --update-config false
```

Record the returned D1 ID in `cloudflare.local.json`. D1 jurisdiction is chosen at creation; a location hint is not equivalent. R2 bindings include `jurisdiction: eu`. These settings constrain storage resources, not every Worker, identity or telemetry path. [D1 location](https://developers.cloudflare.com/d1/configuration/data-location/), [R2 location](https://developers.cloudflare.com/r2/reference/data-location/).

Generate the reviewed configuration and apply only the remote schema:

```bash
rtk pnpm configure:cloudflare dev
rtk pnpm exec wrangler d1 migrations apply dch-dev-metadata --remote --config wrangler.dev.generated.json
```

`wrangler.jsonc` remains local-only. Generated configs require real IDs, have no public Worker/preview aliases, and route every asset through the authentication handler. No flags or Worker variables enable the local login adapter.

## 4. Provision application memberships

Copy `seeds/hosted.example.sql` to ignored `seeds/hosted.local.sql`. Replace every placeholder using the selected Access issuer and the five identities' verified Access subject IDs. Obtain these through trusted Access identity records or a locally verified assertion; do not paste tokens into third-party decoders or this chat. Review quoting and all mappings before executing. This seed is intended for a new database and deliberately fails on duplicate user IDs.

```bash
rtk pnpm exec wrangler d1 execute dch-dev-metadata --remote --config wrangler.dev.generated.json --file seeds/hosted.local.sql
```

Never run `seeds/local.sql` on hosted storage. It contains development-only subjects. The two client accounts belong to separate organizations; manager and compliance are assigned only to Northstar. The administrator has no business permissions. Do not auto-provision identities from email domains.

## 5. Build and deploy the compiled artifact

```bash
rtk pnpm verify
rtk pnpm build:cloudflare dev
rtk pnpm exec wrangler deploy --config dist/digital_compliance_hub_dev/wrangler.json
```

Review the generated config and confirm the Access policy is active before deployment. The build command compiles the hosted environment and checks that local login code and browser-bundled scenario records are absent. Deploy this compiled config only. It includes the static assets, canonical hostname, D1 and private EU R2 bindings.

Revoke any old routes or aliases from earlier deployments. `workers_dev: false` and `preview_urls: false` are config controls, not evidence of actual deployed routing. The Worker independently checks JWT signature, issuer, audience, expiry and canonical origin; missing configuration fails closed. `/api/health` contains only a constant service name and status, and is still behind Access at the hostname edge.

## 6. Hosted acceptance gate — still pending

Use separate browser profiles and record the deployment version, timestamp and outcome without storing tokens:

1. Signed out: hostname, deep links, static JS URLs and protected APIs lead to Access or denial. Test every existing workers.dev/preview/alternate route; none exposes protected content.
2. Sign in through the chosen IdP; confirm an actual MFA challenge/requirement. Each of the five identities receives the expected `/api/me` role and organization scope.
3. Cedar cannot see Northstar examples; manager/compliance cannot query Cedar. The administrator receives 403 from `/api/workspace`; other roles receive 403 from `/api/admin`.
4. Send missing, expired, wrong-audience and invalid-signature assertions directly. Accept denial at Access or the Worker; never weaken the Access policy to test. Cloudflare may overwrite client-supplied assertion headers, so use the local verifier suite for deterministic negative cases as well.
5. Verify normal and expired-session sign-out/re-entry. Disabled membership immediately denies subsequent requests; removing a staff assignment denies that organization's next request.
6. Cross-origin mutations, missing Origin and missing `X-CSRF-Protection: 1` fail. Sensitive responses use `Cache-Control: no-store`. No bearer tokens are stored in localStorage or application logs.
7. Inspect R2 bucket settings: no public endpoint; jurisdiction is EU. Inspect D1 jurisdiction and confirm no real banking content was seeded.

Only after this gate passes mark Phase 2 complete. Repeat configuration/resource creation for `demo` using its own IDs, audience and hostname before customer release. Do not reuse the developer allowlist as a customer policy.

## Local walkthrough

Run `rtk pnpm setup:local` and `rtk pnpm dev`, then open port 5178. Sign in as each test account and inspect its role, examples and sign-out behavior. Use two browser profiles for organization isolation. Change a role in the URL: the page should be unavailable and the account should retain its original role. Check `/api/me` directly for server-derived scope. The Cedar empty state is deliberate; persisted cases arrive in Phase 3.

Use the production build (`rtk pnpm preview --port 4178`) to confirm local account sign-in and cookies do not work there. Without configured Access, protected pages return 401. Browser visual verification must be performed manually if the automation policy blocks localhost inspection.
