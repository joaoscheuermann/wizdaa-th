---
name: project-index
description: Spectacular repository map and file index. Use when Codex needs quick context about this repo, its layout, files, local agent skills, planning notes, coding, reviewing, or debugging.
---

# Project Index

Last updated: 2026-04-28

This skill gives agents a compact map of the current Spectacular repository checkout. It indexes source-controlled and unignored project files for the ExampleHR time-off Next.js prototype, while keeping generated, dependency, and local-only outputs out of startup context.

Omitted intentionally:

- `.git/` - Git object database and local repository metadata.
- `.next/`, `dist/`, `tmp/`, `out-tsc/`, `coverage/`, `playwright-report/`, `storybook-static/`, `out/`, `build/` - generated task outputs, reports, and caches.
- `.nx/cache/`, `.nx/workspace-data/` - generated Nx cache paths if this checkout later reintroduces Nx.
- `node_modules/` - installed npm dependencies.
- Ignored local-only `.journal/` files are omitted; the `.journal/` entries listed below are source-controlled or otherwise unignored in this checkout.

## Repository Summary

This checkout is a Next.js 16 App Router prototype for ExampleHR time-off workflows. The app has route-scoped employee and manager workspaces, employee balance and request flows, manager approval modals, in-memory mock HCM route handlers, deterministic scenario controls, Storybook coverage, Vitest unit/component tests, and Playwright end-to-end tests. Local `.agents/skills` files define the agent workflows used for requirements, architecture, implementation, debugging, verification, Nx-oriented tasks, CI monitoring, and this repository index.

## Tree

