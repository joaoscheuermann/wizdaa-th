# ExampleHR Time-Off Frontend TRD

## 1. Purpose

Build a frontend application for ExampleHR employees and managers to view per-location time-off balances and manage time-off requests while staying honest that the Human Capital Management system, not ExampleHR, owns the authoritative balance data.

The application must feel responsive, but it must never tell a user that a request is finally approved before the HCM has confirmed that the balance and request are valid.

## 2. Primary Deliverables

- A well-written Technical Requirement Document, this file.
- A Next.js App Router application implementing the employee and manager workflows.
- A mock HCM layer implemented as Next.js route handlers.
- A Storybook with stories and interaction tests covering every meaningful UI state.
- Component, integration, and Storybook test cases with visible proof of coverage.
- A locally runnable Storybook available with a single command.
- A GitHub repository containing code, tests, and instructions.

## 3. Product Context

ExampleHR provides the employee-facing and manager-facing time-off experience. The external HCM system is the source of truth for balances and can mutate balances outside ExampleHR. ExampleHR must therefore treat local balance data as a snapshot, not as final truth.

HCM exposes:

- A real-time per-cell read/write API for a single employee/location balance.
- An expensive batch corpus endpoint suitable for initial hydration and periodic reconciliation.
- Errors for invalid dimensions and insufficient balance, although errors are not guaranteed.
- Occasional silent wrong success responses that later contradict the actual source of truth.

Balances are scoped per employee and per location. A single employee can have several balance rows.

## 4. Personas

### Employee

The employee wants to see current balances, understand whether a balance may be stale, submit a time-off request quickly, and receive immediate but truthful feedback.

The employee must never see final "Approved" feedback before the HCM has confirmed the result.

### Manager

The manager wants to review pending time-off requests with enough balance context to make a confident decision. The balance shown at decision time must be freshly verified, not merely a previously loaded snapshot.

## 5. Component Library Constraint

Use shadcn/ui as the component library.

The implementation should initialize shadcn/ui for the existing Next.js project and use shadcn primitives for the main interface surfaces, including buttons, cards or panels, tables, dialogs, forms, inputs, selects, badges, alerts, skeletons, tabs, toasts or sonners, and tooltips where appropriate.

The UI must remain functional and accessible if custom styling is minimal. Visual polish should come from consistent use of shadcn/ui components, layout, spacing, status badges, and clear state treatment.

## 6. Functional Scope

### In Scope

- Employee balance view with one row per employee/location balance.
- Employee request form with location selection, date range, requested days, and optional note.
- Immediate request feedback that distinguishes local pending state from final HCM-confirmed state.
- Manager pending request list.
- Manager request detail/review view with balance context visible.
- Manager approve and deny actions.
- Fresh balance verification before manager approval.
- Background reconciliation of balances against HCM.
- Conflict handling when HCM returns a rejection or later contradicts an earlier success.
- Mock HCM behavior simulation for real-time reads/writes, batch hydration, anniversary bonus, conflict responses, insufficient balance responses, invalid dimension responses, slow responses, silent wrong successes, and silent/no-response paths.
- Lightweight HCM state API for deterministic test and README-driven mock backend setup.
- Storybook stories and interaction tests for all states listed in this TRD, isolated with fixtures/MSW.
- Integration tests against the mock HCM layer.

### Out of Scope

- Real authentication and production authorization.
- Real HCM integration.
- Payroll, accrual policy configuration, holidays, half-day regional rules, or manager delegation.
- Calendar integrations.
- Email, Slack, or push notifications.
- Multi-tenant administration.

## 7. Decisions and Assumptions

