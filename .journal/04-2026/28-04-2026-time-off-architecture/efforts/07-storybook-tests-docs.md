---
status: done
order: 7
created: 2026-04-28 13:22
title: "Storybook Tests Docs"
---

## Description

Complete the reviewer-facing proof layer: Storybook stories for the required state matrix, Storybook interaction tests, e2e smoke tests, coverage summary, and README instructions for app, Storybook, tests, and state API setup. Earlier efforts already add focused tests for their slices; this effort fills remaining proof gaps and makes the evidence easy for reviewers to run.

## Objective

After this effort, a reviewer can run Storybook locally, inspect every meaningful UI state from the TRD, run the complete automated suite, and follow README commands to reproduce state API scenarios.

## Implementation Details

- Add Storybook configuration under `.storybook` using the Next/React setup appropriate for this project.
- Add MSW or fixture-based Storybook setup so stories are isolated from live route-handler state.
- Add required stories for `BalanceSummary`, `RequestForm`, `RequestTimeline`, `ManagerQueue`, `ManagerDecisionPanel`, and `ReconciliationBanner`, including conflict/error/retryable states such as `BalanceSummary/Conflict`, `ManagerQueue/Error`, `RequestTimeline/SyncFailedRetryable`, and `ManagerDecisionPanel/DenialRetryableFailure`.
- Add Storybook interaction tests for employee submit, optimistic pending, rollback, retry after silent failure, manager approval, and manager denial.
- Add any missing component/unit/integration tests not already covered by earlier efforts, especially accessibility expectations for forms, tables, alerts, and dialogs.
- Add Playwright e2e smoke tests for one happy path and one unhappy path.
- Update `package.json` scripts for `test`, `test:storybook`, `test:e2e`, and coverage/report commands chosen by the implementation.
- Update README with setup, app run, Storybook run, test commands, state API examples, and coverage summary guidance.

## Verification Criteria

- Run `npm run storybook` and observe locally runnable Storybook with the required state matrix.
- Run `npm run test:storybook`.
- Run `npm run test`.
- Run `npm run test:e2e`.
- Run `npm run lint`, `npm run typecheck`, and `npm run build`.
- Follow README state API examples to reset state, patch a scenario mode, patch a balance for anniversary bonus, and inspect current state.

## Done

- Storybook contains all required states from the TRD.
- Storybook interaction tests cover the required workflows.
- Component, integration, and e2e tests cover the required HCM scenarios and state transitions.
- README gives a reviewer one-command paths for app, Storybook, tests, and state API scenario setup.
- Coverage proof is summarized without requiring an arbitrary percentage gate.

## Change Summary

### Files Created

- `.storybook/main.ts`
- `.storybook/preview.tsx`
- `vitest.storybook.config.ts`
- `playwright.config.ts`
- `tests/e2e/time-off.spec.ts`
- Story files for `BalanceSummary`, `RequestForm`, `RequestTimeline`, `ManagerQueue`, `ManagerDecisionPanel`, and `ReconciliationBanner`
- `src/test/hcm-fixture-fetch.ts`
- `src/test/time-off-fixtures.ts`
- `src/features/manager/manager-workflow.test.tsx`

### Files Modified

- `package.json`
- `package-lock.json`
- `README.md`
- `vitest.config.mts`
- `src/features/manager/manager-decision-panel.tsx`

### Files Deleted

- None.

### Key Decisions / Trade-Offs

- Used Storybook's recommended `@storybook/nextjs-vite` setup and Vitest addon for interaction tests.
- Used fixture-backed `fetch` isolation instead of MSW. This keeps Storybook independent from live route-handler state while reusing existing HCM service and state logic.
- Put Playwright on port `3100`; Next dev enforces one dev server per workspace, so the developer stopped an existing local dev process so e2e could start a fresh server.
- Fixed a discovered UI issue: manager decision success status now remains renderable when the decided request leaves the pending queue.

### Deviations

- No functional deviations from the effort scope.
- For `npm run storybook`, the developer verified local startup by launching Storybook in the background, polling `http://127.0.0.1:6006`, then stopping it rather than leaving it running.

### Verification

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed: 47 tests.
- `npm run test:storybook` passed: 22 Storybook tests.
- `npm run test:e2e` passed: 2 Playwright tests.
- `npm run build` passed.
- `npm run build-storybook` passed.
- `npm run storybook` started successfully on port 6006 and returned HTTP 200.
- `npm run test:coverage` passed; summary reported 87.38% statements, 73.21% branches, 94.94% functions, and 89.69% lines.
- `npm install` reported Node engine warnings for current Node `v23.1.0`, and `npm audit` reports 4 moderate vulnerabilities. All required commands passed.
