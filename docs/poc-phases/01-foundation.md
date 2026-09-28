# POC Phase 1 — Foundation and demo contract

Status: implemented and locally verified on 28 September 2026. Depends on: nothing. Original estimate: 0.5–1.5 engineering days.

Delivered: the local React/Hono workspace, strict TypeScript/build checks, production HTTP smoke checks, scenario/domain contracts, CI configuration, and environment reservations. See the [setup README](../../README.md), [demo contract](../poc-demo-contract.md) and [verification record](../phase-1-verification.md). No cloud resources were provisioned or deployed.

Goal: start a small TypeScript application locally and establish one concrete scenario that the following phases will implement.

## Implementation scope

1. Document the fictional contract/invoice review scenario, client/manager/compliance actions, and expected outcomes. Define complete, missing-contract and amount-mismatch fixture scenarios, including a corrected invoice v2.
2. Define the state flow: Draft → Submitted → ManagerReview → ComplianceReview → Approved/Rejected. Either reviewer can request changes through AwaitingClient; resubmission returns to ManagerReview. Submission requires case fields and at least one permitted document; document completeness is a manager check, so the missing-contract scenario remains possible.
3. Initialize the Git repository if it is still absent. Scaffold React, TypeScript, Vite, Hono and Wrangler with pinned compatible versions and a lockfile. Use Node.js LTS for tooling and the Workers runtime for the API.
4. Establish simple directories for web UI, API, domain rules, contracts, Cloudflare adapters, migrations, fixtures and tests. Keep this as one small project and deployment.
5. Build navigable role-layout shells and a non-sensitive health endpoint. Show demo labeling. Use local placeholders only until Phase 2 provides identity; no unrestricted role switch in a hosted build.
6. Add environment examples, ignored secret files, type checks, a production build and CI verification. Reserve separate dev/demo configuration and resource names without provisioning billable services in this phase.

## Deliverables

- A working local application with client, manager and compliance layout shells.
- A short scenario/role matrix and planned data/status contract.
- A setup README, dependency lockfile, environment example and CI configuration.
- Working `rtk pnpm dev` and `rtk pnpm verify` scripts. Other runbook scripts arrive in later phases.

## Run and inspect

1. Install from the lockfile and start the local application.
2. Open each layout and refresh a nested route; the app must still render.
3. Call the health endpoint and confirm it exposes no secrets or infrastructure credentials.
4. Run verification and build from a clean local configuration.
5. Walk through the three fixture scenarios using the screen outline and state diagram. Confirm the correction loop has an explicit return path.

Verification here is a working build and smoke check; do not invent business tests for features that are not yet implemented. Add meaningful tests with those features.

Completion gate: another developer can start the shell from the README, and the scenario and role boundaries are clear enough to implement Phase 2 without redesigning the product.

No real authentication, customer data, document processing or public deployment is delivered in this phase. Next: [Phase 2](02-identity-and-cloudflare.md). Overall scope: [POC plan](../cloudflare-poc-plan.md).
