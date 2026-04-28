import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RequestPtoModal } from "@/features/employee/request-pto-modal"
import { RequestedPtoTable } from "@/features/employee/requested-pto-table"
import { installHcmFixtureFetch } from "@/test/hcm-fixture-fetch"
import { renderWithQueryClient } from "@/test/render-with-query-client"

type FetchCall = readonly [RequestInfo | URL, RequestInit?]

const getRequestPostCalls = (calls: readonly FetchCall[]) =>
  calls.filter(([input, init]) => {
    const method = init?.method?.toUpperCase()

    return input.toString().includes("/api/hcm/requests") && method === "POST"
  })

describe("RequestPtoModal", () => {
  let restoreFetch: (() => void) | null = null

  afterEach(() => {
    cleanup()
    restoreFetch?.()
    restoreFetch = null
    vi.restoreAllMocks()
  })

  it("opens a draft form and closes without creating a request", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch()
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    renderWithQueryClient(
      <div>
        <RequestPtoModal selectedEmployeeId="emp-avery" />
        <RequestedPtoTable employeeId="emp-avery" />
      </div>
    )

    await user.click(screen.getByRole("button", { name: "Request PTO" }))

    const dialog = await screen.findByRole("dialog", { name: "Request PTO" })

    expect(within(dialog).getByLabelText("Requested days")).toBeInTheDocument()
    expect(
      within(dialog).getAllByRole("heading", { name: "Request PTO" })
    ).toHaveLength(1)

    await user.click(screen.getByRole("button", { name: "Close" }))

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /submit request/i })
      ).not.toBeInTheDocument()
    )
    expect(getRequestPostCalls(fetchSpy.mock.calls)).toHaveLength(0)
    expect(await screen.findByText("No requested PTO yet.")).toBeInTheDocument()
  })

  it("submits from the modal, closes, and updates the requested PTO table", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch()
    renderWithQueryClient(
      <RequestedPtoTable
        employeeId="emp-avery"
        headerAction={<RequestPtoModal selectedEmployeeId="emp-avery" />}
      />
    )

    expect(await screen.findByText("No requested PTO yet.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Request PTO" }))

    const submitButton = await screen.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /submit request/i })
      ).not.toBeInTheDocument()
    )

    const table = await screen.findByRole("table", { name: "Requested PTO" })

    expect(within(table).getByText("New York HQ")).toBeInTheDocument()
    expect(
      within(table).getByText("Pending manager review")
    ).toBeInTheDocument()
  })
})
