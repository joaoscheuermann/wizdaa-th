import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { PendingRequestQueue } from "@/features/manager/pending-request-queue"
import { conflictReviewRequest } from "@/test/time-off-fixtures"

const meta = {
  title: "Time Off/ManagerQueue",
  component: PendingRequestQueue,
  args: {
    onSelectRequest: fn(),
    selectedRequestId: null,
  },
} satisfies Meta<typeof PendingRequestQueue>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  parameters: {
    hcm: {
      statePatch: {
        requests: [],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText("No pending requests.")).toBeVisible()
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

export const Error: Story = {
  parameters: {
    hcm: {
      failPendingRequests: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByRole("alert")
    ).toHaveTextContent("Unable to load pending requests")
  },
}

export const SelectRequest: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const request = await canvas.findByRole("button", {
      name: /Review Jordan Lee Austin Studio/i,
    })

    await userEvent.click(request)

    await expect(args.onSelectRequest).toHaveBeenCalledWith("req-seeded-pending")
  },
}
