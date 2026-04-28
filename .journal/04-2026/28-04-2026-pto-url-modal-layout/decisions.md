# Decision Log: pto-url-modal-layout

### 2026-04-28 16:14 - Architect

**Context**: Architecture for updated TRD usability changes: URL-loaded users, requested PTO table/modal, manager 60/40 layout, manager decision modal, and independent scrolling.
**Decision**: Extend the existing Next.js app in place using a product `GET /api/hcm/users/{userId}` endpoint for route user resolution and a shadcn-style `Dialog` primitive under `src/components/ui/dialog.tsx` for both Request PTO and Manager Decision modals.
**Rationale**: The existing HCM lifecycle, request mutations, balance reconciliation, and manager decision behavior are already implemented and should be reused. A dedicated product user endpoint avoids using the test-helper `/api/hcm/state` in UI code, while a shadcn Dialog keeps modal accessibility and composition consistent with the repo's UI approach.
**Alternatives considered**: Deriving users from balances/requests was rejected because manager and invalid-user states become indirect. Importing seed JSON into UI code was rejected because it duplicates backend state knowledge. Hand-rolled modal markup was rejected because it duplicates focus/overlay/keyboard behavior. Adding another modal dependency was rejected because shadcn/Base UI support is already available.

### 2026-04-28 16:14 - Decomposer

**Context**: Breaking the approved PTO URL/modal/layout architecture into incremental implementation efforts.
**Decision**: Decompose into five sequential efforts: route user resolution, requested PTO table/modal, employee and manager self-service scoping, manager layout/decision modal, and final verification/docs.
**Rationale**: This order makes route identity runnable first, then adds the user-facing requested PTO workflow, then tightens visibility rules, then updates manager composition, and finally consolidates tests, Storybook, E2E coverage, and README guidance. Each effort has a browser-observable checkpoint and reuses existing lifecycle behavior rather than duplicating request or decision logic.
**Alternatives considered**: A horizontal split by API, UI, and tests was rejected because it would defer runnable value. A single large effort was rejected because it would mix route identity, modal behavior, manager layout, and verification changes. Placing documentation first was rejected because the route and modal behavior must exist before reviewer guidance can be accurate.

### 2026-04-28 16:26 - Executor

**Context**: Effort 1 completed: Route User Resolution.
**Decision**: Marked Effort 1 done.
**Rationale**: Developer summary was appended, route user resolution and the product user lookup endpoint were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, plus a browser smoke check of `/`, `/emp-avery`, `/mgr-morgan`, `/not-a-user`, and absence of the role tablist.
**Alternatives considered**: None.

### 2026-04-28 16:26 - Executor

**Context**: Effort 2 completed: Requested PTO Table Modal.
**Decision**: Marked Effort 2 done.
**Rationale**: Developer summary was appended, the requested PTO table and shadcn/Base UI Request PTO modal were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:storybook`, plus a browser smoke check of the `/emp-avery` modal submission flow.
**Alternatives considered**: None.

### 2026-04-28 16:26 - Executor

**Context**: Effort 3 completed: Employee Manager Scoping.
**Decision**: Marked Effort 3 done.
**Rationale**: Developer summary was appended, route-scoped balance and requested PTO visibility was implemented, manager self-service was added with fixture-only manager balances, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, plus Playwright route checks for `/emp-avery`, `/emp-jordan`, and `/mgr-morgan`.
**Alternatives considered**: None.

### 2026-04-28 16:26 - Executor

**Context**: Effort 4 completed: Manager Layout Decision Modal.
**Decision**: Marked Effort 4 done.
**Rationale**: Developer summary was appended, the manager all-employee balances table, 60/40 workspace layout, independent scrolling, and manager decision modal were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:storybook`, plus browser checks of `/mgr-morgan`.
**Alternatives considered**: None.

### 2026-04-28 16:26 - Executor

**Context**: Effort 5 completed: Verification Docs.
**Decision**: Marked Effort 5 done.
**Rationale**: Developer summary was appended, E2E and Storybook coverage plus README route guidance were updated, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:storybook`, `npm run test:e2e`, `npm run build`, plus manual route smoke checks.
**Alternatives considered**: None.
