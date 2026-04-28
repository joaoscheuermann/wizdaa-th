import { useIsMutating, useQueryClient } from "@tanstack/react-query"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { useEffect, useRef } from "react"

import { BalanceSummary } from "@/features/employee/balance-summary"
import { RequestForm } from "@/features/employee/request-form"
import { queryKeys } from "@/lib/queries/query-keys"

const meta = {
  title: "Time Off/BalanceSummary",
  component: BalanceSummary,
} satisfies Meta<typeof BalanceSummary>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    employeeId: "emp-avery",
  },
}

function BalanceConflictHarness() {
  const queryClient = useQueryClient()
  const activeMutations = useIsMutating()
  const didPatch = useRef(false)

  useEffect(() => {
    if (activeMutations === 0 || didPatch.current) return

    didPatch.current = true
    void fetch("/api/hcm/state", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        balances: [
          {
            employeeId: "emp-avery",
            locationId: "loc-nyc",
            timeOffTypeId: "pto",
            availableDays: 29,
          },
        ],
      }),
    }).then(() =>
      queryClient.invalidateQueries({ queryKey: queryKeys.balances.batch })
    )
  }, [activeMutations, queryClient])

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <BalanceSummary employeeId="emp-avery" />
      <RequestForm selectedEmployeeId="emp-avery" />
    </div>
  )
}

export const Conflict: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      delaySubmitMs: 350,
    },
  },
  render: () => <BalanceConflictHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const submitButton = await canvas.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await userEvent.click(submitButton)

    await expect(
      await canvas.findByText(/pending action remains visible/i)
    ).toBeInTheDocument()
    await expect(await canvas.findByText("29.0 days")).toBeInTheDocument()
  },
}
