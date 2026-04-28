import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { RequestedPtoTable } from "@/features/employee/requested-pto-table"

const meta = {
  title: "Time Off/RequestedPtoTable",
  component: RequestedPtoTable,
  args: {
    employeeId: "emp-avery",
  },
} satisfies Meta<typeof RequestedPtoTable>

export default meta

type Story = StoryObj<typeof meta>

export const Loading: Story = {
  parameters: {
    hcm: {
      holdEmployeeRequests: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText("Loading")).toBeInTheDocument()
    await expect(
      canvas.getByLabelText("Loading requested PTO")
    ).toBeInTheDocument()
  },
}

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText("No requested PTO yet.")
    ).toBeInTheDocument()
  },
}

export const WithRequests: Story = {
  args: {
    employeeId: "emp-jordan",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText("Austin Studio")).toBeInTheDocument()
    await expect(
      canvas.getByText("Pending manager review")
    ).toBeInTheDocument()
  },
}

export const ManagerSelfService: Story = {
  args: {
    employeeId: "mgr-morgan",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText("No requested PTO yet.")
    ).toBeInTheDocument()
    await expect(canvas.queryByText("Austin Studio")).not.toBeInTheDocument()
  },
}

export const Error: Story = {
  parameters: {
    hcm: {
      failEmployeeRequests: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Unable to load requested PTO"
    )
  },
}
