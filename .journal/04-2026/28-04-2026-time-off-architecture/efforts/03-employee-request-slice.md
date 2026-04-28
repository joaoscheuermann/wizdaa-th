---
status: done
order: 3
created: 2026-04-28 13:22
title: "Employee Request Slice"
---

## Description

Add the employee request submission workflow on top of the balance hydration slice. This effort introduces the request form, validation rules, request lifecycle helpers, product request creation endpoint, optimistic pending reservation, rollback on explicit HCM rejection, and employee request timeline.

## Objective

After this effort, a reviewer can submit a PTO request from the employee view, see immediate pending feedback, observe `pendingDays` update, and see the request appear in the employee timeline as pending manager review.

## Implementation Details

- Add request lifecycle helpers in `src/domain/time-off/lifecycle.ts`.
- Extend schemas for request form validation: required location, inclusive local date range, manual `requestedDays` with `0.5` increments, minimum `0.5`, and maximum effective available days.
- Add product endpoint `POST /api/hcm/requests`.
- Extend `src/server/hcm/hcm-service.ts` so successful submission increases `pendingDays`, writes an audit event, and creates a `submitted_pending_manager` request.
- Add deterministic insufficient-balance and invalid-dimension rejection handling for the submission path.
- Add request query/mutation hooks in `src/lib/queries/request-mutations.ts`.
- Add employee `RequestForm` and `RequestTimeline` components under `src/features/employee`.
- Implement optimistic UI pending reservation with rollback on explicit HCM rejection.
- Add focused tests for request validation, successful submission pending-day reservation, insufficient-balance rollback, invalid-dimension rejection, and employee request timeline pending state.
- Keep manager approval/denial and advanced silent failure scenarios for later efforts.

## Verification Criteria

- Run `npm run dev`, select an employee/location with sufficient balance, submit a valid PTO request, and observe immediate pending state plus updated pending/effective days.
- Inspect `GET /api/hcm/state` after submission and observe the new request and pending-day reservation.
- Submit an invalid requested-day value such as `0.25` and observe field-level validation.
- Patch state or use seeded low-balance data, submit an over-balance request, and observe rollback plus HCM rejection message.
- Run `npm run test` and observe request validation, submission, reservation, and rollback tests pass.
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Done

- Employee can submit a valid PTO request through the UI.
- Submission creates a pending manager-review request in mock HCM state.
- Pending-day reservation is visible in the balance UI.
- Explicit HCM rejection rolls back the optimistic reservation and shows a recoverable error.
- Automated tests prove validation, pending reservation, and rollback behavior.

## Change Summary

Implemented Effort 3 only.

Files created:

- `src/domain/time-off/lifecycle.ts`
- `src/domain/time-off/schemas.test.ts`
- `src/app/api/hcm/requests/route.ts`
- `src/server/hcm/hcm-service.ts`
- `src/server/hcm/request-api.ts`
- `src/server/hcm/request-api.test.ts`
- `src/lib/queries/request-mutations.ts`
- `src/features/employee/request-form.tsx`
- `src/features/employee/request-form.test.tsx`
- `src/features/employee/request-timeline.tsx`
- `src/features/employee/request-timeline.test.tsx`

Files modified:

- `src/domain/time-off/types.ts`
- `src/domain/time-off/schemas.ts`
- `src/server/hcm/state-store.ts`
- `src/server/hcm/state-api.ts`
- `src/lib/hcm-client/client.ts`
- `src/lib/hcm-client/errors.ts`
- `src/lib/queries/query-keys.ts`
- `src/features/employee/balance-summary.tsx`
- `src/components/common/app-shell.tsx`

Files deleted:

- None.

Key decisions and trade-offs:

- Kept the implementation aligned with Effort 2's route-handler plus TanStack Query structure.
- Added `hcm-service.ts` as the request workflow boundary while reusing the existing in-memory state store.
- Added `GET /api/hcm/requests?employeeId=...` alongside the required POST so the employee timeline can hydrate from product-facing request data.

Deviations:

- No material deviations.
- The extra request GET route supports the requested query hook and employee timeline.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed with 8 files / 14 tests.
- `npm run build` passed.
- Dev server was already running at `http://localhost:3000`.
- HTTP smoke check passed:
  - home returned 200 with `Request PTO`
  - valid POST created `submitted_pending_manager` and reserved 1.5 pending days
  - invalid `0.25` returned 400
  - over-balance returned 409
- Mock HCM state was reset afterward.
