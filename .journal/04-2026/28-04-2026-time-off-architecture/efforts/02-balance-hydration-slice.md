---
status: done
order: 2
created: 2026-04-28 13:22
title: "Balance Hydration Slice"
---

## Description

Add the first real vertical data slice: deterministic mock HCM state, the state API, product balance read/write endpoints, typed HCM client calls, TanStack Query balance hydration, and an employee balance view. This effort turns the shell into a data-backed experience without request submission yet.

## Objective

After this effort, a reviewer can reset or inspect mock HCM state through `/api/hcm/state`, open the app, and see seeded employee/location PTO balances loaded through the product-facing mock HCM balance endpoint.

## Implementation Details

- Add `src/domain/time-off/types.ts`, `schemas.ts`, `freshness.ts`, and supporting constants needed for balance cells, demo users, locations, and scenario state.
- Add `src/server/hcm/seed/default-state.json` with at least two employees, one manager, two to three locations, one pending request placeholder, and one low-balance employee/location combination.
- Add `src/server/hcm/state-store.ts` for in-memory state initialized from the JSON seed.
- Add `src/server/hcm/state-api.ts` for `GET`, `POST`, `PATCH`, and `DELETE` state operations.
- Add route handler `src/app/api/hcm/state/route.ts` with no auth.
- Add product balance route handlers for `GET /api/hcm/balances/batch`, `GET /api/hcm/balances?employeeId=...&locationId=...`, and `PATCH /api/hcm/balances`.
- Implement the per-cell balance write contract so integration tests can prove HCM's real-time write behavior independently from request submission and approval.
- Add `src/lib/hcm-client/client.ts`, `errors.ts`, `src/lib/queries/query-keys.ts`, and `src/lib/queries/balance-queries.ts`.
- Replace the employee placeholder with a `BalanceSummary` view showing seeded per-location balances, freshness metadata, loading, empty, and error states.
- Add focused tests for state API reset/get behavior, product balance batch/per-cell read/write endpoints, and `BalanceSummary` rendering for seeded balances.
- Document basic state API curl examples in `README.md`.

## Verification Criteria

- Run `npm run dev`, open the app, select an employee, and observe seeded balances grouped by location.
- Call `GET /api/hcm/state` and observe the full state JSON.
- Call `DELETE /api/hcm/state`, refresh the app, and observe balances return to the default seed.
- Call `GET /api/hcm/balances/batch` and observe the product-facing balance corpus.
- Call `PATCH /api/hcm/balances` for a seeded employee/location, then call `GET /api/hcm/balances?employeeId=...&locationId=...` and observe the updated authoritative balance cell.
- Run `npm run test` and observe state API, balance endpoint, and `BalanceSummary` tests pass.
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Done

- Employee balances are loaded from mock HCM product endpoints, not hardcoded UI fixtures.
- The mock HCM exposes both real-time per-cell balance read and write product endpoints.
- The state API can inspect, replace, patch, and reset in-memory mock HCM state.
- Automated tests prove state API reset/get behavior and balance endpoint read/write behavior.
- README includes enough state API examples for a reviewer to inspect/reset state manually.
- The app visibly renders seeded per-location balances.

## Change Summary

Implemented Effort 2 only.

Files created:

- `src/domain/time-off/types.ts`
- `src/domain/time-off/schemas.ts`
- `src/domain/time-off/freshness.ts`
- `src/server/hcm/seed/default-state.json`
- `src/server/hcm/state-store.ts`
- `src/server/hcm/state-api.ts`
- `src/server/hcm/balance-api.ts`
- API routes under `src/app/api/hcm/...`
- HCM client/query files
- `src/features/employee/balance-summary.tsx`
- Balance/state route tests
- `src/test/render-with-query-client.tsx`

Files modified:

- `README.md`
- `src/domain/time-off/constants.ts`
- `src/components/common/app-shell.tsx`
- `src/components/common/app-shell.test.tsx`

Files deleted:

- None.

Key decisions and trade-offs:

- Kept mock HCM in memory from a deterministic JSON seed.
- Product UI calls only product balance endpoints through the typed HCM client and TanStack Query.
- `/api/hcm/state` remains reserved for tests and documentation-driven setup.
- Used lightweight schema guards in `schemas.ts` instead of introducing another validation dependency.

Deviations:

- Added `src/server/hcm/balance-api.ts` and `src/test/render-with-query-client.tsx` as support files to keep route handlers and tests thin.
- No functional deviation from effort details.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed with 4 files / 5 tests.
- `npm run build` passed.
- HTTP verification passed against the existing `localhost:3000` dev server:
  - home returned 200
  - state GET returned 3 employees
  - DELETE reset first balance to 24
  - batch returned 5 balances
  - PATCH/read per-cell returned effective balance 5.5
- State was reset afterward.
- Employee selection behavior is covered by the `BalanceSummary` component test.
