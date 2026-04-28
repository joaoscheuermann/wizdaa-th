import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { RequestTimeline } from "@/features/employee/request-timeline"
import {
  approvedRequest,
  conflictReviewRequest,
  deniedRequest,
  seededPendingRequest,
  syncFailedRetryableRequest,
} from "@/test/time-off-fixtures"

const meta = {
  title: "Time Off/RequestTimeline",
  component: RequestTimeline,
  args: {
    employeeId: "emp-jordan",
  },
} satisfies Meta<typeof RequestTimeline>

export default meta

type Story = StoryObj<typeof meta>

export const PendingManagerReview: Story = {}

export const Default = PendingManagerReview

export const Approved: Story = {
  parameters: {
    hcm: {
      statePatch: {
        requests: [approvedRequest],
      },
    },
  },
}

export const Denied: Story = {
  parameters: {
    hcm: {
      statePatch: {
        requests: [deniedRequest],
      },
    },
  },
}

export const ConflictNeedsReview: Story = {
  parameters: {
    hcm: {
      statePatch: {
        requests: [conflictReviewRequest],
      },
    },
  },
}

export const SyncFailedRetryable: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      statePatch: {
        requests: [seededPendingRequest, syncFailedRetryableRequest],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText("Sync failed")
    ).toBeInTheDocument()
    await expect(
      canvas.getByText(/HCM did not confirm the write/i)
    ).toBeInTheDocument()
  },
}

export const Error: Story = {
  parameters: {
    hcm: {
      failEmployeeRequests: true,
    },
  },
}
