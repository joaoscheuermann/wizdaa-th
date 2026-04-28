# ExampleHR Time-Off

Next.js App Router prototype for the ExampleHR time-off take-home. The app uses
mock HCM route handlers for balances, employee requests, manager decisions, and
reviewer-controlled state scenarios.

## Setup

```bash
npm install
```

If Playwright browsers are not already installed on the machine:

```bash
npx playwright install chromium
```

## Run the App

```bash
npm run dev
```

Open a seeded route directly:

- [http://localhost:3000/emp-avery](http://localhost:3000/emp-avery) opens
  Avery Stone's employee workspace.
- [http://localhost:3000/emp-jordan](http://localhost:3000/emp-jordan) opens
  Jordan Lee's employee workspace with a seeded Austin pending request.
- [http://localhost:3000/mgr-morgan](http://localhost:3000/mgr-morgan) opens
  Morgan Patel's manager workspace plus Morgan's own self-service PTO table.

The root path redirects to `/emp-avery`. Unknown IDs, such as
`/not-a-seeded-user`, show a clear invalid-user state and list the valid seeded
paths instead of falling back to another employee.

The employee workspace loads route-scoped PTO balances, opens request creation
from the `Request PTO` icon button in the requested PTO table header, and
reconciles HCM changes. The manager workspace reviews pending requests in the
right column, opens the decision modal from a pending request, and verifies
balances before approval or denial.

Recommended smoke workflow after `npm run dev`:

1. Reset state with `curl -X DELETE http://localhost:3000/api/hcm/state`.
2. Open `/emp-avery`, click `Request PTO`, submit the default one-day New York
   request, and confirm the requested PTO table shows the new pending row.
3. Open `/mgr-morgan`, click `Review Avery Stone New York HQ`, approve in the
   decision modal, and use `Confirm approval` if HCM asks for reconfirmation.
4. Return to `/emp-avery` and confirm the requested PTO table shows the request
   as approved.
5. Open `/emp-jordan` to confirm Jordan's scoped data, then open an invalid path
   to confirm the invalid-user state.

## Storybook

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006). Stories use fixture-backed
`fetch` responses and do not mutate the live Next.js route-handler state.

Build Storybook:

```bash
npm run build-storybook
```

Run Storybook interaction tests:

```bash
npm run test:storybook
```

## Verification Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run test:storybook
npm run test:e2e
npm run build
```

Latest local verification snapshot, captured on 2026-04-28:

| Command | Result | Coverage purpose |
| --- | --- | --- |
| `npm run typecheck` | Passed | TypeScript contracts for route users, HCM payloads, request statuses, stories, and query state. |
| `npm run lint` | Passed | Static code-quality checks across the app, route handlers, tests, and Storybook stories. |
| `npm run test` | Passed: 14 files, 65 tests | Unit, component, and mock HCM integration coverage for validation, freshness, scoped employee data, request submission, rollback, manager decisions, state API, and scenario behavior. |
| `npm run test:storybook` | Passed: 11 files, 71 tests | Storybook interaction proof for employee submission, optimistic pending, rollback/retry, modal flows, manager approval/denial, HCM conflicts, and the explicit state matrix. |
| `npm run test:e2e` | Passed: 2 browser tests | End-to-end happy path and retryable HCM write failure path through the running Next.js app. |
| `npm run build` | Passed | Production Next.js build, route-handler compilation, and app route generation. |
| `npm run build-storybook` | Passed | Static Storybook build for local reviewer inspection. |

Coverage can be generated without enforcing an arbitrary gate:

```bash
npm run test:coverage
```

Use the terminal summary for statement, branch, function, and line coverage, and
open `coverage/index.html` for file-level gaps when preparing a reviewer report.

## Mock HCM State API

The mock HCM state is held in memory and seeded from
`src/server/hcm/seed/default-state.json`. Restarting the dev server or calling
`DELETE /api/hcm/state` resets it to the default seed.

Inspect the current state:

```bash
curl http://localhost:3000/api/hcm/state
```

Reset to the default seed:

```bash
curl -X DELETE http://localhost:3000/api/hcm/state
```

Replace the full state from a local JSON file:

```bash
curl -X POST http://localhost:3000/api/hcm/state \
  -H "Content-Type: application/json" \
  --data-binary @src/server/hcm/seed/default-state.json
```

Patch a deterministic scenario mode:

```bash
curl -X PATCH http://localhost:3000/api/hcm/state \
  -H "Content-Type: application/json" \
  -d "{\"scenario\":{\"mode\":\"silent_no_response\",\"updatedAt\":\"2026-04-28T13:10:00.000Z\"}}"
```

Supported scenario modes are `normal`, `slow_read`, `slow_write`,
`insufficient_balance`, `invalid_dimension`, `silent_wrong_success`,
`silent_no_response`, `conflict_on_submit`, `conflict_on_approval`, and
`anniversary_bonus_mid_session`.

Return to the happy path:

```bash
curl -X PATCH http://localhost:3000/api/hcm/state \
  -H "Content-Type: application/json" \
  -d "{\"scenario\":{\"mode\":\"normal\",\"updatedAt\":\"2026-04-28T13:20:00.000Z\"}}"
```

Patch Avery's New York balance to simulate an anniversary bonus while the app is
open:

```bash
curl -X PATCH http://localhost:3000/api/hcm/state \
  -H "Content-Type: application/json" \
  -d "{\"balances\":[{\"employeeId\":\"emp-avery\",\"locationId\":\"loc-nyc\",\"timeOffTypeId\":\"pto\",\"availableDays\":29}],\"scenario\":{\"mode\":\"anniversary_bonus_mid_session\",\"updatedAt\":\"2026-04-28T13:05:00.000Z\"}}"
```

The employee balance view reconciles the changed HCM balance on the next visible
batch refresh or after a targeted per-cell refresh.

Read the batch balance corpus:

```bash
curl http://localhost:3000/api/hcm/balances/batch
```

Read one authoritative employee/location balance cell:

```bash
curl "http://localhost:3000/api/hcm/balances?employeeId=emp-jordan&locationId=loc-nyc"
```

Patch one authoritative employee/location balance cell:

```bash
curl -X PATCH http://localhost:3000/api/hcm/balances \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"emp-jordan\",\"locationId\":\"loc-nyc\",\"availableDays\":6.5,\"pendingDays\":1}"
```