- The app will use seeded demo users, locations, and a visible role switcher instead of real authentication. This keeps the take-home focused on the HCM source-of-truth problem, request lifecycle, reconciliation, and test rigor instead of production identity concerns.
- Requested time-off duration will be manually entered as days. The app will still collect start and end dates and validate that the date range is coherent, but it will not calculate business days from weekends, holidays, half-days, regional calendars, or work schedules. This is important because calendar-aware duration calculation is a separate product domain that would obscure the assignment's core balance-consistency problem.
- Requested days will support `0.5` day increments, with a minimum of `0.5` days and a maximum of the selected balance's effective available days at validation time. This gives the demo realistic partial-day behavior without introducing calendar policy complexity.
- Date fields will be treated as local calendar dates in one fixed demo timezone. The date range is inclusive of start and end dates for display purposes, but duration is still controlled by the manually entered requested days. The implementation will not model timezone conversion because timezone correctness is outside the take-home focus and would add unnecessary complexity for the HCM consistency problem being evaluated.
- Balances become stale after 30 seconds since the last authoritative verification. This threshold must be implemented as a named constant so it is easy to tune. A short threshold is important for the demo because reviewers can visibly exercise fresh, stale, and refreshed states without waiting several minutes.
- Background reconciliation will run every 30 seconds while the app is visible, with targeted per-cell reads before balance-consuming actions. This keeps the expensive batch endpoint from becoming the only correctness mechanism while still proving the app can reconcile mid-session HCM changes.
- HCM write operations will use a 5 second demo timeout. Write mutations must not perform repeated automatic retries; instead, the UI should preserve the failed action as retryable and let the user manually retry. This avoids duplicate request or approval effects while still demonstrating recoverability.
- On employee submission, HCM success reserves the requested days by increasing `pendingDays`. On manager approval, HCM converts the pending days into consumed balance. On manager denial or HCM rejection, HCM releases the pending days. This distinction is important because it makes the request lifecycle auditable and prevents pending requests from being confused with final balance consumption.
- Manager denial is an ExampleHR request-state transition and does not require HCM balance validation because it does not consume balance. The mock layer should still simulate denial failure or timeout so the UI demonstrates defensive retry behavior for manager actions.
- If manager approval verification returns a different balance than the one shown when the manager started the decision, but the updated balance is still sufficient, the UI must show the updated balance and ask the manager to confirm approval again. This prevents hidden mid-decision changes while still allowing approval to proceed deliberately.
- `conflict_needs_review` states must be user-visible and recoverable where safe, but final approval conflicts must not auto-resolve. A manager must re-review the request after a final approval conflict because approval is the irreversible user-facing state boundary.
- The manager queue will sort pending requests by oldest `createdAt` first. Advanced filtering and sorting are out of scope. This keeps review behavior predictable and testable without adding unrelated queue-management features.
- The initial implementation will use one default visible time-off type, "Paid Time Off". This is an explicit product assumption for the take-home scope, but the implementation must model time-off type as a field so additional types can be added without reshaping the request lifecycle.
- Mock HCM state will be stored in memory and seeded from JSON fixtures. The initial seed data must include at least two employees, one manager, two to three locations, one pending request, and one low-balance scenario. This keeps the app simple while making test and demo states repeatable through known seed data and reset behavior.
- HCM scenario and seed manipulation will be test-helper only through a state API. There will be no dev/demo UI panel and no dedicated demo-control route. README examples must show reviewers how to call the state API directly.
- The HCM state API is inspired by the concept of `packages/state-api-library`, but this take-home will not use that package or require Prisma. The app will implement a lightweight route-handler API over the in-memory mock HCM state.
- Anniversary bonus simulation will be represented as a state change through the HCM state API. There is no dev/demo button requirement. This keeps tests deterministic and avoids timer-driven flakiness while still proving the app can reconcile HCM changes that happen outside ExampleHR.
- Storybook will isolate UI states with fixtures/MSW instead of depending on the live route handlers for every story.
- Storybook delivery is local-only and must be runnable with a single command.
- Coverage proof will be provided through Vitest, Playwright, and Storybook test output plus a coverage summary in the README. Coverage should prove the required flows and HCM scenarios rather than chase an arbitrary line-percentage threshold.
- The implementation will use TypeScript. The existing Next.js app should be upgraded from JavaScript to TypeScript so request statuses, balance cells, HCM scenarios, mutation payloads, and Storybook fixtures are type-checked.
- Implementation should follow the vertical-slice approach: build one complete employee-to-manager happy path first, then add failure and reconciliation scenarios one at a time.

## 8. Core Product Rules

- HCM is the only authority for final balances.
- Batch balance data is useful for hydration but may be stale immediately after it is received.
- A real-time per-cell read is required before submitting an employee request and before manager approval.
- Optimistic UI is allowed for local responsiveness, but final labels must be truthful.
- Employee submission can become "Submitted, pending verification" immediately, but cannot become "Approved" until HCM and manager workflow confirm it.
- Manager approval must be pessimistic at the final state boundary: show "Approving" or "Approval pending HCM confirmation", then only show "Approved" after HCM confirms.
- If HCM contradicts an optimistic update, the UI must roll back visible balance changes and explain what changed.
- If HCM is slow, wrong, or silent, the UI must preserve the user action state and expose retry or refresh paths.
- When background reconciliation detects changed balances, the UI must update balances without erasing in-flight user actions.

## 9. Proposed Technical Approach

### Framework

Use Next.js App Router with TypeScript. The existing JavaScript app should be migrated to TypeScript so the state machine, HCM payloads, route-handler responses, and Storybook fixtures are checked consistently.

