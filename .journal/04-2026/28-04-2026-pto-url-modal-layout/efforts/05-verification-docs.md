---
status: done
order: 5
created: 2026-04-28 16:14
title: "Verification Docs"
---

## Description

Update end-to-end coverage, Storybook coverage, and README guidance for the new route/table/modal workflows. This effort consolidates verification after the product slices are in place.

## Objective

Automated and reviewer-facing documentation prove the updated TRD flows: seeded URL loading, scoped employee data, requested PTO table and modal, manager 60/40 layout, independent scrolling, and manager decision modal.

## Implementation Details

- Update Playwright tests to start at `/emp-avery` and `/mgr-morgan` instead of `/` plus role tabs.
- Add E2E checks for request modal submission and manager decision modal approval.
- Update Storybook interaction tests for `RequestedPtoTable`, `RequestPtoModal`, and manager modal flows.
- Update `README.md` with seeded route URLs, invalid-user behavior, and revised app smoke workflow.
- Run and document the full verification command set.

## Verification Criteria

- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run test`.
- Run `npm run test:storybook`.
- Run `npm run test:e2e`.
- Run `npm run build`.
- Run the app and manually observe `/emp-avery`, `/emp-jordan`, `/mgr-morgan`, and an invalid route.

## Done

- Tests and Storybook reflect the updated product behavior.
- README tells reviewers how to open and exercise the seeded routes.
- The human can run the documented commands and manually verify the new usability flows.

## Change Summary

Files created:

- None.

Files modified:

- `README.md`
- `tests/e2e/time-off.spec.ts`
- `src/features/employee/requested-pto-table.stories.tsx`
- `src/features/employee/request-pto-modal.stories.tsx`
- `src/features/manager/manager-decision-modal.stories.tsx`
- `src/features/manager/manager-workspace.stories.tsx`

Files deleted:

- None. Generated `playwright-report/` and `test-results/` artifacts from the verification run were removed.

Key decisions and trade-offs:

- Updated E2E to use `/emp-avery` and `/mgr-morgan` directly, with no role-tab assumptions.
- Covered request creation through the `Request PTO` modal and manager approval through the decision modal.
- Made the approval E2E tolerate optional HCM reconfirmation, because that depends on live balance freshness during the flow.
- Storybook modal tests target the latest open portaled dialog to avoid stale dialog nodes between stories.

Deviations from Implementation Details:

- None from Effort 5 implementation details.
- No product behavior changes or journal edits were made by the developer.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 14 files / 64 tests.
- `npm run test:storybook`: passed after fixing story interaction robustness, 11 files / 40 tests.
- `npm run test:e2e`: passed after stopping an already-running same-repo `next dev` process, 2 tests.
- `npm run build`: passed.
- Manual route smoke: started app on `127.0.0.1:3000`, reset HCM state, observed `/emp-avery`, `/emp-jordan`, `/mgr-morgan`, and `/not-a-seeded-user`; stopped the dev server afterward.
