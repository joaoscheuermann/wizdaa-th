import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as getBatch } from "@/app/api/hcm/balances/batch/route"
import {
  GET as getBalanceCell,
  PATCH as patchBalanceCell,
} from "@/app/api/hcm/balances/route"
import type {
  BalanceBatchResponse,
  BalanceCellResponse,
} from "@/domain/time-off/types"
import { HCM_SLOW_READ_DELAY_MS } from "@/server/hcm/scenarios"
import { patchHcmState, resetHcmState } from "@/server/hcm/state-store"

const balanceRequest = (url: string, body?: unknown) =>
  new Request(url, {
    method: body ? "PATCH" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  })

describe("/api/hcm/balances", () => {
  beforeEach(() => {
    resetHcmState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns the product-facing batch balance corpus", async () => {
    const response = await getBatch()
    const body = (await response.json()) as BalanceBatchResponse

    expect(response.status).toBe(200)
    expect(body.balances).toHaveLength(7)
    expect(body.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employeeId: "emp-avery",
          employeeName: "Avery Stone",
          locationId: "loc-nyc",
          locationName: "New York HQ",
          availableDays: 24,
          effectiveAvailableDays: 24,
          freshnessStatus: "fresh",
        }),
        expect.objectContaining({
          employeeId: "emp-jordan",
          employeeName: "Jordan Lee",
          locationId: "loc-nyc",
          locationName: "New York HQ",
          availableDays: 1,
          effectiveAvailableDays: 1,
        }),
        expect.objectContaining({
          employeeId: "mgr-morgan",
          employeeName: "Morgan Patel",
          locationId: "loc-nyc",
          locationName: "New York HQ",
          availableDays: 18,
          effectiveAvailableDays: 18,
        }),
      ])
    )
  })

  it("delays product reads in slow read scenario mode", async () => {
    vi.useFakeTimers()
    patchHcmState({
      scenario: {
        mode: "slow_read",
        updatedAt: "2026-04-28T13:00:00.000Z",
      },
    })

    let resolved = false
    const responsePromise = getBatch().then((response) => {
      resolved = true
      return response
    })

    await vi.advanceTimersByTimeAsync(HCM_SLOW_READ_DELAY_MS - 1)

    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    const response = await responsePromise
    const body = (await response.json()) as BalanceBatchResponse

    expect(response.status).toBe(200)
    expect(body.balances).toHaveLength(7)
  })

  it("writes and reads an authoritative per-cell balance", async () => {
    const patchResponse = await patchBalanceCell(
      balanceRequest("http://localhost/api/hcm/balances", {
        employeeId: "emp-jordan",
        locationId: "loc-nyc",
        availableDays: 6.5,
        pendingDays: 1,
      })
    )
    const patchBody = (await patchResponse.json()) as BalanceCellResponse

    expect(patchResponse.status).toBe(200)
    expect(patchBody.balance).toMatchObject({
      employeeId: "emp-jordan",
      locationId: "loc-nyc",
      availableDays: 6.5,
      pendingDays: 1,
      effectiveAvailableDays: 5.5,
      version: 2,
    })

    const readResponse = await getBalanceCell(
      balanceRequest(
        "http://localhost/api/hcm/balances?employeeId=emp-jordan&locationId=loc-nyc"
      )
    )
    const readBody = (await readResponse.json()) as BalanceCellResponse

    expect(readResponse.status).toBe(200)
    expect(readBody.balance).toMatchObject({
      employeeId: "emp-jordan",
      locationId: "loc-nyc",
      availableDays: 6.5,
      pendingDays: 1,
      effectiveAvailableDays: 5.5,
      freshnessStatus: "fresh",
    })
  })
})