```text
.
|-- .agents/ - Local agent skills and UI metadata.
|   `-- skills/ - Workflow playbooks for specialized agent behavior.
|       |-- architect/
|       |   `-- SKILL.md - Architecture planning workflow for larger changes.
|       |-- coding-conventions/
|       |   |-- SKILL.md - Shared coding principles and implementation conventions.
|       |   `-- references/
|       |       |-- dependency-injection.md - Dependency injection guidance.
|       |       |-- dip.md - Dependency Inversion Principle reference.
|       |       |-- dry.md - DRY principle reference.
|       |       |-- early-returns.md - Early-return control flow guidance.
|       |       |-- functional-programming.md - Functional programming guidance.
|       |       |-- isp.md - Interface Segregation Principle reference.
|       |       |-- kiss.md - KISS principle reference.
|       |       |-- monodon-rust.md - Rust/Nx generator notes for applicable workspaces.
|       |       |-- nxlv-python.md - Python/Nx generator notes for applicable workspaces.
|       |       |-- ocp.md - Open/Closed Principle reference.
|       |       `-- srp.md - Single Responsibility Principle reference.
|       |-- debug-coordinator/
|       |   `-- SKILL.md - Journal-backed debugging coordination workflow.
|       |-- debugger/
|       |   `-- SKILL.md - Hypothesis-driven bug investigation workflow.
|       |-- decomposer/
|       |   `-- SKILL.md - Converts approved architecture into ordered efforts.
|       |-- developer/
|       |   `-- SKILL.md - Implements an approved journal effort.
|       |-- effort-executor/
|       |   `-- SKILL.md - Orchestrates sequential effort execution.
|       |-- generate-project-index/
|       |   |-- SKILL.md - Workflow for regenerating this index.
|       |   `-- agents/
|       |       `-- openai.yaml - UI metadata for the index generator skill.
|       |-- journal-manager/
|       |   `-- SKILL.md - Protocol for reading and updating `.journal` entries.
|       |-- link-workspace-packages/
|       |   `-- SKILL.md - Workspace package linking workflow for monorepos.
|       |-- monitor-ci/
|       |   |-- SKILL.md - Nx Cloud CI monitoring and self-healing workflow.
|       |   |-- references/
|       |   |   `-- fix-flows.md - CI remediation reference flows.
|       |   `-- scripts/
|       |       |-- ci-poll-decide.mjs - Polls CI state and decides next actions.
|       |       `-- ci-state-update.mjs - Updates persisted CI monitoring state.
|       |-- nx-generate/
|       |   `-- SKILL.md - Nx generator workflow for scaffolding projects.
|       |-- nx-import/
|       |   |-- SKILL.md - Nx repository import workflow.
|       |   `-- references/
|       |       |-- ESLINT.md - ESLint import notes.
|       |       |-- GRADLE.md - Gradle import notes.
|       |       |-- JEST.md - Jest import notes.
|       |       |-- NEXT.md - Next.js import notes.
|       |       |-- TURBOREPO.md - Turborepo import notes.
|       |       `-- VITE.md - Vite import notes.
|       |-- nx-plugins/
|       |   `-- SKILL.md - Nx plugin discovery and installation workflow.
|       |-- nx-run-tasks/
|       |   `-- SKILL.md - Nx target execution workflow.
|       |-- nx-workspace/
|       |   |-- SKILL.md - Nx workspace exploration workflow.
|       |   `-- references/
|       |       `-- AFFECTED.md - Nx affected-command guidance.
|       |-- project-index/
|       |   |-- SKILL.md - This repository map for quick context.
|       |   `-- agents/
|       |       `-- openai.yaml - UI metadata for this skill.
|       |-- spec/
|       |   `-- SKILL.md - Requirements, user stories, and acceptance criteria workflow.
|       `-- tester/
|           `-- SKILL.md - Test and verification workflow.
|-- .journal/ - Source-controlled planning and delivery notes in this checkout.
|   `-- 04-2026/
|       |-- 28-04-2026-pto-url-modal-layout/
|       |   |-- bugs/
|       |   |   `-- .gitkeep - Keeps the bug-log directory present.
|       |   |-- decisions.md - Decision log for route URL and modal layout work.
|       |   |-- efforts/
|       |   |   |-- .gitkeep - Keeps the effort directory present.
|       |   |   |-- 01-route-user-resolution.md - Route user resolution implementation effort.
|       |   |   |-- 02-requested-pto-table-modal.md - Requested PTO table and modal effort.
|       |   |   |-- 03-employee-manager-scoping.md - Employee and manager scoping effort.
|       |   |   |-- 04-manager-layout-decision-modal.md - Manager layout and decision modal effort.
|       |   |   `-- 05-verification-docs.md - Verification and documentation effort.
|       |   `-- ticket.md - Route URL and modal layout ticket.
|       `-- 28-04-2026-time-off-architecture/
|           |-- bugs/
|           |   `-- .gitkeep - Keeps the bug-log directory present.
|           |-- decisions.md - Decision log for the time-off architecture work.
|           |-- efforts/
|           |   |-- .gitkeep - Keeps the effort directory present.
|           |   |-- 01-foundation-app-shell.md - Foundation app shell effort.
|           |   |-- 02-balance-hydration-slice.md - Balance hydration slice effort.
|           |   |-- 03-employee-request-slice.md - Employee request slice effort.
|           |   |-- 04-manager-decision-slice.md - Manager decision slice effort.
|           |   |-- 05-reconciliation-slice.md - Reconciliation slice effort.
|           |   |-- 06-failure-scenarios-slice.md - Failure scenario slice effort.
|           |   `-- 07-storybook-tests-docs.md - Storybook, tests, and docs effort.
|           `-- ticket.md - Architecture ticket and implementation plan.
|-- .storybook/
|   |-- main.ts - Storybook configuration for Next.js Vite stories.
|   `-- preview.tsx - Storybook decorators and global preview setup.
|-- public/
|   |-- file.svg - Default Next public file icon.
|   |-- globe.svg - Default Next public globe icon.
|   |-- next.svg - Default Next public Next.js logo.
|   |-- vercel.svg - Default Next public Vercel logo.
|   `-- window.svg - Default Next public window icon.
|-- src/
|   |-- app/
|   |   |-- [id]/
|   |   |   `-- page.tsx - Dynamic route page that passes the seeded user id into the app shell.
|   |   |-- api/
|   |   |   `-- hcm/
|   |   |       |-- balances/
|   |   |       |   |-- batch/
|   |   |       |   |   `-- route.ts - Batch balance GET route.
|   |   |       |   `-- route.ts - Single balance read and patch route.
|   |   |       |-- requests/
|   |   |       |   |-- [requestId]/
|   |   |       |   |   `-- route.ts - Manager decision PATCH route.
|   |   |       |   `-- route.ts - Employee request list, pending list, and submit route.
|   |   |       |-- state/
|   |   |       |   `-- route.ts - Mock HCM state inspect, replace, patch, and reset route.
|   |   |       `-- users/
|   |   |           `-- [userId]/
|   |   |               `-- route.ts - Route user lookup endpoint.
|   |   |-- favicon.ico - App favicon.
|   |   |-- globals.css - Tailwind v4 theme tokens and global styles.
|   |   |-- layout.tsx - Root layout, fonts, metadata, and query client provider.
|   |   `-- page.tsx - Root route redirect to the default seeded employee.
|   |-- components/
|   |   |-- common/
|   |   |   |-- app-shell.test.tsx - App shell route, role, and workflow tests.
|   |   |   |-- app-shell.tsx - Route-scoped employee and manager shell.
|   |   |   |-- balance-freshness-indicator.tsx - Balance freshness status UI.
|   |   |   |-- reconciliation-banner.stories.tsx - Storybook coverage for reconciliation states.
|   |   |   `-- reconciliation-banner.tsx - Reconciliation and conflict banner UI.
|   |   `-- ui/
|   |       |-- avatar.tsx - Base UI avatar primitives and grouped avatar helpers.
|   |       |-- badge.tsx - Badge primitive with status variants.
|   |       |-- button.tsx - Button primitive with icon and size variants.
|   |       |-- card.tsx - Card primitive and card subcomponents.
|   |       |-- dialog.tsx - Base UI dialog primitives and styled modal content.
|   |       |-- table.tsx - Table primitives for scrollable data tables.
|   |       `-- tabs.tsx - Tabs primitive.
|   |-- domain/
|   |   `-- time-off/
|   |       |-- constants.ts - Time-off demo constants and thresholds.
|   |       |-- freshness.test.ts - Freshness and effective-balance tests.
|   |       |-- freshness.ts - Freshness and effective-balance helpers.
|   |       |-- lifecycle.ts - Request lifecycle labels, predicates, and sorting helpers.
|   |       |-- reconciliation.ts - Client reconciliation helpers.
|   |       |-- schemas.test.ts - HCM state and request validation tests.
|   |       |-- schemas.ts - Runtime normalization and validation functions.
|   |       `-- types.ts - Shared time-off, HCM, and API response types.
|   |-- features/
|   |   |-- employee/
|   |   |   |-- balance-summary.stories.tsx - Balance summary stories.
|   |   |   |-- balance-summary.test.tsx - Balance summary component tests.
|   |   |   |-- balance-summary.tsx - Employee balance grid and refresh UI.
|   |   |   |-- request-form.stories.tsx - Request form stories.
|   |   |   |-- request-form.test.tsx - Request form tests.
|   |   |   |-- request-form.tsx - Employee request submission form.
|   |   |   |-- request-pto-modal.stories.tsx - Request PTO modal stories.
|   |   |   |-- request-pto-modal.test.tsx - Request PTO modal tests.
|   |   |   |-- request-pto-modal.tsx - Dialog wrapper for creating a route-scoped PTO request.
|   |   |   |-- request-timeline.stories.tsx - Request timeline stories.
|   |   |   |-- request-timeline.test.tsx - Request timeline tests.
|   |   |   |-- request-timeline.tsx - Employee request history timeline.
|   |   |   |-- requested-pto-table.stories.tsx - Requested PTO table stories.
|   |   |   |-- requested-pto-table.test.tsx - Requested PTO table tests.
|   |   |   `-- requested-pto-table.tsx - Employee request table with loading, empty, error, and status rows.
|   |   `-- manager/
|   |       |-- all-employee-balances-table.stories.tsx - Manager balance table stories.
|   |       |-- all-employee-balances-table.tsx - Manager-visible balance corpus table with refresh/reconciliation UI.
|   |       |-- manager-decision-modal.stories.tsx - Manager decision modal stories.
|   |       |-- manager-decision-modal.tsx - Dialog wrapper around the manager decision panel.
|   |       |-- manager-decision-panel.stories.tsx - Manager decision panel stories.
|   |       |-- manager-decision-panel.tsx - Approval, denial, retry, and reconfirmation UI.
|   |       |-- manager-workflow.test.tsx - Manager workflow component tests.
|   |       |-- manager-workspace.stories.tsx - Manager workspace stories.
|   |       |-- manager-workspace.tsx - Manager review layout connecting balances, queue, and decision modal.
|   |       |-- pending-request-queue.stories.tsx - Pending request queue stories.
|   |       `-- pending-request-queue.tsx - Manager pending request list and selection controls.
|   |-- lib/
|   |   |-- hcm-client/
|   |   |   |-- client.test.ts - Browser HCM client tests.
|   |   |   |-- client.ts - Fetch-based HCM client with timeout/error handling.
|   |   |   `-- errors.ts - HCM client error class and retryability helpers.
|   |   |-- queries/
|   |   |   |-- balance-queries.ts - React Query balance query hooks and imperative refetch helper.
|   |   |   |-- query-client-provider.tsx - Query client provider component.
|   |   |   |-- query-keys.ts - Query key factories.
|   |   |   |-- request-mutations.ts - Request and decision query/mutation hooks.
|   |   |   `-- user-queries.ts - Route user lookup query hook.
|   |   `-- utils.ts - Shared class-name utility.
|   |-- server/
|   |   `-- hcm/
|   |       |-- seed/
|   |       |   `-- default-state.json - Seed employees, locations, balances, requests, and scenario state.
|   |       |-- balance-api.test.ts - Balance route/service tests.
|   |       |-- balance-api.ts - Server balance API functions.
|   |       |-- hcm-service.ts - Request submission and manager decision domain service.
|   |       |-- request-api.test.ts - Request API tests.
|   |       |-- request-api.ts - Server request API functions.
|   |       |-- scenarios.ts - Deterministic HCM scenario mode predicates.
|   |       |-- state-api.test.ts - State API tests.
|   |       |-- state-api.ts - Server state API functions and error response helper.
|   |       |-- state-store.ts - In-memory mock HCM state store.
|   |       |-- user-api.test.ts - Route user lookup API tests.
|   |       `-- user-api.ts - Server user lookup API functions.
|   `-- test/
|       |-- hcm-fixture-fetch.ts - Fixture-backed fetch helper for stories/tests.
|       |-- render-with-query-client.tsx - React Testing Library query-client render helper.
|       `-- time-off-fixtures.ts - Shared time-off test fixtures.
|-- tests/
|   `-- e2e/
|       `-- time-off.spec.ts - Playwright end-to-end time-off workflow tests.
|-- .gitignore - Ignore rules for generated files and local dependencies.
|-- AGENTS.md - Repository instruction requiring Next docs review before Next code edits.
|-- CLAUDE.md - Claude-facing repository notes.
|-- README.md - Setup, run, Storybook, verification, and mock HCM API docs.
|-- TRD.md - Time-off take-home requirements and technical design reference.
|-- components.json - shadcn/ui component configuration.
|-- eslint.config.mjs - ESLint flat config.
|-- next.config.mjs - Next.js configuration.
|-- package-lock.json - Locked npm dependency graph.
|-- package.json - npm scripts and Next/React/test dependencies.
|-- playwright.config.ts - Playwright browser test configuration.
|-- postcss.config.mjs - Tailwind PostCSS configuration.
|-- tsconfig.json - TypeScript compiler configuration with `@/*` path alias.
|-- vitest.config.mts - Vitest unit/component test configuration.
|-- vitest.setup.ts - Vitest DOM assertion setup.
`-- vitest.storybook.config.ts - Storybook interaction test configuration.
```

