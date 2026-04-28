import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BalanceSummary } from "@/features/employee/balance-summary"
import { queryKeys } from "@/lib/queries/query-keys"
import {
  getBalanceBatch,
  resetHcmState,
  writeBalanceCell,
} from "@/server/hcm/state-store"
import { renderWithQueryClient } from "@/test/render-with-query-client"

const stubBatchFetch = () => {
  resetHcmState()

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const body = getBalanceBatch()

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    })
  )
}

describe("BalanceSummary", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("renders only the route employee balances without an employee selector", async () => {
    stubBatchFetch()
    renderWithQueryClient(<BalanceSummary employeeId="emp-avery" />)

    expect(screen.getByText("Loading")).toBeInTheDocument()

    const newYork = await screen.findByRole("article", {
      name: /new york hq/i,
    })

    expect(within(newYork).getAllByText("24.0 days")).toHaveLength(2)
    expect(screen.getByText("Austin Studio")).toBeInTheDocument()
    expect(screen.getByText("6.0 days")).toBeInTheDocument()
    expect(screen.getByText("Remote Hub")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Avery Stone" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Jordan Lee" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument()
    expect(screen.queryByText("1.0 days")).not.toBeInTheDocument()
  })

  it("shows an empty state for a route employee without balance rows", async () => {
    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const body = getBalanceBatch()

        return jsonResponse({
          ...body,
          balances: body.balances.filter(
            (balance) => balance.employeeId !== "mgr-morgan"
          ),
        })
      })
    )

    renderWithQueryClient(<BalanceSummary employeeId="mgr-morgan" />)

    expect(await screen.findByText("No balances found.")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Avery Stone" })
    ).not.toBeInTheDocument()
  })

  it("shows a refreshed-balance message when background reconciliation changes a balance", async () => {
    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(getBalanceBatch()))
    )

    const { queryClient } = renderWithQueryClient(
      <BalanceSummary employeeId="emp-avery" />
    )

    const newYork = await screen.findByRole("article", {
      name: /new york hq/i,
    })

    expect(within(newYork).getAllByText("24.0 days")).toHaveLength(2)

    writeBalanceCell({
      employeeId: "emp-avery",
      locationId: "loc-nyc",
      availableDays: 29,
    })

    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.batch })

    expect(
      await screen.findByText(/Refreshed balance: New York HQ now shows/i)
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(within(newYork).getAllByText("29.0 days")).toHaveLength(2)
    )
  })

  it("keeps previous rows visible and marks refresh failed after a background error", async () => {
    let fetchCount = 0

    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        fetchCount += 1

        if (fetchCount === 1) return jsonResponse(getBalanceBatch())

        return jsonResponse(
          {
            error: {
              code: "hcm_unavailable",
              message: "HCM unavailable.",
            },
          },
          503
        )
      })
    )

    const { queryClient } = renderWithQueryClient(
      <BalanceSummary employeeId="emp-avery" />
    )

    const newYork = await screen.findByRole("article", {
      name: /new york hq/i,
    })

    expect(within(newYork).getAllByText("24.0 days")).toHaveLength(2)

    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.batch })

    expect(
      await screen.findByText(/Balance refresh failed/i)
    ).toBeInTheDocument()
    expect(within(newYork).getAllByText("24.0 days")).toHaveLength(2)
    expect(within(newYork).getByText("Refresh Failed")).toBeInTheDocument()
  })
})

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
