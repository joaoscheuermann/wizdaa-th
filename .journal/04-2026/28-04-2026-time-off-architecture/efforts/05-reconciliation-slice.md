---
status: done
order: 5
created: 2026-04-28 13:22
title: "Reconciliation Slice"
---

## Description

Add balance freshness, stale-state treatment, background reconciliation, and mid-session balance-change handling. This effort uses the state API to simulate HCM changes such as an anniversary bonus by patching balance state, then proves the UI updates without erasing in-flight user work.

## Objective

After this effort, a reviewer can patch `/api/hcm/state` to change a balance while the app is open and observe the UI mark data as refreshing/stale, reconcile the updated balance, and show a clear refreshed-balance message.

## Implementation Details

- Complete `src/domain/time-off/freshness.ts` with 30-second stale threshold logic.
- Configure balance batch queries with visible-app refetch behavior and `30_000` ms reconciliation interval.
- Add targeted per-cell refetch helper before submit and approval if not already centralized.
- Add `BalanceFreshnessIndicator` and `ReconciliationBanner` in `src/components/common`.
- Ensure balance rows keep previous values visible during refresh.
- When `/api/hcm/state` patches a balance version/available days, reconciliation compares `version`, `availableDays`, and `pendingDays` and updates query cache appropriately.
- Preserve request form inputs and in-flight mutation state when background refreshes arrive.
- Add focused tests for freshness threshold calculation, refresh-failed state, background balance update handling, and preservation of form/in-flight state during reconciliation.
- Add README example for triggering an anniversary bonus by patching balance state.

## Verification Criteria

- Run `npm run dev`, open the employee balance view, wait past 30 seconds, and observe stale/freshness treatment.
- Patch `/api/hcm/state` to add days to a selected balance, wait for or trigger refetch, and observe the balance update plus refreshed-balance message.
- Keep a request form open while patching the selected balance and observe that form input remains while balance context updates.
- Start a request action, patch balance state during the pending window, and observe the pending action remains visible.
- Run `npm run test` and observe freshness and reconciliation behavior tests pass.
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Done

- Balances visibly transition through fresh, stale, refreshing, refreshed, and refresh-failed states.
- State API balance patches can simulate external HCM changes.
- Background reconciliation updates balances without clearing visible content or in-flight user actions.
- Automated tests prove stale/fresh threshold behavior and reconciliation state preservation.
- README documents the state API command for simulating anniversary bonus behavior.

## Change Summary

Implemented Effort 5 only.

Files created:

- `src/domain/time-off/reconciliation.ts`
- `src/domain/time-off/freshness.test.ts`
- `src/components/common/balance-freshness-indicator.tsx`
- `src/components/common/reconciliation-banner.tsx`

Files modified:

- `README.md`
- `src/domain/time-off/types.ts`
- `src/domain/time-off/freshness.ts`
- `src/lib/queries/query-keys.ts`
- `src/lib/queries/query-client-provider.tsx`
- `src/lib/queries/balance-queries.ts`
- `src/lib/queries/request-mutations.ts`
- `src/features/employee/balance-summary.tsx`
- `src/features/employee/request-form.tsx`
- `src/features/manager/manager-decision-panel.tsx`
- `src/server/hcm/state-store.ts`
- `src/features/employee/balance-summary.test.tsx`
- `src/features/employee/request-form.test.tsx`
- `src/server/hcm/state-api.test.ts`

Files deleted:

- None.

Key decisions and trade-offs:

- Kept freshness and reconciliation comparisons as pure domain helpers.
- Moved in-flight optimistic pending preservation into the batch fetch reconciliation path, not global structural sharing, so explicit rollback snapshots restore exactly.
- Added a targeted per-cell refetch helper and used it before employee submit and manager approval.
- Made `/api/hcm/state` balance patches merge by balance identity so README can show a one-cell anniversary bonus patch without replacing all balances.

Deviations:

- No material deviations from Effort 5.
- The state API merge behavior is a supporting implementation of the requested balance version/available-days patch workflow.

Verification:

- `npm run typecheck` passed.
- `npm run test` passed with 9 files / 29 tests.
- `npm run lint` passed.
- `npm run build` passed.
- Dev smoke used the already-running local server on `http://127.0.0.1:3000`:
  - home returned 200
  - state patch changed Avery/New York from 24 to 29 available days with version 2
  - state was reset afterward
- Separate tester delegation was not available as a callable tool, so tester workflow checks were run directly.
