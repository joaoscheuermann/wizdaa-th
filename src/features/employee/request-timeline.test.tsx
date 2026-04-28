import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RequestTimeline } from "@/features/employee/request-timeline"
import { listEmployeeRequests } from "@/server/hcm/hcm-service"
import {
  getHcmState,
  replaceHcmState,
  resetHcmState,
} from "@/server/hcm/state-store"
import { renderWithQueryClient } from "@/test/render-with-query-client"

const stubRequestsFetch = (resetState = true) => {
  if (resetState) resetHcmState()

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const body = listEmployeeRequests("emp-jordan")

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    })
  )
}

describe("RequestTimeline", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("renders pending manager-review requests in the employee timeline", async () => {
    stubRequestsFetch()
    renderWithQueryClient(<RequestTimeline employeeId="emp-jordan" />)

    const request = await screen.findByRole("article", {
      name: /austin studio/i,
    })

    expect(
      within(request).getByText("Pending manager review")
    ).toBeInTheDocument()
    expect(request).toHaveTextContent("2.0 days")
    expect(
      within(request).getByText(/seeded pending request/i)
    ).toBeInTheDocument()
  })

  it("renders denied requests with the manager reason", async () => {
    resetHcmState()

    const state = getHcmState()

    replaceHcmState({
      ...state,
      requests: state.requests.map((request) => ({
        ...request,
        status: "denied",
        statusReason: "Coverage gap during launch week",
        updatedAt: "2026-04-28T12:20:00.000Z",
      })),
    })
    stubRequestsFetch(false)
    renderWithQueryClient(<RequestTimeline employeeId="emp-jordan" />)

    const request = await screen.findByRole("article", {
      name: /austin studio/i,
    })

    expect(within(request).getByText("Denied")).toBeInTheDocument()
    expect(
      within(request).getByText("Reason: Coverage gap during launch week")
    ).toBeInTheDocument()
  })
})
