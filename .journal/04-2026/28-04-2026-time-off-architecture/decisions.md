# Decision Log: time-off-architecture

### 2026-04-28 13:22 - Architect

**Context**: Architecture for the ExampleHR time-off frontend TRD in a minimal Next.js App Router repository.
**Decision**: Use a single Next.js TypeScript app with feature-first UI folders, shared domain contracts, a mock HCM server engine, product-facing HCM endpoints, a test-helper `/api/hcm/state` API, shadcn/ui, and TanStack Query for server-state synchronization.
**Rationale**: The take-home is primarily evaluated on external source-of-truth drift, optimistic updates, rollback, stale data, reconciliation, Storybook state coverage, and tests. This architecture separates product UI, query lifecycle, typed client contracts, mock HCM behavior, and deterministic test state setup without introducing a monorepo, database, Prisma, or generic state-api library.
**Alternatives considered**: Custom React state plus fetch would reduce dependencies but recreate cache, invalidation, polling, optimistic rollback, and mutation lifecycle machinery. SWR is simpler but less explicit for coordinated mutation lifecycles. A flat `src/app` structure would be faster initially but weaker for Storybook and state rigor. A package/monorepo split would add ceremony not justified by this take-home.

### 2026-04-28 13:22 - Decomposer

**Context**: Breaking the approved architecture into incremental deliverables.
**Decision**: Decompose into seven sequential vertical efforts: foundation app shell, balance hydration, employee request submission, manager decision workflow, reconciliation, failure scenarios, and Storybook/tests/docs. Each implementation slice carries focused automated tests for the behavior introduced in that slice; the final effort consolidates Storybook, e2e smoke tests, remaining accessibility/proof gaps, and documentation.
**Rationale**: This order creates a runnable application immediately, then adds one reviewer-visible behavior per slice while keeping domain types, mock HCM state, API contracts, UI, and tests connected as the system grows. Incremental tests reduce late integration risk and make each effort independently evaluable before moving to the next.
**Alternatives considered**: A horizontal split by types, API, UI, and tests would delay observable progress and increase integration risk. Deferring most tests until the final effort would leave earlier slices under-protected. A single large implementation effort would obscure failure points and make review harder. Putting all Storybook work first would prove UI states but under-test the HCM source-of-truth behavior that the assignment emphasizes.

### 2026-04-28 13:22 - Executor

**Context**: Effort 1 completed: Foundation App Shell.
**Decision**: Marked Effort 1 done.
**Rationale**: Developer summary was appended, app shell implementation met the effort objective, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and a dev-server HTTP/content check.
**Alternatives considered**: None.

### 2026-04-28 13:22 - Executor

**Context**: Effort 2 completed: Balance Hydration Slice.
**Decision**: Marked Effort 2 done.
**Rationale**: Developer summary was appended, product balance read/write endpoints and state API were implemented, employee balance UI was data-backed, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and HTTP state/balance endpoint checks.
**Alternatives considered**: None.

### 2026-04-28 13:22 - Executor

**Context**: Effort 3 completed: Employee Request Slice.
**Decision**: Marked Effort 3 done.
**Rationale**: Developer summary was appended, employee request submission, validation, pending-day reservation, rollback handling, and employee timeline were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and HTTP request workflow checks.
**Alternatives considered**: None.

### 2026-04-28 13:22 - Executor

**Context**: Effort 4 completed: Manager Decision Slice.
**Decision**: Marked Effort 4 done.
**Rationale**: Developer summary was appended, manager queue, approval, denial, pending-day conversion/release, and changed-but-sufficient reconfirmation were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and HTTP manager workflow checks.
**Alternatives considered**: None.

### 2026-04-28 13:22 - Executor

**Context**: Effort 5 completed: Reconciliation Slice.
**Decision**: Marked Effort 5 done.
**Rationale**: Developer summary was appended, freshness, background reconciliation, state API balance patching, reconciliation messaging, and preservation of in-flight state were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and HTTP state patch smoke checks.
**Alternatives considered**: None.

### 2026-04-28 15:06 - Executor

**Context**: Effort 6 completed: Failure Scenarios Slice.
**Decision**: Marked Effort 6 done.
**Rationale**: Developer summary was appended, deterministic HCM scenario modes, timeout handling, retryable failure states, silent wrong success contradiction handling, approval conflicts, and user-visible `conflict_needs_review` behavior were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and HTTP scenario smoke checks.
**Alternatives considered**: None.

### 2026-04-28 15:25 - Executor

**Context**: Effort 7 completed: Storybook Tests Docs.
**Decision**: Marked Effort 7 done.
**Rationale**: Developer summary was appended, Storybook configuration, fixture-backed stories, Storybook interaction tests, Playwright e2e smoke tests, coverage reporting, and reviewer README guidance were implemented, and verification passed for `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:storybook`, `npm run test:e2e`, `npm run build`, `npm run build-storybook`, `npm run storybook`, and `npm run test:coverage`.
**Alternatives considered**: None.
