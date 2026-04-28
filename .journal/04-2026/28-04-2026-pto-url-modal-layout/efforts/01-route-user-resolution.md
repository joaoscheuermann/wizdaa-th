---
status: done
order: 1
created: 2026-04-28 16:14
title: "Route User Resolution"
---

## Description

Replace the role-switcher entry path with route-driven seeded user loading. This effort adds the product user lookup contract, the `/:id` dynamic route, default route redirect/fallback behavior, and an invalid-user state without changing the employee or manager workflows beyond how the active user is selected.

## Objective

Opening `/emp-avery`, `/emp-jordan`, or `/mgr-morgan` loads a route-scoped workspace shell for that seeded user, while an unknown `/:id` shows a clear invalid-user state.

## Implementation Details

- Add `GET /api/hcm/users/[userId]` using existing HCM state and `DemoUser`.
- Add server helper code under `src/server/hcm/user-api.ts`.
- Add browser client/query helpers in `src/lib/hcm-client/client.ts`, `src/lib/queries/user-queries.ts`, and `src/lib/queries/query-keys.ts`.
- Add `src/app/[id]/page.tsx` using Next 16 asynchronous route params.
- Convert `src/app/page.tsx` to redirect or otherwise route users to a default seeded user.
- Refactor `src/components/common/app-shell.tsx` so it receives or resolves an active route user and removes the Employee/Manager tab switcher.
- Preserve existing employee and manager panels initially so this slice stays focused on route identity.

## Verification Criteria

- Run `npm run typecheck`, `npm run lint`, and `npm run test`.
- Run the app and observe `/emp-avery` renders the employee workspace, `/mgr-morgan` renders the manager-capable workspace shell, and an unknown route such as `/not-a-user` shows the invalid-user state.
- Update or add component tests for user lookup success, unknown user, and removal of role-tab switching assumptions.

## Done

- Seeded users load through `/:id`.
- Product UI no longer depends on an in-app role switcher.
- Unknown user IDs are visibly handled.
- The human can run the app and verify seeded route behavior in the browser.

## Change Summary

Implemented Effort 1 only.

Files created:

- `src/app/[id]/page.tsx`
- `src/app/api/hcm/users/[userId]/route.ts`
- `src/lib/queries/user-queries.ts`
- `src/server/hcm/user-api.ts`
- `src/server/hcm/user-api.test.ts`

Files modified:

- `src/app/page.tsx`
- `src/components/common/app-shell.tsx`
- `src/components/common/app-shell.test.tsx`
- `src/domain/time-off/types.ts`
- `src/lib/hcm-client/client.ts`
- `src/lib/hcm-client/client.test.ts`
- `src/lib/queries/query-keys.ts`
- `src/test/hcm-fixture-fetch.ts`

Files deleted:

- None.

Key decisions and trade-offs:

- `AppShell` now takes `routeUserId`, resolves it through the new browser query helper, and renders employee or manager panels from the seeded user role.
- `/` redirects to `/emp-avery` via `DEFAULT_EMPLOYEE_ID`.
- Unknown users remain a visible in-app invalid state instead of a Next `notFound()`, matching the effort's clear invalid-user state requirement.
- The existing employee selector inside the employee panel is preserved, but its initial active user is the route user.

Deviations from Implementation Details:

- None from the requested Effort 1 scope.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed after fixing a React hooks lint issue.
- `npm run test`: passed, 12 test files and 53 tests.
- Playwright smoke check against existing dev server at `http://127.0.0.1:3000`: `/` redirects to `/emp-avery`, `/emp-avery` renders employee workspace, `/mgr-morgan` renders manager workspace, `/not-a-user` renders invalid-user state, and no role tablist is present.