Implement mock HCM endpoints with route handlers under `src/app/api/...`. Route handlers must be dynamic and uncached for stateful mock behavior.

### Implementation Sequencing

Use a vertical-slice delivery plan. The first slice must prove the full happy path: employee sees balances, submits a PTO request, manager sees the pending request, manager approves, and the employee sees the confirmed result after HCM confirmation.

After the happy path works, add failure and reconciliation slices one at a time:

- Insufficient balance rejection.
- Invalid location or dimension rejection.
- Silent wrong success followed by reconciliation contradiction.
- Silent/no-response timeout with retry.
- Anniversary bonus mid-session.
- Background refresh during an in-flight user action.

Each slice must include UI behavior, mock HCM behavior, at least one automated test, and any relevant Storybook state.

### Data Fetching and State Management

Use TanStack Query for client server-state management because this assignment is centered on remote authority, optimistic mutations, cache invalidation, stale data, background reconciliation, and recoverable conflicts. TanStack Query gives explicit query keys, stale times, refetch intervals, mutation lifecycle hooks, optimistic updates, rollback snapshots, and integration-testable cache behavior.

Local component state should be limited to form inputs, active tabs, selected rows, and temporary UI controls. Server-derived balances and request lifecycle data should live in query/mutation state.

Write mutations should use manual retry rather than repeated automatic retries. This is especially important for request submission and manager approval, where duplicate writes could create confusing or invalid lifecycle states.

### UI Components

Use shadcn/ui components as the default building blocks:

- `Button` for commands.
- `Table` for balances and request queues.
- `Badge` for balance freshness and request lifecycle states.
- `Card` or section panels for focused content regions.
- `Dialog` or `Sheet` for manager review detail if the layout benefits from it.
- `Form`, `Input`, `Select`, `Textarea`, and validation messages for request entry.
- `Alert` for stale data, rejected requests, silent contradictions, and retryable failures.
- `Skeleton` for loading states.
- `Tabs` for employee and manager modes if implemented in one route.
- `Toast` or `Sonner` for transient reconciliation notices.
- `Tooltip` for compact freshness metadata such as "verified 12 seconds ago".

### Component Tree

The component tree should make data authority boundaries visible:

- `AppShell`
  - Owns high-level navigation between Employee and Manager views.
- `EmployeeTimeOffPage`
  - Fetches initial balances and request history.
  - Renders balance and request sections.
- `BalanceSummary`
  - Displays per-location balances and freshness states.
  - Does not own mutation behavior.
- `RequestForm`
  - Owns draft inputs.
  - Invokes request submission mutation.
  - Shows validation, pending, rejected, and retry states.
- `RequestTimeline`
  - Shows employee-facing lifecycle history.
- `ManagerReviewPage`
  - Fetches pending requests.
  - Renders queue and selected request detail.
- `PendingRequestQueue`
  - Displays pending requests and high-level status.
- `ManagerDecisionPanel`
  - Forces fresh per-cell balance verification before approval.
  - Invokes approve or deny mutation.
- `BalanceFreshnessIndicator`
  - Shared status display for fresh, refreshing, stale, conflict, and error states.
- `ReconciliationBanner`
  - Announces mid-session balance changes and contradictions.

This mapping separates display, form state, mutation boundaries, and reconciliation messages so Storybook can isolate each meaningful state.

## 10. Data Model Requirements

The implementation may choose exact TypeScript shapes, but it must represent these concepts.

### Balance Cell

- `employeeId`
- `employeeName`
- `locationId`
- `locationName`
- `availableDays`
- `pendingDays`
- `effectiveAvailableDays`
- `version`
- `lastVerifiedAt`
- `source`
- `freshnessStatus`: `loading`, `fresh`, `refreshing`, `stale`, `conflict`, or `error`

### Time-Off Request

- `requestId`
- `employeeId`
- `employeeName`
- `timeOffType`
- `locationId`
- `locationName`
- `requestedDays`
- `startDate`
- `endDate`
- `timezone`
- `note`
- `status`
- `createdAt`
- `updatedAt`
- `lastHcmVerificationAt`
- `balanceVersionAtSubmission`
- `balanceVersionAtDecision`
- `statusReason`
- `auditEvents`

### Request Statuses

- `draft`
- `submitting`
- `submitted_pending_hcm`
- `submitted_pending_manager`
- `rejected_by_hcm`
- `manager_reviewing`
- `approval_pending_hcm`
- `approved`
- `denied`
- `conflict_needs_review`
- `sync_failed_retryable`

## 11. Mock HCM Requirements

