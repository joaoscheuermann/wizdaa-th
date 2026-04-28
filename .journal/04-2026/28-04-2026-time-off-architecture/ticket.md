---
status: planning
created: 2026-04-28 13:22
slug: time-off-architecture
---

## Prompt

[$architect](C:\\Users\\jvito\\Documents\\git\\Personal\\wizdaa-th\\.agents\\skills\\architect\\SKILL.md) write the architecture for the [TRD.md](TRD.md).

## Research

- Current repo is a minimal Next.js 16.2.4 App Router scaffold.
- Current source files are limited to `src/app/layout.js`, `src/app/page.js`, `src/app/globals.css`, `src/app/page.module.css`, and `src/app/favicon.ico`.
- `package.json` currently has `dev`, `build`, `start`, and `lint` scripts only.
- No TypeScript, Storybook, shadcn/ui, TanStack Query, route handlers, tests, or fixtures are installed yet.
- Local Next docs confirm route handlers live under `app/**/route.ts`, support standard HTTP methods, are not cached by default, and cannot coexist with a `page` at the same segment.
- Local Next docs confirm interactive state/event handlers require Client Components, while route/page shells can remain Server Components.
- Official shadcn/ui docs for existing Next projects expect Tailwind/import alias setup and use `shadcn@latest init` followed by `shadcn@latest add ...`.
- TanStack Query official docs explicitly support optimistic updates, rollback via mutation lifecycle context, query invalidation, and background refetching, which matches the TRD's HCM consistency requirements.

## Architecture

## Current State

- Repo is a minimal Next `16.2.4` App Router app.
- Current app is JavaScript-only under `src/app`.
- No TypeScript, Storybook, shadcn/ui, TanStack Query, tests, fixtures, or API routes exist yet.
- Package manager should remain npm because `package-lock.json` is present.

## Chosen Approach

Use a single Next.js TypeScript app with feature-first UI folders, shared domain contracts, a mock HCM server engine, product-facing HCM endpoints, and a separate test-helper state API.

TanStack Query is approved because the core problem is server-state drift: optimistic updates, rollback, invalidation, stale data, background reconciliation, and mutation safety. It is justified by the assignment's evaluation criteria, not added as generic state machinery.

## Proposed Paths

```text
src/app/
  page.tsx
  layout.tsx
  api/hcm/balances/batch/route.ts
  api/hcm/balances/route.ts
  api/hcm/requests/route.ts
  api/hcm/requests/[requestId]/route.ts
  api/hcm/state/route.ts

src/domain/time-off/
  types.ts
  constants.ts
  schemas.ts
  lifecycle.ts
  freshness.ts

src/server/hcm/
  seed/default-state.json
  state-store.ts
  state-api.ts
  hcm-service.ts
  scenarios.ts

src/lib/hcm-client/
  client.ts
  errors.ts

src/lib/queries/
  query-client-provider.tsx
  query-keys.ts
  balance-queries.ts
  request-mutations.ts

src/features/employee/
src/features/manager/
src/components/common/
src/components/ui/
src/fixtures/hcm/
tests/e2e/
.storybook/
```

## Runtime Flow

1. UI feature components call query/mutation hooks.
2. Query hooks call typed `hcm-client`.
3. `hcm-client` calls product mock HCM endpoints.
4. Route handlers call `src/server/hcm/hcm-service.ts`.
5. HCM service owns lifecycle rules and mutates in-memory state through `state-store.ts`.
6. `/api/hcm/state` is only for tests and README-driven setup; product code must not use it.

## API Contracts

Product-facing endpoints:

- `GET /api/hcm/balances/batch`
- `GET /api/hcm/balances?employeeId=...&locationId=...`
- `PATCH /api/hcm/balances`
- `POST /api/hcm/requests`
- `GET /api/hcm/requests?status=pending`
- `PATCH /api/hcm/requests/{requestId}`

State API:

- `GET /api/hcm/state`
- `POST /api/hcm/state`
- `PATCH /api/hcm/state`
- `DELETE /api/hcm/state`

No auth for the state API, per take-home decision.

## Key State Rules

- Submit request: optimistic UI reserves `pendingDays`.
- HCM submit success: pending reservation persists.
- HCM rejection: pending reservation rolls back.
- Manager approval: verifies per-cell balance, then converts pending days into consumed balance.
- Manager denial: releases pending days.
- Changed-but-sufficient approval: manager must confirm again.
- Final approval conflicts remain `conflict_needs_review` until manager re-review.

## Query Strategy

Query keys:

- `["balances", "batch"]`
- `["balance", employeeId, locationId]`
- `["requests", "pending"]`
- `["requests", "employee", employeeId]`

Use `refetchInterval: 30_000` while visible for batch reconciliation. Use targeted per-cell reads before submit and approval. Disable automatic mutation retries for writes; expose manual retry after the `5 second` timeout.

## Verification Commands

Planned scripts:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:storybook
npm run test:e2e
npm run build
npm run storybook
```

Setup commands to document, not yet run:

```bash
npm install -D typescript @types/node @types/react @types/react-dom
npm install @tanstack/react-query zod
npx shadcn@latest init
npx shadcn@latest add button card table badge alert skeleton tabs tooltip dialog sheet form input select textarea sonner
```

Official shadcn setup reference: `https://ui.shadcn.com/docs/installation/next`.

## Risks

- In-memory state resets on process restart; acceptable for take-home and deterministic tests.
- Next dev hot reload can reset module state; README should explain `/api/hcm/state` reset/setup.
- Storybook fixtures can drift from domain types; mitigate by importing shared TypeScript types and fixtures.
- Too much UI polish could distract from state rigor; vertical slices should keep tests attached to each state.

## Review Checklist

- Correct layer: UI, query, client, server mock, and state API are separated.
- Existing repo shape respected: single Next app, no packages/monorepo.
- New boundaries are inside `src/`, approved.
- Verification commands are executable once dependencies/scripts are added.
- Alternatives were explicit: custom state, SWR, TanStack Query.
- Remaining open questions: none blocking.
