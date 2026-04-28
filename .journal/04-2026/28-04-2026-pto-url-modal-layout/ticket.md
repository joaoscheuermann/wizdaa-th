---
status: planning
created: 2026-04-28 16:04
slug: pto-url-modal-layout
---

## Prompt

[$architect](C:\\Users\\jvito\\Documents\\git\\Personal\\wizdaa-th\\.agents\\skills\\architect\\SKILL.md) write an architecture for the changes in the current [TRD.md](TRD.md) . Verify what is already implemented, do not duplicate work! Use the project-index to get a broader view of the current state of the repo.

## Research

### Repository Context

- Project index identifies this as a Next.js 16 App Router app, not an Nx workspace. There is no `nx.json`; use npm scripts from `package.json`.
- `AGENTS.md` requires reading local Next docs before Next code edits. Relevant Next 16 docs reviewed:
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- Current scripts: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:storybook`, `npm run test:e2e`, `npm run build`.

### Implemented Today

- `src/app/page.tsx` renders `<AppShell />` at `/`; there is no `src/app/[id]/page.tsx`.
- `src/components/common/app-shell.tsx` owns a client-side Employee/Manager tab switcher and seeded role state. It also owns local employee selection.
- `src/features/employee/balance-summary.tsx` fetches batch balances and exposes an employee selector, then filters balances client-side.
- `src/features/employee/request-form.tsx` already owns the Request PTO panel behavior, form validation, pre-submit balance verification, optimistic pending request mutation, rollback, retry, and success messaging.
- `src/features/employee/request-timeline.tsx` shows employee requests as an ordered timeline/list, not a table.
- `src/features/manager/pending-request-queue.tsx` lists pending requests and auto-selects the first visible request after load.
- `src/features/manager/manager-decision-panel.tsx` already owns approval, denial, reconfirmation, retryable failure, and fresh balance verification behavior.
- `src/components/ui` currently has `badge`, `button`, `card`, and `tabs`. There is no local dialog primitive.
- `@base-ui/react/dialog` is installed, so a local shadcn-style `Dialog` wrapper can be added without a new dependency.
- HCM product APIs exist for balances and requests. The users list exists in HCM state and seed data, but there is no product user lookup endpoint; `/api/hcm/state` is explicitly a test-helper surface and should not be used by product data-fetching.
- API route handlers are already dynamic for stateful mock HCM behavior.

### Gaps Against Current TRD

- Route-based seeded user loading at `/:id`.
- Invalid-user UI state for unknown route IDs.
- Employee data scoping by active route user instead of employee selector.
- Requested PTO table for employee self-service.
- Icon-only `+` create action opening a modal containing the current Request PTO panel.
- Manager access to their own requested PTO table.
- Manager layout with all-employee balances table at about 60% width and Manager Workspace in the remaining column.
- Independent desktop scrolling for manager columns.
- Pending manager request opens a modal containing the current Manager Decision panel behavior.
- Storybook/test/E2E coverage needs to move from tabs/timeline/card decision panel toward route/table/modal workflows.

## Architecture

## Current State / Prior Art

This is an existing Next.js 16 App Router prototype, not a greenfield implementation. The current app already has most HCM lifecycle behavior and should be extended surgically.

Already implemented:

- `src/app/page.tsx` renders `<AppShell />` at `/`.
- `src/components/common/app-shell.tsx` owns a client-side Employee/Manager tab switcher and local selected employee state.
- `src/features/employee/balance-summary.tsx` renders employee balances, performs batch reconciliation, and currently exposes an employee selector.
- `src/features/employee/request-form.tsx` owns the current Request PTO panel, validation, targeted balance verification, optimistic pending request mutation, rollback, retry, and success messaging.
- `src/features/employee/request-timeline.tsx` fetches employee requests and renders them as a timeline/list.
- `src/features/manager/pending-request-queue.tsx` renders pending manager requests and auto-selects the first request.
- `src/features/manager/manager-decision-panel.tsx` owns approval, denial, fresh balance verification, changed-but-sufficient reconfirmation, retryable failure, and conflict messaging.
- Product HCM endpoints already exist for balances, requests, request decisions, and the test-helper state API.
- Shared contracts already exist in `src/domain/time-off/types.ts`.
- Query keys and React Query hooks already exist for balance batch, balance cell, employee requests, pending requests, submit request, and manager decision.
- `@base-ui/react/dialog` is installed, and shadcn's Dialog docs define the expected local `components/ui/dialog` composition.

Missing against the current TRD:

- `/:id` seeded user route.
- Product-safe user resolution contract.
- Invalid-user state for unknown route IDs.
- Active-user scoping driven by route params rather than role tabs or employee selector.
- Requested PTO table.
- Icon-only `+` action opening a Request PTO modal.
- Manager self-service access to the manager's own requested PTO table.
- Manager 60% all-employee balances column plus Manager Workspace column.
- Independent desktop scrolling for manager columns.
- Pending manager request modal containing the current Manager Decision panel behavior.
- Updated component tests, Storybook states, E2E flows, and README route guidance.

## Category and Boundaries

Category: app/UI.

Reason: the feature changes application routing, screen composition, product data scoping, modal behavior, and UI verification. It does not require a new package, external persistence, ML/data pipeline, FFI boundary, or production authorization system.

Workspace boundary map:

| Area | Paths |
| --- | --- |
| App routes | `src/app/page.tsx`, `src/app/[id]/page.tsx`, `src/app/api/hcm/**/route.ts` |
| Common shell/UI | `src/components/common/*`, `src/components/ui/*` |
| Employee feature UI | `src/features/employee/*` |
| Manager feature UI | `src/features/manager/*` |
| Domain contracts/helpers | `src/domain/time-off/*` |
| Browser HCM client/query layer | `src/lib/hcm-client/*`, `src/lib/queries/*` |
| Server mock HCM | `src/server/hcm/*` |
| Test/story fixtures | `src/test/*`, `.storybook/*`, `tests/e2e/*` |
| Docs | `README.md`, `TRD.md` |

No new top-level directory, package, or app is required.

## Approved Architecture Decisions

### User Resolution Contract

Approved option: add a product endpoint backed by existing HCM state.

Add `GET /api/hcm/users/{userId}` and corresponding server/client/query helpers:

- `src/app/api/hcm/users/[userId]/route.ts`
- `src/server/hcm/user-api.ts`
- `src/lib/hcm-client/client.ts` function such as `getDemoUser(userId)`
- `src/lib/queries/user-queries.ts`
- `src/lib/queries/query-keys.ts` entry such as `users.byId(userId)`

Rationale:

- Product code must not fetch `/api/hcm/state`; that endpoint is a test-helper surface.
- A dedicated user lookup cleanly supports invalid IDs and keeps route ownership separate from balance/request contracts.
- Existing `DemoUser` type and seed state are already sufficient, so no new schema family is needed.

Alternatives considered:

- Derive users from balance/request responses: avoids one endpoint but fails for managers without balances and makes invalid-user states indirect.
- Import seed JSON directly into route/UI code: smallest code but duplicates server state knowledge and bypasses the mock HCM contract.

### Dialog / Modal Composition

Approved option: add a shadcn Dialog primitive using shadcn's Dialog docs and the installed Base UI implementation.

Add `src/components/ui/dialog.tsx` using the shadcn `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, and optional footer/close composition. Prefer generating or copying from [shadcn Dialog documentation](https://ui.shadcn.com/docs/components/dialog), selecting the Base UI-compatible version because `@base-ui/react` is already installed.

Rationale:

- Avoid hand-rolled focus trapping, inert background, escape handling, overlay, and keyboard behavior.
- Preserve the repo's shadcn-style component convention under `src/components/ui`.
- Reuse the same primitive for Request PTO and Manager Decision modals.

Alternatives considered:

- Build modal markup inside each feature: duplicates accessibility and interaction behavior.
- Add another modal dependency: unnecessary because the repo already has Base UI and shadcn docs provide the component contract.

## Proposed Architecture

### Route and Shell

Create `src/app/[id]/page.tsx` as the canonical user workspace route. Follow Next 16 dynamic segment docs: page params are asynchronous, so `params` should be awaited in the Server Component page.

`src/app/page.tsx` should become a minimal redirect or landing fallback to a seeded default user such as `/emp-avery`, rather than continuing to host the role switcher.

Refactor `AppShell` from role tabs into a route-driven shell:

- Accept `activeUserId` or `activeUser` as a prop.
- Fetch/receive the active seeded user from `GET /api/hcm/users/{userId}`.
- Render invalid-user state for 404/unknown IDs.
- Render employee self-service for employee users.
- Render manager workspace plus manager self-service requested PTO table for manager users.
- Remove role tabs and employee selector from the product shell.

Keep the shell a Client Component because it coordinates interactive modals and React Query state. Let `src/app/[id]/page.tsx` stay as the route boundary.

### Employee Self-Service

Introduce a focused requested PTO table rather than extending the existing timeline in place:

- `src/features/employee/requested-pto-table.tsx`
- `src/features/employee/request-pto-modal.tsx`

`RequestedPtoTable` responsibilities:

- Fetch requests with `useEmployeeRequestsQuery(activeEmployeeId)`.
- Render table columns: status, location, requested days, date range, status reason/lifecycle context.
- Show loading skeleton rows, empty state, retryable error state, and normal rows.
- Expose an icon-only `+` button in the header to open `RequestPtoModal`.
- Use `Plus` from `lucide-react`, with an accessible name such as `Request PTO`.

`RequestPtoModal` responsibilities:

- Own the open/close state when embedded in the employee table.
- Render the existing `RequestForm` inside `DialogContent`.
- Close or show completion according to the TRD after successful submission.
- Preserve the existing `RequestForm` retry behavior for retryable failures.

Refactor `RequestForm` minimally:

- Keep existing validation/mutation behavior.
- Add optional callback props such as `onSubmitSuccess?: (response) => void`.
- Avoid moving HCM mutation logic into the modal.
- Preserve standalone stories/tests by keeping defaults backward compatible.

The existing `RequestTimeline` can either remain for legacy story coverage or be replaced by `RequestedPtoTable` in the main shell. It should not be the primary product surface once the table exists.

### Balance Scoping

Refactor `BalanceSummary` so the main product route cannot browse employees:

- Add a mode or prop such as `scope="employee" | "manager"` or split responsibilities into wrappers.
- For employee self-service, accept `employeeId` and display only that user's balances. Do not render `EmployeeSelector`.
- For manager all-employee visibility, add `AllEmployeeBalancesTable` and reuse balance row/freshness formatting helpers from `BalanceSummary`.

Recommended split:

- Keep shared formatting/presentation helpers local initially if reuse is small.
- If duplication grows across `BalanceSummary` and `AllEmployeeBalancesTable`, extract focused helpers in `src/features/employee/balance-summary.tsx` or a small shared feature module under `src/features/time-off/*`. Do not create a new top-level shared package.

### Manager Workspace

Introduce a manager composition component:

- `src/features/manager/manager-workspace.tsx`
- `src/features/manager/all-employee-balances-table.tsx`
- `src/features/manager/manager-decision-modal.tsx`

`ManagerWorkspace` responsibilities:

- Render desktop grid with `lg:grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)]` or equivalent to approximate 60/40.
- Give each desktop column bounded height and `overflow-y-auto` so they scroll independently.
- Stack columns on narrow screens without horizontal overflow.
- Render `AllEmployeeBalancesTable` in the 60% column.
- Render pending request queue in the Manager Workspace column.

`PendingRequestQueue` changes:

- Stop auto-selecting the first pending request for the new modal flow.
- Treat row click as "open modal for this request".
- Keep accessible row buttons with `aria-label`.

`ManagerDecisionModal` responsibilities:

- Own selected request ID/open state.
- Render existing `ManagerDecisionPanel` inside `DialogContent`.
- Close when no selected request remains pending or when the user closes it.

`ManagerDecisionPanel` changes:

- Keep decision behavior in place.
- Allow rendering without an outer `Card` if needed via a light prop such as `variant="panel" | "modal"`, or keep the Card if visual nesting remains acceptable in the modal. Avoid duplicating approval/denial logic.

### Manager Self-Service

Managers should see their own requested PTO table through the same `/:id` route.

Because the current seed has `mgr-morgan` as a `DemoUser` but no balances for that ID, implementation must either:

- Add manager-owned balance rows to `default-state.json`, or
- Render the manager's requested PTO table empty until manager balances/requests exist.

Architecture recommendation: add at least one manager self-service balance row to the seed fixture only if the Request PTO modal should be usable for manager users immediately. This is fixture data, not a schema change.

### Data Contracts

Existing request and balance contracts remain valid. Add only user lookup contracts:

- `DemoUserResponse` in `src/domain/time-off/types.ts`, unless the route returns `DemoUser` directly.
- `GET /api/hcm/users/{userId}` response shape: `{ user: DemoUser }`.
- 404 response for unknown IDs with existing `ApiErrorResponse` shape.

No changes are required for:

- `TimeOffRequest`
- `TimeOffRequestSubmission`
- `ManagerDecisionRequest`
- `ManagerDecisionResponse`
- `BalanceCell`
- HCM state API shape

### Query and Cache Strategy

Add query key:

- `queryKeys.users.byId(userId)`

Continue using existing keys:

- `queryKeys.balances.batch`
- `queryKeys.balances.cell(...)`
- `queryKeys.requests.employee(employeeId)`
- `queryKeys.requests.pending`

When route ID changes:

- The page remount should naturally reset modal state if keying `AppShell` by `activeUser.id`.
- Query keys already include employee ID for employee requests.
- Balance batch remains shared because it is reconciled globally; UI scoping must filter what is rendered.

### UI Component Additions

Use shadcn/ui conventions:

- Add `src/components/ui/dialog.tsx`.
- Consider adding `src/components/ui/table.tsx`, `skeleton.tsx`, and `tooltip.tsx` if generated components are preferred over current hand-styled table/skeleton markup.
- Existing project uses handmade forms/selects/textareas inside feature components; do not block this architecture on a full form primitive migration.

If using the shadcn CLI, use npm-compatible commands:

```powershell
npx shadcn@latest add dialog table skeleton tooltip
```

If manual copy is used instead, keep the component API aligned with shadcn's documented imports:

```ts
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
```

## Implementation Plan

1. User route and lookup contract
   - Add `GET /api/hcm/users/[userId]`.
   - Add client/query helpers.
   - Add `src/app/[id]/page.tsx`.
   - Redirect `/` to a default seeded user.
   - Refactor `AppShell` to accept active user context and remove role tabs.

2. Employee scoping and requested PTO table
   - Refactor `BalanceSummary` to support active employee scoping without selector.
   - Add `RequestedPtoTable`.
   - Convert main employee self-service from timeline plus always-visible form to table plus `+` modal.
   - Keep `RequestForm` behavior and add success callback.

3. shadcn Dialog primitive and Request PTO modal
   - Add `src/components/ui/dialog.tsx` via shadcn docs/CLI.
   - Add `RequestPtoModal` and wire it to `RequestedPtoTable`.
   - Ensure dialog focus, close, and accessible title/description behavior.

4. Manager layout and decision modal
   - Add `AllEmployeeBalancesTable`.
   - Add `ManagerWorkspace` 60/40 responsive layout with independent scroll columns.
   - Change pending queue selection to open a modal rather than render side-by-side decision panel.
   - Add `ManagerDecisionModal` reusing `ManagerDecisionPanel`.

5. Manager self-service
   - Render `RequestedPtoTable` scoped to manager ID in the manager route experience.
   - Decide during implementation whether seed data needs manager balances for a fully usable manager Request PTO modal; if missing, keep a clear empty/no-balance state rather than inventing hidden user mapping.

6. Test and Storybook updates
   - Update `AppShell` tests from tab switching to route-driven user rendering.
   - Add component tests for `RequestedPtoTable`, `RequestPtoModal`, `ManagerWorkspace`, and `ManagerDecisionModal`.
   - Update request form tests to include modal success callback behavior.
   - Add Storybook stories required by TRD: `RequestedPtoTable/*` and `RequestPtoModal/OpenDraft`.
   - Update manager queue/decision stories to cover modal behavior.
   - Update Playwright E2E to visit `/emp-avery` and `/mgr-morgan` instead of `/` plus role tab switching.

7. Docs
   - Update README app URL guidance from `/` to seeded routes such as `/emp-avery`, `/emp-jordan`, and `/mgr-morgan`.
   - Document invalid-user behavior and available seeded IDs.

## Verification Plan

Run after implementation:

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:storybook
npm run test:e2e
npm run build
```

Manual smoke checks:

- `http://localhost:3000/emp-avery` shows Avery's scoped balances and requested PTO table.
- The `+` button opens Request PTO modal and can submit a request.
- `http://localhost:3000/emp-jordan` does not show Avery's balances or requests.
- `http://localhost:3000/mgr-morgan` shows manager all-employee balances, Manager Workspace, and manager self-service requested PTO table.
- Manager columns scroll independently on desktop.
- Clicking a pending request opens the decision modal.
- Unknown user route shows invalid-user state.

## SOLID / YAGNI / KISS / DRY Notes

- SRP: route identity, user lookup, employee request display, request submission, manager queue, and manager decisions each stay in their owning layer.
- OCP: add user lookup, table, and modal components through existing seams instead of rewriting HCM lifecycle behavior.
- DIP: UI depends on client/query contracts, not `state-store` or seed JSON.
- ISP: user lookup is a narrow endpoint instead of widening balance/request APIs.
- KISS: no new top-level package, no production auth layer, no database.
- DRY: reuse `RequestForm`, `ManagerDecisionPanel`, query keys, HCM client, lifecycle helpers, and fixtures instead of duplicating mutation behavior.

## Risks and Mitigations

- Product data accidentally using `/api/hcm/state`: mitigate by adding `/api/hcm/users/[userId]` and testing invalid IDs through product endpoint.
- Manager user may have no balance rows in seed data: mitigate with explicit empty/no-balance state, or add manager fixture balances if self-service submission must be demonstrable.
- Modal wrappers can duplicate form/decision logic: mitigate by reusing `RequestForm` and `ManagerDecisionPanel` directly.
- Role tab tests and E2E flows will fail after route refactor: update tests in the same implementation effort as the shell change.
- Independent scroll can create mobile overflow: verify desktop and narrow viewport behavior in Playwright or component tests.

## Transparency Checklist

- Correct layer: pass; this stays in the app/UI, query, and mock HCM route layers.
- Reuses existing targets and boundaries: pass; npm scripts and existing `src/*` boundaries are retained.
- Cross-language regeneration: not applicable.
- Large/generated dirs: only local Next docs and package metadata were consulted; generated outputs were not scanned.
- ML/data deployment constraints: not applicable.
- Work splits into replaceable units: pass; user route, table/modal, manager layout/modal, and verification can be delivered separately.
- Verification executable: pass; commands are current `package.json` scripts.
- Alternatives explicit: pass; user-resolution and modal options were presented and approved.
