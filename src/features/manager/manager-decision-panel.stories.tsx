import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { ManagerDecisionPanel } from "@/features/manager/manager-decision-panel"
import { conflictReviewRequest } from "@/test/time-off-fixtures"

const meta = {
  title: "Time Off/ManagerDecisionPanel",
  component: ManagerDecisionPanel,
  args: {
    selectedRequestId: "req-seeded-pending",
  },
} satisfies Meta<typeof ManagerDecisionPanel>

export default meta

type Story = StoryObj<typeof meta>

export const FreshBalance: Story = {}

export const Default = FreshBalance

export const StaleBalanceRequiresVerification: Story = {
  parameters: {
    hcm: {
      batchFreshnessStatus: "stale",
    },
  },
}

export const ManagerApproval: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const approveButton = await canvas.findByRole("button", { name: /approve/i })

    await waitFor(() => expect(approveButton).toBeEnabled())
    await userEvent.click(approveButton)

    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Austin Studio request approved."
      )
    )
  },
}

export const ChangedButSufficientBalance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText("16.0 days")).toBeInTheDocument()
    await fetch("/api/hcm/state", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        balances: [
          {
            employeeId: "emp-jordan",
            locationId: "loc-austin",
            timeOffTypeId: "pto",
            availableDays: 18,
          },
        ],
      }),
    })
    await userEvent.click(canvas.getByRole("button", { name: /approve/i }))

    await expect(
      await canvas.findByText(/balance changed but can still cover/i)
    ).toBeInTheDocument()
  },
}

export const ApprovalPendingHcm: Story = {
  parameters: {
    hcm: {
      delayDecisionMs: 500,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const approveButton = await canvas.findByRole("button", { name: /approve/i })

    await waitFor(() => expect(approveButton).toBeEnabled())
    await userEvent.click(approveButton)
    await expect(approveButton).toBeDisabled()
  },
}

export const ApprovalRejectedByHcm: Story = {
  parameters: {
    hcm: {
      statePatch: {
        scenario: {
          mode: "conflict_on_approval",
          updatedAt: "2026-04-28T13:40:00.000Z",
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const approveButton = await canvas.findByRole("button", { name: /approve/i })

    await waitFor(() => expect(approveButton).toBeEnabled())
    await userEvent.click(approveButton)

    await expect(
      await canvas.findByText(/final approval conflict/i)
    ).toBeInTheDocument()
  },
}

export const SilentApprovalFailure: Story = {
  parameters: {
    hcm: {
      failFirstDecision: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const approveButton = await canvas.findByRole("button", { name: /approve/i })

    await waitFor(() => expect(approveButton).toBeEnabled())
    await userEvent.click(approveButton)

    await expect(
      await canvas.findByRole("alert")
    ).toHaveTextContent("HCM did not respond to the manager decision")
  },
}

export const ManagerDenial: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const denialReason = await canvas.findByLabelText("Denial reason")

    await userEvent.click(denialReason)
    await userEvent.paste("Coverage gap during launch week")
    await waitFor(() =>
      expect(denialReason).toHaveValue("Coverage gap during launch week")
    )
    await userEvent.click(canvas.getByRole("button", { name: /deny/i }))

    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Austin Studio request denied."
      )
    )
  },
}

export const DenialRetryableFailure: Story = {
  parameters: {
    hcm: {
      failFirstDecision: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const denialReason = await canvas.findByLabelText("Denial reason")

    await userEvent.click(denialReason)
    await userEvent.paste("Retry after HCM timeout")
    await waitFor(() =>
      expect(denialReason).toHaveValue("Retry after HCM timeout")
    )
    await userEvent.click(canvas.getByRole("button", { name: /deny/i }))
    await userEvent.click(
      await canvas.findByRole("button", { name: /retry decision/i })
    )

    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent(
        "Austin Studio request denied."
      )
    )
  },
}

export const ConflictNeedsReview: Story = {
  args: {
    selectedRequestId: "req-conflict-review",
  },
  parameters: {
    hcm: {
      statePatch: {
        requests: [conflictReviewRequest],
      },
    },
  },
}
