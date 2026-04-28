import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { ReconciliationBanner } from "@/components/common/reconciliation-banner"

const meta = {
  title: "Time Off/ReconciliationBanner",
  component: ReconciliationBanner,
  args: {
    message: "Balances are up to date with HCM.",
    tone: "info",
  },
} satisfies Meta<typeof ReconciliationBanner>

export default meta

type Story = StoryObj<typeof meta>

export const Info: Story = {}

export const Success: Story = {
  args: {
    message: "Refreshed balance: New York HQ now shows 29.0 days available.",
    tone: "success",
  },
}

export const BalanceChanged = Success

export const Warning: Story = {
  args: {
    message:
      "Balance changed while a request action is pending. The pending action remains visible.",
    tone: "warning",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "pending action remains visible"
    )
  },
}

export const InFlightActionConflict = Warning
