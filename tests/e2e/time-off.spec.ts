import { expect, test } from "@playwright/test"

test.beforeEach(async ({ request }) => {
  await request.delete("/api/hcm/state")
})

test("employee submits PTO and manager approves it", async ({ page }) => {
  await page.goto("/emp-avery")

  await expect(
    page.getByRole("heading", { name: "ExampleHR Time-Off" })
  ).toBeVisible()
  await expect(page.getByText("Avery Stone")).toBeVisible()
  await page.getByRole("button", { name: "Request PTO" }).click()

  const requestDialog = page.getByRole("dialog", { name: "Request PTO" })

  await expect(requestDialog).toBeVisible()
  await requestDialog.getByRole("textbox", { name: "Note" }).fill("E2E happy path")
  await requestDialog.getByRole("button", { name: "Submit request" }).click()
  await expect(requestDialog).toBeHidden()

  const requestedPtoTable = page.getByRole("table", { name: "Requested PTO" })

  await expect(requestedPtoTable.getByText("New York HQ")).toBeVisible()
  await expect(requestedPtoTable.getByText("E2E happy path")).toBeVisible()
  await expect(
    requestedPtoTable.getByText("Pending manager review")
  ).toBeVisible()

  await page.goto("/mgr-morgan")
  await expect(
    page.getByRole("heading", { name: "Manager workspace" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: /Review Avery Stone New York HQ/i })
    .click()

  const decisionDialog = page.getByRole("dialog", {
    name: "Review pending request",
  })

  await expect(decisionDialog).toBeVisible()
  await decisionDialog.getByRole("button", { name: "Approve" }).click()

  const reconfirmationMessage = decisionDialog.getByText(
    /Confirm approval again to continue/i
  )
  const needsReconfirmation = await reconfirmationMessage
    .isVisible({ timeout: 1_000 })
    .catch(() => false)

  if (needsReconfirmation) {
    await decisionDialog
      .getByRole("button", { name: "Confirm approval" })
      .click()
  }

  await expect(decisionDialog.getByRole("status")).toHaveText(
    /New York HQ request approved/i
  )
  await expect(
    page.getByRole("button", { name: /Review Avery Stone New York HQ/i })
  ).toBeHidden()

  await page.goto("/emp-avery")
  await expect(
    page.getByRole("table", { name: "Requested PTO" }).getByText("Approved")
  ).toBeVisible()
})

test("retryable HCM write failure preserves the employee request", async ({
  page,
  request,
}) => {
  await request.patch("/api/hcm/state", {
    data: {
      scenario: {
        mode: "silent_no_response",
        updatedAt: "2026-04-28T13:10:00.000Z",
      },
    },
  })
  await page.goto("/emp-avery")

  await page.getByRole("button", { name: "Request PTO" }).click()

  const requestDialog = page.getByRole("dialog", { name: "Request PTO" })
  const note = requestDialog.getByRole("textbox", { name: "Note" })

  await expect(requestDialog).toBeVisible()
  await note.fill("E2E retry path")
  await requestDialog.getByRole("button", { name: "Submit request" }).click()

  await expect(
    requestDialog.getByText(/HCM did not respond within 5 seconds/i)
  ).toBeVisible({ timeout: 10_000 })
  await expect(
    requestDialog.getByRole("button", { name: "Retry request" })
  ).toBeVisible()
  await expect(note).toHaveValue("E2E retry path")
})