The mock HCM must behave like an unreliable external source of truth. It must maintain state independently from the UI cache.

Mock HCM state must be held in memory and initialized from JSON seed fixtures. The seed files should define employees, locations, balances, time-off types, and initial requests. This supports deterministic integration tests, repeatable Storybook scenarios, and quick reset to known states without introducing a production database that is outside the take-home scope.

The initial seed fixture must include:

- At least two employees.
- One manager.
- Two to three locations.
- At least one pending request.
- At least one low-balance employee/location combination that can trigger insufficient-balance behavior.

### Mock HCM Client Endpoints

- `GET /api/hcm/balances/batch`
  - Returns all seeded balances across employees and locations.
  - Used for initial hydration and periodic full reconciliation.
- `GET /api/hcm/balances?employeeId={id}&locationId={id}`
  - Returns one authoritative balance cell.
  - Used before submission and manager approval.
- `POST /api/hcm/requests`
  - Attempts to create a request against a balance cell.
  - Can succeed, reject for insufficient balance, reject for invalid dimensions, delay, silently fail, or return a wrong success based on scenario controls.
- `GET /api/hcm/requests?status=pending`
  - Returns manager queue data sorted by oldest pending request first.
- `PATCH /api/hcm/requests/{requestId}`
  - Applies manager decision.
  - Approval must verify current balance and consume balance only on confirmed success.
  - Denial changes only request state.

The application data-fetching layer should use these client endpoints as if they were the external HCM integration surface.

### Mock HCM State API

The state API is a test-helper surface for setting, patching, reading, and resetting the entire in-memory mock backend state. It exists so tests and reviewers can put the mock HCM into deterministic states without clicking through the product UI.

This API should use the same conceptual shape as a reusable state-management endpoint:

- `GET /api/hcm/state`
  - Returns the full current mock HCM state in the same JSON shape accepted by `POST`.
  - Supports optional table/entity filtering if simple to implement, such as `?entities=employees,balances`.
- `POST /api/hcm/state`
  - Replaces the full mock HCM state with the provided payload.
  - Used for deterministic E2E setup, reproducing edge cases, and resetting to named fixture states.
- `PATCH /api/hcm/state`
  - Partially updates the mock HCM state without wiping unrelated entities.
  - Used to trigger cases such as anniversary bonus, insufficient balance, changed balance version, silent wrong success mode, or conflict-on-approval mode.
- `DELETE /api/hcm/state`
  - Resets the in-memory mock HCM state to the default JSON seed fixture.

The state payload must include enough structure to control:

- Employees.
- Managers or role assignments.
- Locations.
- Time-off types.
- Balance cells.
- Requests.
- Scenario mode or per-operation failure modes.
- Audit events if relevant to the seeded scenario.

The state API must not be used by the product data-fetching layer. Product code should call the mock HCM client endpoints; tests and README examples may call the state API.

The state API does not require authentication. This is acceptable for the take-home because the app uses local in-memory mock state, has no production data, and prioritizes easy reviewer/test setup over endpoint protection.

### Scenario Modes

- `normal`
- `slow_read`
- `slow_write`
- `insufficient_balance`
- `invalid_dimension`
- `silent_wrong_success`
- `silent_no_response`
- `conflict_on_submit`
- `conflict_on_approval`
- `anniversary_bonus_mid_session`

Scenario behavior must be deterministic when tests set the scenario through `PATCH /api/hcm/state` or `POST /api/hcm/state`. Random behavior may exist for demos, but tests must not depend on randomness.

### Time-Off Types

The visible product scope includes only `Paid Time Off`. The mock data and request payloads must still include a `timeOffType` field so the implementation can support additional categories later without changing core request lifecycle behavior.

## 12. Reconciliation Strategy

### Initial Hydration

On page load, use the batch corpus endpoint to populate all visible employee/location balances and manager context. Mark loaded balances as `fresh` with `lastVerifiedAt` and `version`.

### Per-Cell Authority

Before any balance-consuming action, call the real-time per-cell read endpoint:

- Employee submission validates the selected employee/location balance immediately before creating a request.
- Manager approval validates the selected employee/location balance immediately before approval.

### Optimistic Employee Submission

When an employee submits a request:

1. Snapshot current query state.
2. Show request as `submitting`.
3. Optimistically reserve requested days by increasing `pendingDays` or showing a projected effective balance.
4. Label the state as pending, never final.
5. On HCM success, persist the pending-day reservation and transition to `submitted_pending_manager`.
6. On HCM rejection, roll back the optimistic balance reservation and show the rejection reason.
7. On timeout or silence, move to `sync_failed_retryable` and preserve a retry action.
8. On later contradiction, move to `conflict_needs_review`, roll back incorrect balance projections, and show a reconciliation message.

