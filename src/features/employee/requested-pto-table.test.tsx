import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { RequestedPtoTable } from "@/features/employee/requested-pto-table"
import { installHcmFixtureFetch } from "@/test/hcm-fixture-fetch"
import { renderWithQueryClient } from "@/test/render-with-query-client"

describe("RequestedPtoTable", () => {
  let restoreFetch: (() => void) | null = null

  afterEach(() => {
    cleanup()
    restoreFetch?.()
    restoreFetch = null
  })

  it("renders a loading state while requested PTO is unresolved", async () => {
    restoreFetch = installHcmFixtureFetch({ holdEmployeeRequests: true })

    renderWithQueryClient(<RequestedPtoTable employeeId="emp-avery" />)

    expect(await screen.findByText("Loading")).toBeInTheDocument()
    expect(screen.getByLabelText("Loading requested PTO")).toBeInTheDocument()
  })

  it("renders an empty state when the route employee has no requests", async () => {
    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<RequestedPtoTable employeeId="emp-avery" />)

    expect(await screen.findByText("No requested PTO yet.")).toBeInTheDocument()
    expect(screen.getByText("0 total")).toBeInTheDocument()
  })

  it("renders route-scoped requested PTO rows", async () => {
    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<RequestedPtoTable employeeId="emp-jordan" />)

    const table = await screen.findByRole("table", { name: "Requested PTO" })

    expect(within(table).getByText("Austin Studio")).toBeInTheDocument()
    expect(within(table).getByText("2.0 days")).toBeInTheDocument()
    expect(
      within(table).getByText("Pending manager review")
    ).toBeInTheDocument()
    expect(within(table).queryByText("New York HQ")).not.toBeInTheDocument()
  })

  it("scopes manager self-service to the manager employee record", async () => {
    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<RequestedPtoTable employeeId="mgr-morgan" />)

    expect(await screen.findByText("No requested PTO yet.")).toBeInTheDocument()
    expect(screen.getByText("0 total")).toBeInTheDocument()
    expect(
      screen.queryByText("Seeded pending request placeholder for manager workflow.")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("table", { name: "Requested PTO" })
    ).not.toBeInTheDocument()
  })

  it("renders an error state when employee requests fail", async () => {
    restoreFetch = installHcmFixtureFetch({ failEmployeeRequests: true })

    renderWithQueryClient(<RequestedPtoTable employeeId="emp-avery" />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load requested PTO"
    )
  })
})
