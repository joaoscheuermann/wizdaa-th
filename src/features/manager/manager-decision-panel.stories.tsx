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

export const Default: Story = {}

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

export const ManagerDenial: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const denialReason = await canvas.findByLabelText("Denial reason")

    await userEvent.type(denialReason, "Coverage gap during launch week")
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

    await userEvent.type(denialReason, "Retry after HCM timeout")
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