### Manager Approval

Manager approval should be pessimistic at the final-state boundary:

1. Manager clicks Approve.
2. UI immediately shows `approval_pending_hcm`.
3. The app fetches the authoritative current balance for the relevant employee/location.
4. If the current balance differs from the displayed decision-time balance but remains sufficient, the app shows the updated balance and requires the manager to confirm approval again.
5. If current balance is sufficient and the manager has confirmed the current balance context, the app sends approval to HCM.
6. Only after HCM confirms, pending days are converted into consumed balance and the request becomes `approved`.
7. If current balance is insufficient or HCM rejects, the request becomes `conflict_needs_review` or `rejected_by_hcm` with a clear explanation.
8. If HCM is silent, the request remains retryable and is not shown as approved.

### Manager Denial

Manager denial does not consume balance and does not require a fresh HCM balance read. On denial success, any pending-day reservation for that request is released and the request becomes `denied`. If denial fails or times out, the request remains pending or retryable and is not removed from the queue.

### Background Reconciliation

Run periodic reconciliation with the batch endpoint and targeted refetches:

- Periodically refetch the batch corpus while the app is visible.
- Refetch focused or selected balance cells more aggressively than the whole corpus.
- Compare returned `version`, `availableDays`, and `pendingDays` against local cache.
- If no user action is in flight, apply updates and show a concise refreshed-balance message.
- If a user action is in flight, keep the mutation intent visible, apply non-conflicting fields, and show that the balance changed while the action is pending.
- If a background refresh invalidates a form input, prevent submission until the user reviews the updated balance.
- If reconciliation finds a final approval conflict, the request must remain in `conflict_needs_review` until a manager re-reviews it.

## 13. User Stories and Acceptance Criteria

### Story 1: Employee Views Per-Location Balances

As an employee, I want to see all my time-off balances by location so that I know what I can request.

Acceptance criteria:

- Given the employee view is opened, when balances are loading, then skeleton rows are shown.
- Given the batch endpoint succeeds, when balances load, then each employee/location balance appears in a table or structured list.
- Given a balance row was loaded, when the user inspects it, then the row shows available days, pending days, effective available days, and freshness status.
- Given the batch endpoint fails, when the employee view renders, then the user sees a retryable error state.
- Given there are no balances, when the view renders, then an empty state explains that no location balances are available.

### Story 2: Employee Understands Balance Freshness

As an employee, I want to know whether a displayed balance is current so that I do not over-trust stale data.

Acceptance criteria:

- Given a balance was verified recently, when it is displayed, then it is marked fresh.
- Given a balance has exceeded the freshness threshold, when it is displayed, then it is marked stale.
- Given a background refresh is running, when the row remains visible, then the row shows a refreshing state without clearing the existing value.
- Given a refresh returns a different balance, when the UI updates, then the employee sees a non-disruptive message that the balance changed.
- Given a refresh fails, when the previous balance remains visible, then the row indicates that the displayed value may be stale.

### Story 3: Employee Submits a Request

As an employee, I want to submit a time-off request against a selected location so that my manager can review it.

Acceptance criteria:

- Given the employee has selected a location and valid date range, when they enter requested days within the visible effective balance, then the submit action is enabled.
- Given required fields are missing, when the employee attempts to submit, then field-level validation messages are shown.
- Given requested days are entered, when the value is less than `0.5`, not in `0.5` increments, or greater than effective available days, then validation prevents submission.
- Given start and end dates are entered, when the end date is before the start date, then validation prevents submission.
- Given the employee submits, when the app begins submission, then the UI shows a pending state immediately.
- Given the selected balance is stale, when the employee submits, then the app verifies the per-cell balance before sending the request.
- Given HCM accepts the request, when submission completes, then the request appears as pending manager review and requested days are reflected as pending days.

### Story 4: Employee Handles HCM Rejection

As an employee, I want clear feedback when HCM rejects my request so that I can correct the request.

Acceptance criteria:

- Given HCM rejects for insufficient balance, when the response returns, then the optimistic pending balance is rolled back.
- Given the rollback occurs, when the employee views the form, then the rejection message identifies insufficient balance.
- Given HCM rejects for invalid dimensions, when the response returns, then the selected location is marked invalid or unavailable.
- Given rejection occurs, when the employee edits the request, then they can submit a corrected request.

### Story 5: Employee Handles Silent or Wrong HCM Responses

As an employee, I want recoverable feedback when HCM behaves inconsistently so that I am not misled.

