import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { RequestPtoModal } from "@/features/employee/request-pto-modal"

const getLatestOpenDialog = async (ownerDocument: Document) => {
  await waitFor(() => {
    const dialogs = ownerDocument.querySelectorAll<HTMLElement>(
      '[data-slot="dialog-content"][data-open]'
    )
    expect(dialogs.length).toBeGreaterThan(0)
  })

  const dialogs = ownerDocument.querySelectorAll<HTMLElement>(
    '[data-slot="dialog-content"][data-open]'
  )
  const dialog = dialogs[dialogs.length - 1]

  if (!dialog) throw new Error("Request PTO modal did not open.")

  return dialog
}

const meta = {
  title: "Time Off/RequestPtoModal",
  component: RequestPtoModal,
  args: {
    selectedEmployeeId: "emp-avery",
  },
} satisfies Meta<typeof RequestPtoModal>

export default meta

type Story = StoryObj<typeof meta>

export const OpenDraft: Story = {
  args: {
    defaultOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)

    await expect(await canvas.findByRole("dialog")).toBeInTheDocument()
    await expect(await canvas.findByLabelText("Requested days")).toHaveTextContent(
      "1"
    )
  },
}

export const SubmitFromModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "Request PTO" }))

    const dialog = await getLatestOpenDialog(canvasElement.ownerDocument)
    const submitButton = await within(dialog).findByRole("button", {
      name: /submit request/i,
    })

    await userEvent.click(within(dialog).getByLabelText("Note"))
    await userEvent.paste("Storybook modal submission")
    await waitFor(() => expect(submitButton).toBeEnabled())
    await userEvent.click(submitButton)

    await expect(
      await within(dialog).findByText(
        "New York HQ request is pending manager review."
      )
    ).toBeInTheDocument()
  },
}
