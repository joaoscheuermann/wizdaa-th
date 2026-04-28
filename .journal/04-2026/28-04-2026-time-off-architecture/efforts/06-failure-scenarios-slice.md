---
status: done
order: 6
created: 2026-04-28 13:22
title: "Failure Scenarios Slice"
---

## Description

Add the unreliable HCM behaviors required by the TRD: slow reads/writes, invalid dimensions, insufficient balance conflicts, silent no-response timeouts, silent wrong success, submit conflicts, approval conflicts, manual retry, and user-visible `conflict_needs_review` states.

## Objective

After this effort, a reviewer can use `/api/hcm/state` to set scenario modes and observe the app handle each required failure without falsely showing final approval or losing recoverable user intent.

## Implementation Details

- Add or complete `src/server/hcm/scenarios.ts` with deterministic scenario modes from the TRD.
- Extend `hcm-service.ts` to apply scenario modes to read, submit, approval, and denial paths.
- Implement 5-second write timeout behavior in the client/query layer with manual retry and no repeated automatic mutation retries.
- Add silent wrong success flow: UI shows pending/accepted state initially, later reconciliation detects contradiction and moves request to `conflict_needs_review`.
- Add approval conflict flow: final approval conflicts must not auto-resolve and must require manager re-review.
- Add invalid dimension and insufficient balance UI treatment for employee submission and manager approval.
- Add retry affordances for retryable submission/approval/denial failures.
- Add focused tests for every deterministic scenario mode introduced in this effort, including slow write timeout, silent no-response retry, silent wrong success contradiction, submit conflict, approval conflict, invalid dimension, insufficient balance, and denial retryable failure.
- Add README examples for patching scenario mode through `/api/hcm/state`.

## Verification Criteria

- Run `npm run dev`, patch scenario mode to `insufficient_balance`, submit a request, and observe rollback plus rejection messaging.
- Patch scenario mode to `invalid_dimension`, submit a request, and observe selected location/dimension error messaging.
- Patch scenario mode to `silent_no_response`, submit or approve, and observe retryable timeout state after 5 seconds without final approval.
- Patch scenario mode to `silent_wrong_success`, submit a request, trigger reconciliation, and observe `conflict_needs_review`.
- Patch scenario mode to `conflict_on_approval`, approve as Manager, and observe manager re-review requirement.
- Run `npm run test` and observe deterministic failure-scenario tests pass.
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Done

- All required HCM scenario modes are deterministic and controlled through `/api/hcm/state`.
- The UI never marks final approval before HCM confirmation.
- Retryable failures preserve user intent and expose manual retry.
- Contradictions and final approval conflicts are visible as `conflict_needs_review`.
- Automated tests prove each scenario mode and retry/conflict behavior.

## Change Summary

### Files Created

- `src/server/hcm/scenarios.ts`
- `src/lib/hcm-client/client.test.ts`

### Files Modified

- `README.md`
- `src/domain/time-off/types.ts`
- `src/domain/time-off/schemas.ts`
- `src/server/hcm/state-store.ts`
- `src/server/hcm/balance-api.ts`
- `src/server/hcm/balance-api.test.ts`
- `src/server/hcm/hcm-service.ts`
- `src/server/hcm/request-api.ts`
- `src/server/hcm/request-api.test.ts`
- `src/server/hcm/state-api.test.ts`
- `src/lib/hcm-client/client.ts`
- `src/lib/hcm-client/errors.ts`
- `src/lib/queries/request-mutations.ts`
- `src/features/employee/request-form.tsx`
- `src/features/employee/request-form.test.tsx`
- `src/features/manager/manager-decision-panel.tsx`

### Files Deleted

- None.

### Key Decisions / Trade-Offs

- Added the TRD scenario mode union and server-side scenario helpers, controlled through `/api/hcm/state`.
- Kept slow and silent behavior at route boundaries so service logic remains deterministic and testable.
- Implemented 5-second client write timeouts with `AbortController`; mutation retries remain manual and `retry: false`.
- Silent wrong success returns an accepted pending response, but authoritative HCM state stores `conflict_needs_review`, so reconciliation exposes the contradiction.
- Approval conflicts, invalid dimensions, and insufficient approval balance produce visible `conflict_needs_review`, not final approval.

### Deviations

- No functional deviations.
- Independent tester delegation was not available as a callable tool, so the developer loaded the tester workflow and applied its verification checklist directly.

### Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed: 10 files, 42 tests.
- `npm run build` passed.
- Existing dev server at `http://127.0.0.1:3000` returned 200.
- API smoke passed:
  - `insufficient_balance` returned `409:insufficient_balance`.
  - `invalid_dimension` returned `400:invalid_request_dimensions`.
  - `silent_wrong_success` returned pending, then reconciled to `conflict_needs_review`.
  - `conflict_on_approval` returned `conflict_needs_review`.
  - `silent_no_response` returned `504:sync_failed_retryable` after about 5.3 seconds.
- Vitest still emits an existing Node experimental CJS/ESM warning from `@asamuzakjp/css-color`; tests pass.
