---
status: done
order: 3
created: 2026-04-28 16:14
title: "Employee Manager Scoping"
---

## Description

Tighten visible employee data around the active route user and add manager self-service access to the same requested PTO table. This effort removes the product employee selector and ensures manager self-service is distinct from all-employee manager visibility.

## Objective

Employee users can see only their own balances and PTO requests. Manager users can access manager workflows and their own requested PTO table, but that self-service table is scoped to the manager's own employee record.

## Implementation Details

- Refactor `BalanceSummary` to support route-scoped employee display without rendering the current employee selector in product usage.
- Add empty/no-balance handling for manager self-service if the seed has no manager balance rows.
- Decide during implementation whether to add manager-owned balance rows to `src/server/hcm/seed/default-state.json` for a fully demonstrable manager Request PTO flow; keep it fixture-only if added.
- Ensure query keys for employee requests include active user IDs and that route changes reset modal/form state.
- Add tests proving `/emp-avery` does not render Jordan's balances or requests, and manager self-service does not show all managed employee requests.

## Verification Criteria

- Run `npm run typecheck`, `npm run lint`, and `npm run test`.
- Run the app at `/emp-avery` and `/emp-jordan`, observing that each route shows only the active user's balances and requested PTOs.
- Run the app at `/mgr-morgan`, observing manager workflows plus a self-service requested PTO table scoped to Morgan.
- Confirm the employee selector is absent from the primary product route UI.

## Done

- Route identity is the only product mechanism for choosing an employee workspace.
- Employee balance and request visibility is scoped to the active user.
- Manager self-service uses the same requested PTO table contract.
- The human can run seeded routes and observe scoped data behavior.

## Change Summary

Files modified:

- `src/components/common/app-shell.tsx`
- `src/features/employee/balance-summary.tsx`
- `src/features/employee/request-pto-modal.tsx`
- `src/server/hcm/seed/default-state.json`
- `src/components/common/app-shell.test.tsx`
- `src/features/employee/balance-summary.test.tsx`
- `src/features/employee/requested-pto-table.test.tsx`
- `src/server/hcm/balance-api.test.ts`
- Related story/test prop updates.

Files created:

- None.

Files deleted:

- None.

Key decisions and trade-offs:

- `BalanceSummary` now requires a route `employeeId`, filters displayed balances to that employee, removes the employee selector, and scopes reconciliation notices to the active employee.
- Manager route keeps manager workflow visible and adds Morgan's self-service balances/requested PTO table using `mgr-morgan`.
- Added fixture-only Morgan balance rows so manager self-service Request PTO is usable. No Morgan requests were seeded, so the self-service table still proves it does not show managed employees' requests.
- Kept existing employee request query key contract because it already includes `employeeId`.

Deviations from Implementation Details:

- No Effort 4 manager layout/decision-modal work was implemented.
- Route checks used the already-running dev server at `http://127.0.0.1:3000`; Next blocked starting a second dev server for the same workspace.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 14 test files / 63 tests.
- Playwright route check against `/emp-avery`, `/emp-jordan`, `/mgr-morgan`: passed. Confirmed no employee selector, employee route scoping, and Morgan self-service table showing `0 total` while manager queue still shows managed pending work.
