---
status: done
order: 4
created: 2026-04-28 16:14
title: "Manager Layout Decision Modal"
---

## Description

Replace the current manager side-by-side queue and decision panel with the TRD's manager workspace: an all-employee balances column occupying about 60% of desktop width, a Manager Workspace column for pending requests, independent column scrolling, and a decision modal that reuses the current manager decision behavior.

## Objective

Opening `/mgr-morgan` shows all employee balances next to pending manager requests. Clicking a pending request opens a modal containing the manager decision fields and actions.

## Implementation Details

- Add `src/features/manager/all-employee-balances-table.tsx`.
- Add `src/features/manager/manager-workspace.tsx`.
- Add `src/features/manager/manager-decision-modal.tsx`.
- Reuse `ManagerDecisionPanel` inside the modal; add a light render variant only if needed to avoid awkward nested card presentation.
- Change `PendingRequestQueue` from auto-select-first behavior to explicit row-click modal open behavior for product usage.
- Implement desktop layout with approximately 60/40 columns, bounded height, and independent `overflow-y-auto` behavior.
- Preserve narrow viewport stacking without horizontal overflow.

## Verification Criteria

- Run `npm run typecheck`, `npm run lint`, and `npm run test`.
- Add or update component tests for clicking a pending request and seeing the decision modal.
- Add or update Storybook states for manager queue and decision modal behavior.
- Run the app at `/mgr-morgan`, observe the 60/40 desktop layout, independently scroll long columns, click a pending request, and approve or deny from the modal.

## Done

- Manager view uses the requested balance table plus Manager Workspace layout.
- Pending request details open in a modal.
- Existing approval, denial, retry, and reconfirmation behavior remains reused.
- The human can run `/mgr-morgan` and make a manager decision from the modal.

## Change Summary

Implemented Effort 4 only.

Files created:

- `src/features/manager/all-employee-balances-table.tsx`
- `src/features/manager/all-employee-balances-table.stories.tsx`
- `src/features/manager/manager-workspace.tsx`
- `src/features/manager/manager-workspace.stories.tsx`
- `src/features/manager/manager-decision-modal.tsx`
- `src/features/manager/manager-decision-modal.stories.tsx`

Files modified:

- `src/components/common/app-shell.tsx`
- `src/components/common/app-shell.test.tsx`
- `src/features/manager/pending-request-queue.tsx`
- `src/features/manager/pending-request-queue.stories.tsx`
- `src/features/manager/manager-decision-panel.tsx`
- `src/features/manager/manager-workflow.test.tsx`

Files deleted:

- None.

Key decisions and trade-offs:

- `ManagerWorkspace` now owns selected-request modal state; `PendingRequestQueue` no longer auto-selects the first request.
- `ManagerDecisionPanel` has a `variant="modal"` mode to reuse decision behavior without nesting a full card inside the dialog.
- The manager route keeps the manager self-service section below the new manager workspace, matching the TRD route-user requirement.
- All-employee freshness uses the batch `fetchedAt` timestamp instead of `Date.now()` during render to satisfy React purity linting.

Deviations from Implementation Details:

- No functional deviations from Effort 4.
- Playwright was used directly for browser verification because the Codex in-app browser backend was unavailable.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed after fixing the render-time `Date.now()` purity issue.
- `npm run test`: passed, 14 files / 64 tests.
- `npm run test:storybook`: passed, 11 files / 36 tests after fixing story portal targeting.
- Browser check at `http://localhost:3000/mgr-morgan`: confirmed desktop columns at about 60/40 with `overflow-y: auto`, mobile width without page horizontal overflow, and pending request click opens the modal and can deny successfully.