Acceptance criteria:

- Given HCM returns a success that later proves wrong, when reconciliation detects the contradiction, then the request becomes `conflict_needs_review`.
- Given a contradiction occurs, when the employee views the request, then the UI explains that HCM changed or contradicted the previous response.
- Given HCM does not respond, when the request times out, then the request becomes retryable and is not marked approved.
- Given a retry succeeds, when HCM confirms, then the request returns to the normal lifecycle.

### Story 6: Balance Refreshes Mid-Session

As an employee, I want the UI to reconcile balance changes that happen while the app is open so that I can act on current information.

Acceptance criteria:

- Given the app is open, when an anniversary bonus changes a balance, then background reconciliation detects the new balance.
- Given no request is in flight, when the new balance arrives, then the balance row updates and shows a refreshed message.
- Given a request form is open, when the selected balance changes, then the form remains open and shows the updated balance context.
- Given a request is in flight, when the selected balance changes, then the pending request state remains visible and the updated balance does not erase the pending action.

### Story 7: Manager Reviews Pending Requests

As a manager, I want to see pending requests with balance context so that I can make informed decisions.

Acceptance criteria:

- Given the manager view is opened, when pending requests are loading, then skeleton rows are shown.
- Given pending requests exist, when the manager view renders, then requests are listed with employee, location, requested days, dates, and current known balance context.
- Given no pending requests exist, when the manager view renders, then an empty state is shown.
- Given request data fails to load, when the manager view renders, then a retryable error is shown.

### Story 8: Manager Approves with Fresh Balance Verification

As a manager, I want approval to verify the balance at decision time so that I do not approve based on stale data.

Acceptance criteria:

- Given a manager opens request detail, when balance context is stale, then the UI shows that the balance must be refreshed before approval.
- Given the manager clicks Approve, when the app begins approval, then the UI shows `approval_pending_hcm`.
- Given fresh verification returns a changed but sufficient balance, when the manager is deciding, then the updated balance is shown and approval requires another explicit manager confirmation.
- Given the real-time balance read confirms sufficient balance, when HCM approval succeeds, then the request becomes approved.
- Given the real-time balance read shows insufficient balance, when approval is attempted, then approval is blocked and the request shows a conflict or rejection.
- Given HCM is silent during approval, when the timeout occurs, then the request remains not approved and shows retryable status.

### Story 9: Manager Denies a Request

As a manager, I want to deny a request with a reason so that the employee receives clear feedback.

Acceptance criteria:

- Given a pending request is selected, when the manager chooses Deny, then a reason field is available.
- Given the manager provides a denial reason, when denial succeeds, then the request becomes denied and pending days are released.
- Given denial succeeds, when the employee views the request timeline, then the denial reason is visible.
- Given denial fails or times out, when the response returns, then the request remains pending or retryable and is not removed from the queue.

### Story 10: Test and Story Coverage Is Reviewable

As a reviewer, I want the state matrix represented in tests and Storybook so that I can verify rigor without manually forcing every state.

Acceptance criteria:

- Given Storybook runs, when the reviewer opens balance components, then loading, empty, fresh, stale, refreshing, error, and conflict states are available as stories.
- Given Storybook runs, when the reviewer opens request components, then optimistic pending, rollback, HCM rejected, silent wrong success, and mid-session refresh states are available as stories.
- Given interaction tests run, when core user flows are exercised, then employee submit, HCM rejection, manager approval, and conflict paths are covered.
- Given integration tests run, when deterministic mock HCM scenarios are selected, then tests verify the UI behavior for each required scenario.

## 14. Storybook State Matrix

Required stories:

- `BalanceSummary/Loading`
- `BalanceSummary/Empty`
- `BalanceSummary/Fresh`
- `BalanceSummary/Stale`
- `BalanceSummary/Refreshing`
- `BalanceSummary/RefreshFailed`
- `BalanceSummary/BalanceRefreshedMidSession`
- `RequestForm/EmptyDraft`
- `RequestForm/ValidationErrors`
- `RequestForm/FractionalDayValidation`
- `RequestForm/OptimisticPending`
- `RequestForm/HcmRejectedInsufficientBalance`
- `RequestForm/HcmRejectedInvalidDimension`
- `RequestForm/OptimisticRolledBack`
- `RequestForm/HcmSilentlyWrong`
- `RequestForm/RetryableSilentFailure`
- `RequestTimeline/PendingManagerReview`
- `RequestTimeline/Approved`
- `RequestTimeline/Denied`
- `RequestTimeline/ConflictNeedsReview`
- `ManagerQueue/Loading`
- `ManagerQueue/Empty`
- `ManagerQueue/WithPendingRequests`
- `ManagerDecisionPanel/FreshBalance`
- `ManagerDecisionPanel/StaleBalanceRequiresVerification`
- `ManagerDecisionPanel/ChangedButSufficientBalance`
- `ManagerDecisionPanel/ApprovalPendingHcm`
- `ManagerDecisionPanel/ApprovalRejectedByHcm`
- `ManagerDecisionPanel/SilentApprovalFailure`
- `ReconciliationBanner/BalanceChanged`
- `ReconciliationBanner/InFlightActionConflict`

