import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { AllEmployeeBalancesTable } from "@/features/manager/all-employee-balances-table"

const meta = {
  title: "Time Off/AllEmployeeBalancesTable",
  component: AllEmployeeBalancesTable,
} satisfies Meta<typeof AllEmployeeBalancesTable>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Error: Story = {
  parameters: {
    hcm: {
      failBatch: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByRole("alert")
    ).toHaveTextContent("Unable to load all employee balances")
  },
}
