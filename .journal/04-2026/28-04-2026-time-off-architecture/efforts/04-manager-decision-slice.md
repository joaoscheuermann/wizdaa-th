---
status: done
order: 4
created: 2026-04-28 13:22
title: "Manager Decision Slice"
---

## Description

Add the manager review workflow for pending requests. This effort introduces the pending queue, request decision panel, approval with fresh per-cell verification, changed-but-sufficient reconfirmation, denial with reason, and the balance accounting that converts or releases pending days.

## Objective

After this effort, a reviewer can submit a request as an employee, switch to Manager, see the request oldest-first in the pending queue, approve it after HCM verification, or deny it with a reason and observe the employee timeline update.

## Implementation Details

- Add product endpoint `GET /api/hcm/requests?status=pending`.
- Add product endpoint `PATCH /api/hcm/requests/[requestId]` for manager approval/denial.
- Extend `hcm-service.ts` so approval verifies the authoritative per-cell balance before final approval.
- On approval success, convert pending days into consumed balance and set request status to `approved`.
- On denial success, release pending days, store denial reason, and set request status to `denied`.
- If fresh verification returns a changed but still sufficient balance, return a response that causes the UI to show updated balance context and require another explicit manager confirmation.
- Add `PendingRequestQueue` and `ManagerDecisionPanel` under `src/features/manager`.
- Add request queue query and manager decision mutations in `src/lib/queries`.
- Update employee timeline to reflect approved/denied states after reconciliation/refetch.
- Add focused tests for oldest-first queue ordering, approval pending-to-approved transition, pending-day conversion, denial reason, pending-day release, and changed-but-sufficient reconfirmation.

## Verification Criteria

- Run `npm run dev`, submit a request as Employee, switch to Manager, and observe the request in the pending queue sorted oldest-first.
- Approve a request and observe final approved status only after HCM confirmation.
- Deny a request with a reason and observe pending days release plus denial reason in the employee timeline.
- Patch state so the decision-time balance changes but remains sufficient, approve, and observe the UI require a second manager confirmation before final approval.
- Inspect `GET /api/hcm/state` after approval and denial to verify pending-day conversion/release.
- Run `npm run test` and observe manager queue, approval, denial, and reconfirmation tests pass.
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Done

- Manager can review pending requests from the UI.
- Manager approval uses fresh per-cell verification and does not mark approved early.
- Manager denial releases pending days and records a visible reason.
- Changed-but-sufficient approval requires explicit reconfirmation.
- Automated tests prove queue ordering, approval conversion, denial release, and reconfirmation behavior.

## Change Summary

Implemented Effort 4 only.

Files created:

- `src/app/api/hcm/requests/[requestId]/route.ts`
- `src/features/manager/pending-request-queue.tsx`
- `src/features/manager/manager-decision-panel.tsx`

Files modified:

- `src/domain/time-off/types.ts`
- `src/domain/time-off/schemas.ts`
- `src/domain/time-off/lifecycle.ts`
- `src/server/hcm/hcm-service.ts`
- `src/server/hcm/request-api.ts`
- `src/server/hcm/state-store.ts`
- `src/server/hcm/request-api.test.ts`
- `src/lib/hcm-client/client.ts`
- `src/lib/queries/query-keys.ts`
- `src/lib/queries/balance-queries.ts`
- `src/lib/queries/request-mutations.ts`
- `src/components/common/app-shell.tsx`
- `src/features/employee/request-timeline.tsx`
- `src/features/employee/request-timeline.test.tsx`

Files deleted:

- None.

Key decisions and trade-offs:

- Added `GET /api/hcm/requests?status=pending` and `PATCH /api/hcm/requests/[requestId]`.
- Kept manager decision logic in `hcm-service.ts`, reusing the existing route-handler and query patterns.
- Approval verifies the fresh balance version before final approval.
- Changed-but-sufficient balance returns `reconfirmation_required` and keeps the request pending as `conflict_needs_review`.
- Moved mock HCM state onto `globalThis` so separate Next route bundles share the same in-memory state; HTTP verification showed route-local module state could diverge otherwise.

Deviations:

- No scope expansion beyond Effort 4 behavior.
- Added the shared global state-store fix because Effort 4 verification requires `/api/hcm/state` to reflect request decisions made through other route handlers.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed with 8 files / 21 tests.
- `npm run build` passed.
- Dev server was already running at `http://localhost:3000`.
- HTTP smoke passed for oldest-first pending queue, approval conversion, denial reason/release, and changed-but-sufficient reconfirmation.
- State was reset afterward.
- Vitest still emits the existing Node experimental CJS/ESM warning from `@asamuzakjp/css-color`; tests pass.