## 15. Test Strategy

### Unit and Component Tests

Use component tests for:

- Form validation.
- Status badge rendering.
- Freshness indicator rendering.
- Request lifecycle transitions from pure state helpers if state reducers/helpers are introduced.
- Accessibility expectations for forms, tables, alerts, and dialogs.

### Storybook Interaction Tests

Use Storybook interaction tests for isolated UI states. Stories should use fixtures/MSW so reviewers can open any state directly without manually driving the full app or depending on route-handler state.

Use Storybook interaction tests for:

- Completing the employee request form.
- Seeing optimistic pending state.
- Rolling back after HCM rejection.
- Retrying after silent failure.
- Manager approving after fresh balance verification.
- Manager denial with reason.

### Integration Tests

Use integration tests against deterministic mock HCM scenarios for:

- Seed reset from JSON fixtures.
- HCM state API `GET`, `POST`, `PATCH`, and `DELETE` behavior.
- Initial batch hydration.
- Per-cell read before employee submission.
- Per-cell read before manager approval.
- Anniversary bonus mid-session.
- Insufficient balance conflict.
- Invalid dimension conflict.
- Silent wrong success followed by reconciliation contradiction.
- Timeout/no response followed by retry.
- Pending-day reservation on submission.
- Pending-day release on denial.
- Pending-day conversion on approval.

### End-to-End Smoke Tests

At minimum, run one browser-level happy path:

- Employee sees balances.
- Employee submits request.
- Manager sees pending request.
- Manager approves.
- Employee sees approved result after HCM confirmation.

Run one browser-level unhappy path:

- Employee sees stale balance.
- Employee submits request.
- HCM rejects or contradicts.
- UI rolls back and shows recoverable state.

### Coverage Proof

The README must include the latest Vitest, Playwright, and Storybook test commands and summarize the resulting coverage or pass/fail output. A generated coverage report is preferred if practical, but the required proof is the combination of automated test output and a concise README coverage summary.

The project should not define an arbitrary coverage percentage gate unless requested later. The meaningful bar is whether tests prove the required flows, state transitions, HCM scenarios, and Storybook states.

## 16. Non-Functional Requirements

### Accessibility

- All form controls must have accessible labels.
- Status messages must be available to assistive technologies.
- Keyboard users must be able to complete employee and manager flows.
- Dialogs or sheets must manage focus correctly.
- Color must not be the only signal for freshness, rejection, approval, or conflict states.

### Performance

- Initial load should show stable skeleton UI quickly.
- Batch hydration should not block static shell rendering longer than necessary.
- Background reconciliation should not clear visible content during refresh.
- Expensive batch refreshes should be less frequent than targeted per-cell reads.

### Resilience

- HCM timeout, wrong success, conflict, and invalid dimension states must have explicit UI.
- A failed refresh must not erase the last known balance.
- In-flight actions must survive background refreshes.
- Tests must run deterministically.

### Observability for Demo

- Mock HCM scenario controls will be test-helper only through `/api/hcm/state`; no dev/demo UI panel or dedicated demo-control route is required.
- README examples must document how to reset state, patch scenario mode, trigger an anniversary bonus by patching balance state, and inspect current state.
- Request audit events should make lifecycle transitions inspectable.
- The TRD and README should explain how to run the app, Storybook, and tests.

## 17. Alternatives Considered

### Optimistic vs. Pessimistic Employee Submission

Fully pessimistic submission would be simpler and safer but would under-deliver on the assignment's requirement for instant feedback. Fully optimistic submission would feel fast but could mislead users if labeled as final.

Chosen approach: optimistic pending state with explicit non-final language and rollback support.

### Optimistic vs. Pessimistic Manager Approval

Optimistic approval would be dangerous because the employee persona must never be told "approved" and then later "denied". Manager approval is the final state boundary and should not cross into final approval until HCM confirms.

Chosen approach: pessimistic final approval with immediate pending feedback.

### Batch-Only vs. Per-Cell Verification

