import { afterEach, describe, expect, it, vi } from "vitest"

import { HCM_WRITE_TIMEOUT_MS } from "@/domain/time-off/constants"
import { getUser, submitTimeOffRequest } from "@/lib/hcm-client/client"
import { HcmClientError } from "@/lib/hcm-client/errors"

const validSubmission = {
  employeeId: "emp-avery",
  locationId: "loc-nyc",
  timeOffTypeId: "pto",
  requestedDays: 1,
  startDate: "2026-05-18",
  endDate: "2026-05-18",
}

const createAbortableHangingFetch = () =>
  vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal

    return new Promise<Response>((_resolve, reject) => {
      signal?.addEventListener("abort", () => {
        const error = new Error("Aborted")

        error.name = "AbortError"
        reject(error)
      })
    })
  })

describe("HCM client write timeout", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("times out slow writes after 5 seconds without automatic retries", async () => {
    vi.useFakeTimers()

    const fetchMock = createAbortableHangingFetch()

    vi.stubGlobal("fetch", fetchMock)

    const request = submitTimeOffRequest(validSubmission).catch(
      (error: unknown) => error
    )

    await vi.advanceTimersByTimeAsync(HCM_WRITE_TIMEOUT_MS)

    await expect(request).resolves.toMatchObject({
      code: "write_timeout",
      status: 504,
    } satisfies Partial<HcmClientError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("HCM client user lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads a seeded route user", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        user: {
          id: "mgr-morgan",
          name: "Morgan Patel",
          role: "manager",
        },
      })
    )

    vi.stubGlobal("fetch", fetchMock)

    await expect(getUser("mgr-morgan")).resolves.toEqual({
      user: {
        id: "mgr-morgan",
        name: "Morgan Patel",
        role: "manager",
      },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/hcm/users/mgr-morgan",
      {}
    )
  })

  it("surfaces unknown route users as client errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "user_not_found",
              message: 'No seeded ExampleHR user exists for "not-a-user".',
            },
          },
          { status: 404 }
        )
      )
    )

    await expect(getUser("not-a-user")).rejects.toMatchObject({
      code: "user_not_found",
      message: 'No seeded ExampleHR user exists for "not-a-user".',
      status: 404,
    } satisfies Partial<HcmClientError>)
  })
})
