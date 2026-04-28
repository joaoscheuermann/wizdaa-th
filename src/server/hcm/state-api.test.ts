import { describe, expect, it } from "vitest"

import {
  DELETE as resetState,
  GET as getState,
  PATCH as patchState,
  POST as replaceState,
} from "@/app/api/hcm/state/route"
import type { HcmState } from "@/domain/time-off/types"

const stateRequest = (body: unknown) =>
  new Request("http://localhost/api/hcm/state", {
    method: "POST",
    body: JSON.stringify(body),
  })

const patchRequest = (body: unknown) =>
  new Request("http://localhost/api/hcm/state", {
    method: "PATCH",
    body: JSON.stringify(body),
  })

const readState = async (response: Response) =>
  (await response.json()) as HcmState

describe("/api/hcm/state", () => {
  it("returns current state and resets mutations back to the default seed", async () => {
    const seed = await readState(getState())
    const changedState: HcmState = {
      ...seed,
      balances: seed.balances.map((balance, index) =>
        index === 0
          ? {
              ...balance,
              availableDays: 99,
            }
          : balance
      ),
    }

    const replaceResponse = await replaceState(stateRequest(changedState))

    expect(replaceResponse.status).toBe(200)

    const changed = await readState(getState())

    expect(changed.balances[0]?.availableDays).toBe(99)

    const reset = await readState(resetState())

    expect(reset.balances[0]?.availableDays).toBe(seed.balances[0]?.availableDays)
    expect(reset.employees.map((employee) => employee.id)).toEqual([
      "emp-avery",
      "emp-jordan",
      "mgr-morgan",
    ])
  })

  it("patches a single balance without wiping unrelated balance rows", async () => {
    const seed = await readState(resetState())

    const response = await patchState(
      patchRequest({
        balances: [
          {
            employeeId: "emp-avery",
            locationId: "loc-nyc",
            timeOffTypeId: "pto",
            availableDays: 29,
          },
        ],
      })
    )
    const patched = await readState(response)

    expect(response.status).toBe(200)
    expect(patched.balances).toHaveLength(seed.balances.length)
    expect(
      patched.balances.find(
        (balance) =>
          balance.employeeId === "emp-avery" &&
          balance.locationId === "loc-nyc"
      )
    ).toMatchObject({
      availableDays: 29,
      version: 2,
    })
    expect(
      patched.balances.find(
        (balance) =>
          balance.employeeId === "emp-avery" &&
          balance.locationId === "loc-austin"
      )
    ).toEqual(
      seed.balances.find(
        (balance) =>
          balance.employeeId === "emp-avery" &&
          balance.locationId === "loc-austin"
      )
    )
  })

  it("patches deterministic scenario mode through the state API", async () => {
    await resetState()

    const response = await patchState(
      patchRequest({
        scenario: {
          mode: "silent_wrong_success",
          updatedAt: "2026-04-28T13:00:00.000Z",
        },
      })
    )
    const patched = await readState(response)

    expect(response.status).toBe(200)
    expect(patched.scenario).toEqual({
      mode: "silent_wrong_success",
      updatedAt: "2026-04-28T13:00:00.000Z",
    })

    const anniversaryResponse = await patchState(
      patchRequest({
        scenario: {
          mode: "anniversary_bonus_mid_session",
          updatedAt: "2026-04-28T13:05:00.000Z",
        },
      })
    )
    const anniversary = await readState(anniversaryResponse)

    expect(anniversaryResponse.status).toBe(200)
    expect(anniversary.scenario).toEqual({
      mode: "anniversary_bonus_mid_session",
      updatedAt: "2026-04-28T13:05:00.000Z",
    })
  })

  it("rejects unknown scenario modes", async () => {
    await resetState()

    const response = await patchState(
      patchRequest({
        scenario: {
          mode: "does_not_exist",
        },
      })
    )

    expect(response.status).toBe(400)
  })
})
