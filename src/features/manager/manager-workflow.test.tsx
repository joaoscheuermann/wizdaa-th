import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ReconciliationBanner } from "@/components/common/reconciliation-banner"
import { ManagerDecisionPanel } from "@/features/manager/manager-decision-panel"
import { ManagerWorkspace } from "@/features/manager/manager-workspace"
import { PendingRequestQueue } from "@/features/manager/pending-request-queue"
import { installHcmFixtureFetch } from "@/test/hcm-fixture-fetch"
import { renderWithQueryClient } from "@/test/render-with-query-client"

describe("manager workflow components", () => {
  let restoreFetch: (() => void) | null = null

  afterEach(() => {
    cleanup()
    restoreFetch?.()
    restoreFetch = null
  })

  it("renders the pending-request queue as an explicit selectable list", async () => {
    const user = userEvent.setup()
    const onSelectRequest = vi.fn()

    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(
      <PendingRequestQueue
        selectedRequestId={null}
        onSelectRequest={onSelectRequest}
      />
    )

    const request = await screen.findByRole("button", {
      name: /Review Jordan Lee Austin Studio/i,
    })

    expect(request).toHaveAttribute("aria-pressed", "false")
    expect(onSelectRequest).not.toHaveBeenCalled()

    await user.click(request)

    expect(onSelectRequest).toHaveBeenCalledWith("req-seeded-pending")
  })

  it("opens a decision modal from a pending-request click", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(<ManagerWorkspace />)

    expect(
      await screen.findByRole("heading", { name: "All employee balances" })
    ).toBeInTheDocument()

    await user.click(
      await screen.findByRole("button", {
        name: /Review Jordan Lee Austin Studio/i,
      })
    )

    const dialog = await screen.findByRole("dialog")

    expect(
      within(dialog).getByRole("heading", { name: "Review pending request" })
    ).toBeInTheDocument()
    expect(
      await within(dialog).findByLabelText("Denial reason")
    ).toBeInTheDocument()

    await user.type(
      within(dialog).getByLabelText("Denial reason"),
      "Coverage gap during launch week"
    )
    await user.click(within(dialog).getByRole("button", { name: /deny/i }))

    expect(await within(dialog).findByRole("status")).toHaveTextContent(
      "Austin Studio request denied."
    )
  })

  it("requires a denial reason before saving a denial", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(
      <ManagerDecisionPanel selectedRequestId="req-seeded-pending" />
    )

    await screen.findByText("Jordan Lee")
    await user.click(screen.getByRole("button", { name: /deny/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a denial reason."
    )
  })

  it("approves and denies pending requests with status announcements", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(
      <ManagerDecisionPanel selectedRequestId="req-seeded-pending" />
    )

    const approveButton = await screen.findByRole("button", {
      name: /approve/i,
    })

    await waitFor(() => expect(approveButton).toBeEnabled())
    await user.click(approveButton)

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Austin Studio request approved."
    )
    restoreFetch()
    restoreFetch = null
    cleanup()

    restoreFetch = installHcmFixtureFetch()

    renderWithQueryClient(
      <ManagerDecisionPanel selectedRequestId="req-seeded-pending" />
    )

    await user.type(
      await screen.findByLabelText("Denial reason"),
      "Coverage gap during launch week"
    )
    await user.click(screen.getByRole("button", { name: /deny/i }))

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Austin Studio request denied."
    )
  })

  it("exposes retry after a retryable manager decision failure", async () => {
    const user = userEvent.setup()

    restoreFetch = installHcmFixtureFetch({ failFirstDecision: true })

    renderWithQueryClient(
      <ManagerDecisionPanel selectedRequestId="req-seeded-pending" />
    )

    await user.type(
      await screen.findByLabelText("Denial reason"),
      "Retry after HCM timeout"
    )
    await user.click(screen.getByRole("button", { name: /deny/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "HCM did not respond to the manager decision"
    )
    expect(
      screen.getByRole("button", { name: /retry decision/i })
    ).toBeEnabled()
  })

  it("uses a status role for reconciliation alerts", () => {
    renderWithQueryClient(
      <ReconciliationBanner
        message="Balance changed while a request action is pending."
        tone="warning"
      />
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Balance changed while a request action is pending."
    )
  })
})
