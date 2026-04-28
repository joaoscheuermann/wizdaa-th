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

export const Loading: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      holdBatch: true,
    },
  },
}

export const Empty: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      emptyBatch: true,
    },
  },
}

export const Fresh: Story = {
  args: {
    employeeId: "emp-avery",
  },
}

export const Default = Fresh

export const Stale: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      batchFreshnessStatus: "stale",
    },
  },
}

export const Refreshing: Story = {
  args: {
    employeeId: "emp-avery",
  },
}

export const RefreshFailed: Story = {
  args: {
    employeeId: "emp-avery",
  },
  parameters: {
    hcm: {
      failBatchAfterFirstSuccess: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      await canvas.findByRole("button", { name: /refresh balances/i })
    )
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      "Balance refresh failed"
    )
  },
}

function BalanceRefreshHarness() {
  const queryClient = useQueryClient()
  const didPatch = useRef(false)

  useEffect(() => {
    if (didPatch.current) return

    didPatch.current = true
    window.setTimeout(() => {
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
    }, 50)
  }, [queryClient])

  return <BalanceSummary employeeId="emp-avery" />
}

export const BalanceRefreshedMidSession: Story = {
  args: {
    employeeId: "emp-avery",
  },
  render: () => <BalanceRefreshHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText(/Refreshed balance: New York HQ/i)
    ).toBeInTheDocument()
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
