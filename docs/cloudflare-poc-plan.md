# Digital Compliance Hub — phased Cloudflare POC implementation plan

Updated 28 September 2026 · POC only. Phases 1–7 are implemented for the public synthetic-data scope and deployed at `https://dch.cooptinyteam.org`. Local verification, hosted API smoke, D1/R2 backup verification and Worker rollback rehearsal are implemented. Cloudflare Access/MFA is deliberately excluded. See the [local setup](../README.md), [phase alignment record](phases-1-7-alignment.md) and [release acceptance record](release-acceptance.md).

## Current phase amendment

User-directed change: the hosted POC uses the same public fictional-account picker as local development. Access/IdP/MFA and invite-only release requirements are deferred to a future production-security phase. Server-side selected-session permissions remain enforced. See [current Phase 2 scope](poc-phases/02-identity-and-cloudflare.md).

## 1. What the demo must prove

A corporate client submits a document package; a manager checks completeness; a compliance officer finds a discrepancy and requests a correction; the client uploads a new version; staff complete the review; every participant sees the appropriate status and history.

Use one case type: a fictional corporate cross-border payment document review with a contract and invoice. Approval is a document-review outcome only. No payment, trading, live FX, sanctions screening, or legal-compliance determination is performed.

The base POC uses one fictional bank, two fictional corporate organizations, and four account types: client, manager, compliance officer, and a restricted demo administrator. Separate client identities for the two organizations allow isolation checks. The public account picker exposes these fictional roles for demonstration; it is not a real authentication control.

Confirmed scope: synthetic fixture files only, with potential customers in both Ukraine and the EU/EEA. Display “Demo — synthetic data” and “Simulated analysis” where relevant. The first version is a workflow proof, not an OCR benchmark. Keep the UI ready for Ukrainian/English localization, but use one shared demonstration scenario; it is not a validated regulatory rule pack for either market.

## 2. Smallest useful stack

| Component | Choice | Purpose |
| --- | --- | --- |
| Web UI | React + TypeScript + Vite | Client, manager, and compliance views in one app. |
| Hosting and API | Cloudflare Workers Static Assets + Hono | Single deployment for SPA and API; same-origin requests. Cloudflare documents this architecture directly. [React guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/), [Hono guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/) |
| Records | D1, created with EU jurisdiction for the demo | Cases, memberships, document metadata, messages, decisions, audit and jobs. Explicit SQL migrations and parameterized queries. |
| Files | Private R2 bucket, EU jurisdiction | Synthetic originals and immutable version objects. Public bucket access stays disabled. |
| Authentication | Signed, secure demo session selected from fictional accounts | Matches local and hosted POC behavior. API maps the signed session to server-side roles and organizations. Cloudflare Access/MFA is deferred. |
| Processing | Persisted job/outbox records + Cloudflare Queues | Asynchronous simulated extraction and visible retry/failure states. Consumers must tolerate duplicate delivery. [Delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) |
| Verification and deployment | Node test runner + SQLite (Phase 2), browser journeys (later), Wrangler and CI | Reproducible local setup, guarded deployment and repeatable acceptance checks. |

The confirmed language preference is JavaScript/TypeScript and Node.js, with Python only where it adds value. Use Node.js 24 LTS for development tooling. Workers runs its own runtime, not a full Node.js process; the production application uses Node.js containers. Keep domain logic runtime-neutral. Pin compatible stable dependencies, Wrangler, and the Workers compatibility date; do not depend on previews for the base demo. Python and GPU infrastructure are unnecessary for this first simulated-AI POC.

D1 is the database for all phases below. Keep SQL and Cloudflare bindings in adapters so application rules remain understandable and testable. Database alternatives and a real-data bank deployment belong to the separate production plan; they are not additional work in this POC.

