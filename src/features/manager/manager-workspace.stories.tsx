import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { ManagerWorkspace } from "@/features/manager/manager-workspace"
import { conflictReviewRequest } from "@/test/time-off-fixtures"

const getOpenDialog = async (ownerDocument: Document) => {
  let dialog: HTMLElement | null = null

  await waitFor(() => {
    const dialogs = ownerDocument.querySelectorAll<HTMLElement>(
      '[data-slot="dialog-content"][data-open]'
    )
    dialog = dialogs[dialogs.length - 1] ?? null
    expect(dialog).not.toBeNull()
  })

  if (!dialog) throw new Error("Decision modal did not open.")

  return dialog
}

const meta = {
  title: "Time Off/ManagerWorkspace",
  component: ManagerWorkspace,
} satisfies Meta<typeof ManagerWorkspace>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OpenDecisionModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const request = await canvas.findByRole("button", {
      name: /Review Jordan Lee Austin Studio/i,
    })

    await userEvent.click(request)

    const dialog = await getOpenDialog(canvasElement.ownerDocument)

    await expect(
      within(dialog).getByRole("heading", { name: "Review pending request" })
    ).toBeInTheDocument()
    await expect(within(dialog).getByLabelText("Denial reason")).toBeInTheDocument()
  },
}

export const ApproveFromWorkspaceModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const request = await canvas.findByRole("button", {
      name: /Review Jordan Lee Austin Studio/i,
    })

    await userEvent.click(request)

    const dialog = await getOpenDialog(canvasElement.ownerDocument)
    const approveButton = await within(dialog).findByRole("button", {
      name: /approve/i,
    })

    await waitFor(() => expect(approveButton).toBeEnabled())
    await userEvent.click(approveButton)

    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent(
        "Austin Studio request approved."
      )
    )
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
