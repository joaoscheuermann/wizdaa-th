---
status: done
order: 2
created: 2026-04-28 16:14
title: "Requested PTO Table Modal"
---

## Description

Add the employee self-service requested PTO table and move Request PTO creation behind an icon-only `+` button that opens a shadcn Dialog modal. This effort reuses the existing `RequestForm` behavior rather than duplicating request submission logic.

## Objective

An employee route shows a scoped requested PTO table. Clicking the `+` button opens a modal containing the current Request PTO form, and successful submission updates the table.

## Implementation Details

- Add `src/components/ui/dialog.tsx` using the shadcn Dialog component pattern from `https://ui.shadcn.com/docs/components/dialog`.
- Add `src/features/employee/requested-pto-table.tsx`.
- Add `src/features/employee/request-pto-modal.tsx`.
- Refactor `RequestForm` to support an optional success callback while preserving existing validation, optimistic mutation, rollback, and retry behavior.
- Replace the primary shell usage of `RequestTimeline` and always-visible `RequestForm` with `RequestedPtoTable` plus modal flow.
- Keep employee requests scoped to the active route user via `useEmployeeRequestsQuery(activeUser.id)`.
- Retain or adapt existing request timeline stories/tests only if they remain useful; do not keep duplicate primary product surfaces.

## Verification Criteria

- Run `npm run typecheck`, `npm run lint`, and `npm run test`.
- Add or update Storybook stories for `RequestedPtoTable/Loading`, `RequestedPtoTable/Empty`, `RequestedPtoTable/WithRequests`, `RequestedPtoTable/Error`, and `RequestPtoModal/OpenDraft`.
- Run the app at `/emp-avery`, observe the requested PTO table, click the `+` button, submit a request from the modal, and observe the new request in the table.
- Verify closing the modal without submission does not create a draft request.

## Done

- Requested PTOs are table-based in the employee workspace.
- The Request PTO panel behavior is accessible only through the modal create action in the primary product flow.
- The human can run the app and create a PTO request from the `+` modal.

## Change Summary

Files created:

- `src/components/ui/dialog.tsx`
- `src/features/employee/requested-pto-table.tsx`
- `src/features/employee/request-pto-modal.tsx`
- `src/features/employee/requested-pto-table.test.tsx`
- `src/features/employee/request-pto-modal.test.tsx`
- `src/features/employee/requested-pto-table.stories.tsx`
- `src/features/employee/request-pto-modal.stories.tsx`

Files modified:

- `src/components/common/app-shell.tsx`
- `src/components/common/app-shell.test.tsx`
- `src/features/employee/request-form.tsx`
- `src/features/employee/request-form.test.tsx`
- `src/features/employee/request-form.stories.tsx`
- `src/test/hcm-fixture-fetch.ts`
- `.storybook/preview.tsx`
- `vitest.storybook.config.ts`

Files deleted:

- None.

Key decisions and trade-offs:

- Used the shadcn Base UI dialog pattern because the repo already uses `@base-ui/react`; no Radix dependency was added.
- Kept `RequestForm` behavior intact and added only `onSubmitSuccess`, so validation, optimistic mutation, rollback, and retry still live in the existing form/mutation flow.
- Scoped requested PTO table and modal submissions to `routeUser.id`; broader employee/balance selector scoping is left for Effort 3.
- Removed `RequestForm` and `RequestTimeline` from the primary employee shell. The legacy timeline files remain because they still have isolated tests/stories and are no longer the product surface.

Deviations from Implementation Details:

- None from Effort 2 implementation details.
- Minor supporting config change: added `@base-ui/react/dialog` to Storybook Vitest `optimizeDeps.include` after the first Storybook test run reloaded mid-test.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 14 files / 60 tests.
- `npm run test:storybook`: passed after config fix, 8 files / 27 tests.
- Browser smoke against existing dev server at `http://127.0.0.1:3000/emp-avery`: passed. Verified table is visible, the always-visible submit form is gone, closing modal creates no request, and submitting from the `+` modal adds the New York HQ request to the table.