## Working Notes For Agents

- This checkout currently has no `nx.json` or `Cargo.toml`. Use npm scripts first: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:storybook`, `npm run test:e2e`, and `npm run build`.
- If Nx files are reintroduced, load the Nx workspace skills and prefer repo-native targets over ad hoc scripts. If Cargo files are reintroduced, check the workspace manifest before touching Rust crates.
- Before editing Next.js code, follow `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` because this repo uses Next.js 16.2.4 with breaking changes relative to older Next versions.
- The local `.agents/skills` files are real agent workflow instructions, not application runtime features. Do not confuse those docs with the ExampleHR product surface.
- The mock HCM integration is real in-process route-handler state, not a UI-only placeholder. Server behavior lives under `src/server/hcm`, API routes under `src/app/api/hcm`, and browser access under `src/lib/hcm-client`.
- Scenario modes are controlled through `/api/hcm/state` and cover slow reads/writes, insufficient balance, invalid dimensions, silent contradictions, conflicts, and mid-session balance changes.
- Route users are seeded as `/emp-avery`, `/emp-jordan`, and `/mgr-morgan`; the root route redirects to the default employee.
- Read `.journal/` when the task concerns the existing architecture ticket, route/modal layout work, effort execution, decisions, or debugging history. Otherwise treat app source, tests, and README as the primary context.
- Use local agent skills from `.agents/skills` when a task names one or clearly matches its workflow.
