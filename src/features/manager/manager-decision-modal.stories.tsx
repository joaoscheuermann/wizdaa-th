import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { ManagerDecisionModal } from "@/features/manager/manager-decision-modal"

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
  title: "Time Off/ManagerDecisionModal",
  component: ManagerDecisionModal,
  args: {
    onOpenChange: () => undefined,
    open: true,
    selectedRequestId: "req-seeded-pending",
  },
} satisfies Meta<typeof ManagerDecisionModal>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const ApproveFromModal: Story = {
  play: async ({ canvasElement }) => {
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

export const DenyFromModal: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await getOpenDialog(canvasElement.ownerDocument)
    const denialReason = await within(dialog).findByLabelText("Denial reason")

    await userEvent.type(denialReason, "Coverage gap during launch week")
    await userEvent.click(within(dialog).getByRole("button", { name: /deny/i }))

    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent(
        "Austin Studio request denied."
      )
    )
  },
}

export const RetryableFailure: Story = {
  parameters: {
    hcm: {
      failFirstDecision: true,
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = await getOpenDialog(canvasElement.ownerDocument)
    const denialReason = await within(dialog).findByLabelText("Denial reason")

    await userEvent.type(denialReason, "Retry after HCM timeout")
    await userEvent.click(within(dialog).getByRole("button", { name: /deny/i }))

    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "HCM did not respond to the manager decision"
      )
    )
  },
}