EU D1/R2 settings constrain those resources, not every compute, identity or logging path. This demo is not a claim of fully EU-localized processing. D1 currently has a 10 GB per-database limit on Workers Paid, which is ample for this bounded metadata demo but not a production sizing argument. [D1 location](https://developers.cloudflare.com/d1/configuration/data-location/), [R2 location](https://developers.cloudflare.com/r2/reference/data-location/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

## 3. Scope and explicit shortcuts

| Implement for real in the POC | Simulate or defer |
| --- | --- |
| Authentication and server-enforced permissions | Production bank SSO/provisioning and customer onboarding |
| Persisted cases and validated transitions | Configurable workflow designer and complex escalation policies |
| Fixture upload, download and preserved versions | Arbitrary real customer documents; full malware/OCR infrastructure |
| Manager checklist and compliance decision with reason | Regulatory screening feeds and automated compliance decisions |
| Internal versus client-visible comments | Email/SMS; use an in-app notification list |
| Analysis job states and source-linked fixture findings | Real OCR/LLM inference, clearly labeled as simulated |
| Action/view/download audit timeline | Independent immutable audit archive and production retention |
| Counts by status and basic turnaround display | Data warehouse, Excel/PDF reporting and advanced analytics |
| Reset, export and recovery rehearsal | Bank availability commitments and disaster-recovery certification |

Minimal file handling: permit only the supplied small PDFs/images, verified by a server-side content-hash allowlist. Maximum 10 MB per file and 10 stored file versions per case, including earlier versions. Reject unknown content even if its extension matches. Provide a downloadable fixture pack so users can demonstrate actual upload interactions. Do not preview or parse rejected files. This constraint permits a useful upload demo without representing a missing malware scanner as implemented protection.

## 4. Implementation phases

Implement these phases in order. Each linked description is a bounded implementation brief with tasks, deliverables, manual checks, automated checks and a completion gate. Build a usable UI with each feature; Phase 6 improves the experience rather than introducing the first usable screens. Security and audit controls accompany the features they protect.

| Phase | Implementation brief | Visible result | Estimated engineering days |
| --- | --- | --- | --- |
| 1 | [Foundation and demo contract](poc-phases/01-foundation.md) | App starts locally; role layouts and the exact demo scenario are defined. | 0.5–1.5 |
| 2 | [Demo sessions and organization permissions](poc-phases/02-identity-and-cloudflare.md) | Fictional users select a signed session; the API enforces roles and organization scope. | 1–2 |
| 3 | [Client cases and private documents](poc-phases/03-cases-and-documents.md) | A client creates a case, uploads supplied files, preserves versions and submits. | 2–3 |
| 4 | [Manager and compliance review cycle](poc-phases/04-review-workflow.md) | The complete manual correction-and-decision journey works across all three workspaces. | 3–4 |
| 5 | [Simulated document analysis](poc-phases/05-simulated-analysis.md) | Background analysis shows source-linked fixture findings and recoverable failures. | 1–2 |
| 6 | [Customer demo experience](poc-phases/06-demo-experience.md) | Clear work queues, notifications, statistics and Ukrainian/English interface text. | 1–2 |
| 7 | [Verification, recovery and demo release](poc-phases/07-verification-and-release.md) | A repeatable public synthetic Cloudflare demonstration with a tested runbook. | 1.5–3 |

Total: approximately 10–18 engineering days, typically 2–4 calendar weeks for one experienced full-stack engineer with prompt feedback. Account setup and missing hosting access can extend elapsed time. These are estimates, not commitments.

Review milestones:

- After Phase 2: verify fictional sessions, server-side role checks and organization isolation locally and on the hosted app.
- After Phase 4: walk through the complete workflow internally and adjust it before adding analysis or polishing screens.
- After Phase 7: present the full synthetic POC to prospective customers.

For a shorter demonstration, the Phase 4 manual workflow can be taken directly through the relevant Phase 7 release checks. In that reduced scope, omit the AI and statistics demonstration explicitly; do not bypass identity, isolation, file restrictions, audit or recovery checks. The default plan includes all seven phases.

Each phase is complete when its deliverables are present, relevant checks pass, and its walkthrough can be reproduced. Current evidence and remaining manual checks are recorded in the alignment and acceptance records.

## 5. Important implementation details

- **Atomic changes:** persist case state, transition audit and outbox intent as one database operation. D1 batch operations can provide transactional execution, but do not assume PostgreSQL-style interactive transactions. Conditional writes must prevent an audit/outbox success record when a revision check fails. Include a conflict test. [D1 batch API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- **Delivery gaps:** an outbox dispatcher publishes pending work; a scheduled retry sweep recovers publish failures. A crash after publishing can cause duplicate delivery, handled with a unique job/version key. No documents or extracted text in queue payloads; carry scoped identifiers.
- **File consistency:** stage the upload, verify permitted bytes, store under a new generated key, then finalize metadata. Clean incomplete objects through reconciliation. Never overwrite v1 when v2 arrives.
- **Scope:** derive bank/organization membership from validated identity, not a browser-supplied tenant header. Every list, statistic, file and message endpoint applies the same policies. Staff assignment is checked server-side.
- **Role presentation:** the POC uses a fictional-account picker backed by signed sessions. Replace it with bank identity integration before any real-data pilot.
- **Session and browser protections:** keep identity tokens out of localStorage; protect state-changing requests against CSRF and enforce same-origin policy. API failures return a usable session-expired message.
- **Audit honesty:** demo audit rows are append-only through the app; an account/database administrator could still change them. Do not label them immutable or regulatory-certified.
- **Deployment exposure:** the current custom hostname is public by design and synthetic-only. Hosted smoke verifies API and document authorization independently. A real-data pilot requires protected identity and route controls.
- **Reset boundary:** reset operates only on the designated synthetic demo environment, requires administrator authorization, and cannot select production resources. Define a demo expiry date and remove invites/resources when finished.

## 6. Runbook contract to deliver with the implementation

The commands below are implemented. Repository shell instructions use the local RTK convention.

| Command | Expected outcome |
| --- | --- |
| `rtk pnpm install --frozen-lockfile` | Install the committed dependency versions. |
| `rtk pnpm setup:local` | Apply local migrations and seed fictional memberships/cases/fixtures without Cloudflare credentials. Local test identity is bound to localhost and cannot be enabled in a deployed build. |
| `rtk pnpm dev` | Run SPA/API and local Cloudflare bindings, with documented test identities. |
| `rtk pnpm verify` | Run type checks, relevant policy/workflow tests and production build. |
| `rtk pnpm release:check` | Run local verification plus configuration, migration, fixture and runbook preflight. |
| `rtk pnpm build:cloudflare demo` / `rtk pnpm deploy:cloudflare demo` | Build and deploy the selected environment with its generated Wrangler configuration. |
| `rtk pnpm seed:scenarios ORIGIN` | Create the bounded synthetic walkthrough scenarios through the API. |
| `rtk pnpm smoke:hosted ORIGIN` | Check hosted headers, sessions, CSRF, tenant isolation, roles, files, notifications, statistics and fixture restrictions. |
| `rtk pnpm backup:cloudflare demo` / `rtk pnpm restore:cloudflare dev BACKUP --confirm=dch-dev-metadata` | Export D1 plus R2 objects with checksums and restore only into an explicit disposable environment. |
| `rtk pnpm reset:cloudflare demo --confirm=dch-demo-metadata` | Back up and reset only the named demo dataset after exact target confirmation. |

Hosted prerequisites: a Cloudflare account with the necessary services enabled, a demo hostname, a scoped deployment API token, and separate dev/demo resource identifiers. No external identity provider is required for the current synthetic POC.

## 7. Eight-minute customer presentation

1. Client creates a case and uploads the synthetic invoice/contract package.
2. Manager sees the new task, completes formal checks and forwards it.
3. Compliance officer sees a simulated amount mismatch linked to a specific document page.
4. Officer adds an internal note and sends a distinct client-facing correction request.
5. Client sees only the external request, uploads corrected v2 and resubmits.
6. Manager checks the updated package; officer approves with a reason.
7. Show the resulting client status, preserved v1/v2 history, action timeline and updated dashboard.

Then ask the customer to explain the next action without assistance, identify missing documents, and describe how this would change their current process. Record those observations; do not claim measured time savings from a scripted demo.

## 8. Cost and POC completion boundary

For low traffic, supplied files and simulated AI, use a planning allowance of roughly USD 10–30/month for core demo hosting/storage/queue usage. This is an estimate, not a quote or a spending cap. Cloudflare Workers Paid currently starts at USD 5/month; Access/identity licensing, domains, taxes, enterprise localization and any real AI service may add costs. Verify account-specific pricing before provisioning, set usage alerts and application quotas. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)

The POC implementation is complete when the hosted walkthrough works for the fictional roles, the isolation/visibility checks pass, and backup/recovery commands are delivered and verified. The remaining presenter-led walkthrough and destructive reset rehearsal are tracked explicitly in the acceptance record.

Real authentication, Cloudflare Access/MFA, OCR/LLM inference, Python services, arbitrary document uploads, bank integrations, production database migration, regulatory rule packs and a real-data pilot are outside these phases. Those require separately scoped work under the [production implementation plan](production-implementation-plan.md).