Batch-only fetching is efficient for hydration but too stale for balance-consuming actions. Per-cell reads are authoritative but too narrow for initial page population.

Chosen approach: batch for hydration and periodic reconciliation, per-cell reads before submission and approval.

### Plain Fetch State vs. TanStack Query

Plain React state and fetch calls can implement the flows but would require custom cache invalidation, request deduplication, retry, optimistic rollback, and stale-state bookkeeping.

Chosen approach: TanStack Query for remote state and mutation lifecycle control.

### JavaScript vs. TypeScript

JavaScript would match the initial scaffold, but the assignment depends on explicit state machines, request statuses, scenario modes, and mock API contracts.

Chosen approach: migrate the app to TypeScript so these contracts are encoded in the codebase and test fixtures.

### Calendar-Aware Duration vs. Manual Requested Days

Calendar-aware duration calculation would require holidays, weekends, regional schedules, half-day policies, and timezone rules that are not central to the assignment.

Chosen approach: collect dates for context, use one fixed demo timezone, and let the user manually enter requested days in `0.5` day increments.

### Next.js Route Handlers vs. MSW

MSW is excellent for component and browser tests, but route handlers make the mock HCM runnable with the app and easier for reviewers to exercise manually.

Chosen approach: implement route handlers as the primary mock HCM for the running app and integration tests; use fixtures/MSW for Storybook so UI states remain isolated, deterministic, and directly reviewable.

### Local Storybook vs. Deployed Storybook

A deployed Storybook is convenient but not necessary for the assignment as long as the reviewer can run it with one command.

Chosen approach: provide local-only Storybook with a documented `npm run storybook` command.

## 18. Edge Cases

- Employee has multiple balances for different locations.
- Employee selects a location whose balance disappears or becomes invalid during form entry.
- Employee requests exactly the available effective balance.
- Employee requests a fractional `0.5` day amount.
- Employee enters a requested-day value that is not in `0.5` increments.
- Employee requests more than available balance.
- Employee has pending days that reduce effective available balance.
- Anniversary bonus arrives while no form is open.
- Anniversary bonus arrives while the selected form location is being edited.
- Anniversary bonus arrives during request submission.
- HCM returns success without actually recording the request.
- HCM records the request but the UI times out before receiving success.
- Manager opens a request whose balance is stale.
- Manager approves while another mutation has consumed the balance.
- Manager verifies approval and receives a changed but still sufficient balance.
- Manager denies while request detail is open in another tab.
- Batch reconciliation returns older data than a recent per-cell read.
- User refreshes the page while a request is pending.
- Network recovers after a retryable failure.

## 19. Completion Checklist

- Employee balance view exists.
- Employee request form exists.
- App has been migrated to TypeScript.
- Manager pending queue exists.
- Manager queue sorts oldest pending requests first.
- Manager decision view exists.
- Seed fixtures include at least two employees, one manager, two to three locations, one pending request, and one low-balance scenario.
- Mock HCM real-time per-cell read exists.
- Mock HCM write/decision endpoint exists.
- Mock HCM batch corpus endpoint exists.
- Mock HCM anniversary bonus simulation exists.
- Anniversary bonus simulation is represented by patching HCM state through `/api/hcm/state`.
- HCM state API supports `GET`, `POST`, `PATCH`, and `DELETE`.
- HCM state API is documented in the README with example commands for reset, patch scenario mode, patch balance state, and inspect current state.
- Mock HCM silent wrong success simulation exists.
- Mock HCM conflict and insufficient balance simulations exist.
- Optimistic employee pending state exists.
- Submission increases pending days.
- Approval converts pending days into consumed balance.
- Denial releases pending days.
- Optimistic rollback exists.
- Manager approval waits for HCM confirmation before final approval.
- Manager approval requires reconfirmation when fresh balance changes but remains sufficient.
- Write timeouts use a 5 second timeout and manual retry.
- Background reconciliation exists.
- In-flight action plus background refresh behavior is covered.
- shadcn/ui is used for the component library.
- Storybook includes all required state stories.
- Storybook states are isolated with fixtures/MSW.
- Interaction tests cover the main happy and unhappy paths.
- Integration tests cover deterministic mock HCM scenarios.
- Mock HCM state is in memory and seeded from JSON fixtures.
- README documents one-command app, local Storybook, test workflows, and state API usage.
- Coverage proof is available through Vitest, Playwright, and Storybook test output plus a README summary, without requiring an arbitrary percentage gate.

## 20. Clarification Status

All product clarifications identified during Phase 1 have been resolved and incorporated into this TRD. Future implementation work should treat Section 7 as the source of truth for these decisions unless the product owner explicitly changes scope.
