import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { RequestTimeline } from "@/features/employee/request-timeline"
import { syncFailedRetryableRequest } from "@/test/time-off-fixtures"

const meta = {
  title: "Time Off/RequestTimeline",
  component: RequestTimeline,
  args: {
    employeeId: "emp-jordan",
  },
} satisfies Meta<typeof RequestTimeline>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SyncFailedRetryable: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      statePatch: {
        requests: [syncFailedRetryableRequest],
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
