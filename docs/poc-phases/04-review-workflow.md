# POC Phase 4 — Manager and compliance review cycle

Status: implemented locally; hosted migration/deployment and browser walkthrough pending. Depends on: Phase 3.

Goal: complete the entire customer journey manually, including a correction and a reasoned final decision.

## Implementation scope

1. Build the manager's assigned-case queue and review page. Implement a small fixed checklist: required documents present, readable fixture, relevant parties, amount/currency and document dates checked.
2. Implement server commands to start manager review, request changes and hand off to assigned compliance staff. Handoff requires completion of the manager checklist for the current document versions.
3. Build the compliance queue and review page with documents, manual findings, change requests and approve/reject commands. Require a decision reason and an explicit reviewed document snapshot.
4. Add separate internal and client-visible message types. Internal notes belong only in authorized staff API responses; clients see published requests and their own responses. Message text is safely rendered.
5. Implement AwaitingClient, client response/new version upload and resubmission to ManagerReview. Preserve the open compliance request and route the rechecked case back to the appropriate officer.
6. Invalidate affected checklist confirmations when new document versions arrive. Terminal Approved/Rejected cases are read-only in this POC; reopening is deferred.
7. Use one transition policy with role, assignment, state and revision checks. Atomically persist transition, decision/request and audit data. Add simple in-app notifications without email/SMS.

## Deliverables

- Usable client, manager and compliance workspaces connected to the same records.
- One complete state machine with correction loops and terminal decisions.
- Staff/private versus customer-visible communication and audit projections.
- End-to-end tests for a happy path, missing-contract correction, rejection and forbidden actions.

## Run and inspect

1. Submit a case containing only the invoice. The manager requests the contract; the client uploads it and resubmits; the manager checks and forwards it.
2. As compliance, flag the mismatched fixture invoice, add an internal note and send a separate external correction request.
3. As the client, inspect page content, API payloads, timeline and notifications. The internal note and staff-only findings must be absent.
4. Upload corrected v2, resubmit, repeat manager review and approve as the assigned compliance officer with a reason.
5. Inspect the final version snapshot and timeline. Previous versions and completed requests must remain traceable.
6. Try approval as a client or manager, or by unassigned staff. Attempt two conflicting final decisions. Unauthorized attempts must fail and only one final decision may commit.

Completion gate: the full workflow is demonstrable through the UI without AI or direct database edits. Review this milestone internally before building Phase 5; incorporate substantive workflow feedback now.

Next: [Phase 5](05-simulated-analysis.md). For a deliberately reduced manual-workflow demo, proceed instead through the applicable [Phase 7 release checks](07-verification-and-release.md). Overall scope: [POC plan](../cloudflare-poc-plan.md).
