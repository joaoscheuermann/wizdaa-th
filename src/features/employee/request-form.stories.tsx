import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { BalanceSummary } from "@/features/employee/balance-summary"
import { RequestForm } from "@/features/employee/request-form"
import { RequestedPtoTable } from "@/features/employee/requested-pto-table"

const meta = {
  title: "Time Off/RequestForm",
  component: RequestForm,
  args: {
    selectedEmployeeId: "emp-avery",
  },
} satisfies Meta<typeof RequestForm>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EmployeeSubmit: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const note = await canvas.findByLabelText("Note")
    const submitButton = await canvas.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await userEvent.type(note, "Storybook submit")
    await userEvent.click(submitButton)

    await expect(
      await canvas.findByText("New York HQ request is pending manager review.")
    ).toBeInTheDocument()
  },
}

export const OptimisticPending: Story = {
  parameters: {
    hcm: {
      delaySubmitMs: 500,
    },
  },
  render: (args) => (
    <div className="grid gap-4 lg:grid-cols-2">
      <RequestForm {...args} />
      <RequestedPtoTable employeeId="emp-avery" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const submitButton = await canvas.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await userEvent.click(submitButton)

    await expect(await canvas.findByText("Submitting")).toBeInTheDocument()
    await expect(
      await canvas.findByText("Pending manager review")
    ).toBeInTheDocument()
  },
}

export const Rollback: Story = {
  parameters: {
    hcm: {
      failFirstSubmit: true,
    },
  },
  render: (args) => (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <BalanceSummary employeeId="emp-avery" />
      <RequestForm {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const submitButton = await canvas.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await userEvent.click(submitButton)

    await expect(
      await canvas.findByText(/HCM did not respond to the submission/i)
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(canvas.getByRole("row", { name: /new york hq/i })).getByText(
          "0.0 days"
        )
      ).toBeInTheDocument()
    )
  },
}

export const RetryAfterSilentFailure: Story = {
  parameters: {
    hcm: {
      failFirstSubmit: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const note = await canvas.findByLabelText("Note")
    const submitButton = await canvas.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await userEvent.type(note, "Retry this request")
    await userEvent.click(submitButton)
    await userEvent.click(await canvas.findByRole("button", { name: /retry request/i }))

    await expect(
      await canvas.findByText("New York HQ request is pending manager review.")
    ).toBeInTheDocument()
    await expect(note).toHaveValue("")
  },
}
