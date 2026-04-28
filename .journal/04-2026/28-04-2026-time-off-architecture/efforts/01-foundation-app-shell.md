---
status: done
order: 1
created: 2026-04-28 13:22
title: "Foundation App Shell"
---

## Description

Create the runnable TypeScript foundation for the take-home app. This effort migrates the minimal JavaScript Next scaffold to TypeScript, initializes the planned tooling surface, adds shadcn/ui foundation components, configures TanStack Query provider wiring, and replaces the default page with an ExampleHR app shell that can switch between seeded Employee and Manager roles.

## Objective

After this effort, a reviewer can run the app and see an ExampleHR Time-Off shell with role switching and placeholder employee/manager panels, while lint/typecheck/build scripts establish the baseline for later slices.

## Implementation Details

- Migrate `src/app/layout.js` and `src/app/page.js` to `layout.tsx` and `page.tsx`.
- Add TypeScript config and type dependencies using npm, preserving `package-lock.json`.
- Initialize shadcn/ui for the existing `src` alias and add the first required UI components needed by the shell.
- Add `src/lib/queries/query-client-provider.tsx` with TanStack Query provider setup.
- Add initial `src/domain/time-off/constants.ts` for demo freshness/write-timeout constants and fixed demo timezone.
- Add `src/components/common/app-shell.tsx` or equivalent shell component with Employee and Manager role tabs/selector.
- Keep mock HCM, request lifecycle, and real data fetching out of this effort except for enough placeholder content to show the shell is wired.
- Add or update npm scripts for `typecheck`, `build`, `lint`, and `test` as baseline verification commands.
- Configure the initial test runner setup enough to run at least one smoke/component test for the app shell.

## Verification Criteria

- Run `npm run dev` and observe the ExampleHR shell with role switching between Employee and Manager placeholder panels.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run test` and observe the app-shell smoke/component test pass.
- Run `npm run build`.

## Done

- The app runs as a TypeScript Next app.
- The first screen is the usable ExampleHR shell, not the default create-next-app page.
- shadcn/ui and TanStack Query provider wiring are present and used by the app shell.
- A human can run the dev server and visibly switch between Employee and Manager modes.
- Baseline automated test tooling exists and proves the shell renders.

## Change Summary

Implemented Effort 1 only.

Files created:

- `components.json`
- `postcss.config.mjs`
- `tsconfig.json`
- `vitest.config.mts`
- `vitest.setup.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/common/app-shell.tsx`
- `src/components/common/app-shell.test.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/badge.tsx`
- `src/domain/time-off/constants.ts`
- `src/lib/queries/query-client-provider.tsx`
- `src/lib/utils.ts`

Files modified:

- `package.json`
- `package-lock.json`
- `src/app/globals.css`

Files deleted:

- `jsconfig.json`
- `src/app/layout.js`
- `src/app/page.js`
- `src/app/page.module.css`

Key decisions and trade-offs:

- Used the current shadcn CLI to initialize Tailwind/shadcn instead of hand-writing component primitives.
- Kept `src/app/page.tsx` as a small Server Component and placed TanStack Query in a client provider at `src/lib/queries/query-client-provider.tsx`.
- Kept the app shell responsible only for role switching and placeholder panels; HCM mocks and real data fetching remain for later efforts.

Deviations:

- No material deviations.
- Used Vite 8 native `resolve.tsconfigPaths` in Vitest instead of retaining `vite-tsconfig-paths`, because the installed Vitest/Vite combination warned that the plugin is obsolete.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed with one app-shell smoke/component test.
- `npm run build` passed.
- `npm run dev` ran at `http://localhost:3000`; HTTP check returned 200 and confirmed the ExampleHR shell content.

Notes:

- npm reported two moderate audit findings.
- npm reported Node engine warnings because this machine is on Node `v23.1.0`; verification still passed.
