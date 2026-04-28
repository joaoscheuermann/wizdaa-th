import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { AppShell } from "./app-shell"
import { renderWithQueryClient } from "@/test/render-with-query-client"
import { installHcmFixtureFetch } from "@/test/hcm-fixture-fetch"

const withQueryClient = (queryClient: QueryClient, ui: ReactElement) => (
  <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
)

describe("AppShell", () => {
  let restoreFetch: (() => void) | null = null

  afterEach(() => {
    cleanup()
    restoreFetch?.()
    restoreFetch = null
  })

  it("renders the employee workspace for the route user without role tabs", async () => {
    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<AppShell routeUserId="emp-avery" />)

    expect(
      await screen.findByRole("heading", { name: "Employee balances" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Requested PTO" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Request PTO" })
    ).toBeInTheDocument()
    expect(screen.getAllByText("Avery Stone").length).toBeGreaterThan(0)
    expect(await screen.findByText("No requested PTO yet.")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Jordan Lee" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("Seeded pending request placeholder for manager workflow.")
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /manager/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole("heading", { name: "Request timeline" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /submit request/i })
    ).not.toBeInTheDocument()
  })

  it("renders the manager workspace for a route manager", async () => {
    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<AppShell routeUserId="mgr-morgan" />)

    expect(
      await screen.findByRole("heading", { name: "Manager workspace" })
    ).toBeInTheDocument()
    expect(screen.getByText("Morgan Patel")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "All employee balances" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Employee balances" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Requested PTO" })
    ).toBeInTheDocument()
    expect(await screen.findByText("1 pending")).toBeInTheDocument()
    expect(await screen.findByText("0 total")).toBeInTheDocument()
    expect(screen.getByText("No requested PTO yet.")).toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })

  it("resets request modal state when the route user changes", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch()
    const { queryClient, rerender } = renderWithQueryClient(
      <AppShell routeUserId="emp-avery" />
    )

    await user.click(await screen.findByRole("button", { name: "Request PTO" }))
    await user.type(await screen.findByLabelText("Note"), "Route draft")

    rerender(
      withQueryClient(queryClient, <AppShell routeUserId="emp-jordan" />)
    )

    expect(await screen.findByText("Jordan Lee")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue("Route draft")).not.toBeInTheDocument()
  })

  it("shows a clear invalid-user state for unknown route users", async () => {
    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<AppShell routeUserId="not-a-user" />)

    expect(
      await screen.findByRole("heading", { name: "User not found" })
    ).toBeInTheDocument()
    expect(
      screen.getByText('No seeded ExampleHR user exists for "not-a-user".')
    ).toBeInTheDocument()
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument()
  })
})
