import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BalanceSummary } from "@/features/employee/balance-summary"
import { RequestForm } from "@/features/employee/request-form"
import { queryKeys } from "@/lib/queries/query-keys"
import { submitTimeOffRequest as submitOnServer } from "@/server/hcm/hcm-service"
import {
  getBalanceBatch,
  readBalanceCell,
  resetHcmState,
  writeBalanceCell,
} from "@/server/hcm/state-store"
import { renderWithQueryClient } from "@/test/render-with-query-client"

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })

const stubBalanceFetch = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString()

      if (url.includes("/api/hcm/balances/batch")) {
        return jsonResponse(getBalanceBatch())
      }

      if (url.includes("/api/hcm/balances?")) {
        return jsonResponse({
          balance: readBalanceCell({
            employeeId: "emp-avery",
            locationId: "loc-nyc",
            timeOffTypeId: "pto",
          }),
        })
      }

      return jsonResponse(
        {
          error: {
            code: "not_found",
            message: "Unhandled test route.",
          },
        },
        404
      )
    })
  )

const stubSuccessfulRequestFetch = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()

      if (url.includes("/api/hcm/balances/batch")) {
        return jsonResponse(getBalanceBatch())
      }

      if (url.includes("/api/hcm/balances?")) {
        return jsonResponse({
          balance: readBalanceCell({
            employeeId: "emp-avery",
            locationId: "loc-nyc",
            timeOffTypeId: "pto",
          }),
        })
      }

      if (
        url.includes("/api/hcm/requests") &&
        init?.method?.toUpperCase() === "POST"
      ) {
        const result = submitOnServer(JSON.parse(String(init.body)))

        if (!result.ok) {
          return jsonResponse(
            {
              error: {
                code: result.code,
                message: result.message,
                fieldErrors: result.fieldErrors,
              },
            },
            result.status
          )
        }

        return jsonResponse(result.value)
      }

      return jsonResponse(
        {
          error: {
            code: "not_found",
            message: "Unhandled test route.",
          },
        },
        404
      )
    })
  )

describe("RequestForm", () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("updates requested days automatically from the selected date range", async () => {
    const user = userEvent.setup()
    const onSubmitSuccess = vi.fn()

    resetHcmState()
    stubSuccessfulRequestFetch()
    renderWithQueryClient(
      <RequestForm
        selectedEmployeeId="emp-avery"
        onSubmitSuccess={onSubmitSuccess}
      />
    )

    const requestedDays = await screen.findByLabelText("Requested days")
    const endDate = screen.getByLabelText("End date")
    const submitButton = screen.getByRole("button", {
      name: /submit request/i,
    })

    await user.clear(endDate)
    await user.type(endDate, "2026-05-20")

    expect(requestedDays).toHaveTextContent("3")

    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledTimes(1))
    expect(onSubmitSuccess.mock.calls[0][0].request.requestedDays).toBe(3)
  })

  it("calls the optional success callback after HCM accepts the request", async () => {
    const user = userEvent.setup()
    const onSubmitSuccess = vi.fn()

    resetHcmState()
    stubSuccessfulRequestFetch()
    renderWithQueryClient(
      <RequestForm
        selectedEmployeeId="emp-avery"
        onSubmitSuccess={onSubmitSuccess}
      />
    )

    const submitButton = await screen.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledTimes(1))
    expect(onSubmitSuccess.mock.calls[0][0].request.employeeId).toBe("emp-avery")
  })

  it("rolls back optimistic pending-day reservation after HCM rejects balance", async () => {
    const user = userEvent.setup()

    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString()

        if (url.includes("/api/hcm/balances/batch")) {
          return jsonResponse(getBalanceBatch())
        }

        if (url.includes("/api/hcm/balances?")) {
          return jsonResponse({
            balance: readBalanceCell({
              employeeId: "emp-avery",
              locationId: "loc-nyc",
              timeOffTypeId: "pto",
            }),
          })
        }

        if (
          url.includes("/api/hcm/requests") &&
          init?.method?.toUpperCase() === "POST"
        ) {
          return jsonResponse(
            {
              error: {
                code: "insufficient_balance",
                message: "Only 0.5 effective days are available.",
                fieldErrors: {
                  requestedDays:
                    "Requested days exceed the current effective balance.",
                },
              },
            },
            409
          )
        }

        return jsonResponse(
          {
            error: {
              code: "not_found",
              message: "Unhandled test route.",
            },
          },
          404
        )
      })
    )

    renderWithQueryClient(
      <div>
        <BalanceSummary employeeId="emp-avery" />
        <RequestForm selectedEmployeeId="emp-avery" />
      </div>
    )

    const submitButton = await screen.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    expect(
      await screen.findByText("Only 0.5 effective days are available.")
    ).toBeInTheDocument()

    const newYork = screen.getByRole("article", { name: /new york hq/i })

    await waitFor(() =>
      expect(within(newYork).getAllByText("24.0 days")).toHaveLength(2)
    )
    expect(within(newYork).getByText("0.0 days")).toBeInTheDocument()
  })

  it("shows invalid dimension field messaging returned by HCM", async () => {
    const user = userEvent.setup()

    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString()

        if (url.includes("/api/hcm/balances/batch")) {
          return jsonResponse(getBalanceBatch())
        }

        if (url.includes("/api/hcm/balances?")) {
          return jsonResponse({
            balance: readBalanceCell({
              employeeId: "emp-avery",
              locationId: "loc-nyc",
              timeOffTypeId: "pto",
            }),
          })
        }

        if (
          url.includes("/api/hcm/requests") &&
          init?.method?.toUpperCase() === "POST"
        ) {
          return jsonResponse(
            {
              error: {
                code: "invalid_request_dimensions",
                message:
                  "The selected employee, location, or time-off type is unavailable.",
                fieldErrors: {
                  locationId: "Choose a location with an HCM balance.",
                },
              },
            },
            400
          )
        }

        return jsonResponse(
          {
            error: {
              code: "not_found",
              message: "Unhandled test route.",
            },
          },
          404
        )
      })
    )

    renderWithQueryClient(<RequestForm selectedEmployeeId="emp-avery" />)

    const submitButton = await screen.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    expect(
      await screen.findByText(
        "The selected employee, location, or time-off type is unavailable."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("Choose a location with an HCM balance.")
    ).toBeInTheDocument()
  })

  it("preserves request input and exposes retry after a retryable failure", async () => {
    const user = userEvent.setup()

    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString()

        if (url.includes("/api/hcm/balances/batch")) {
          return jsonResponse(getBalanceBatch())
        }

        if (url.includes("/api/hcm/balances?")) {
          return jsonResponse({
            balance: readBalanceCell({
              employeeId: "emp-avery",
              locationId: "loc-nyc",
              timeOffTypeId: "pto",
            }),
          })
        }

        if (
          url.includes("/api/hcm/requests") &&
          init?.method?.toUpperCase() === "POST"
        ) {
          return jsonResponse(
            {
              error: {
                code: "sync_failed_retryable",
                message:
                  "HCM did not respond to the submission. Review the preserved request and retry.",
              },
            },
            504
          )
        }

        return jsonResponse(
          {
            error: {
              code: "not_found",
              message: "Unhandled test route.",
            },
          },
          404
        )
      })
    )

    renderWithQueryClient(<RequestForm selectedEmployeeId="emp-avery" />)

    const note = await screen.findByLabelText("Note")

    await user.type(note, "Preserve this intent")
    await user.click(screen.getByRole("button", { name: /submit request/i }))

    expect(
      await screen.findByText(
        "HCM did not respond to the submission. Review the preserved request and retry."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry request/i })).toBeEnabled()
    expect(note).toHaveValue("Preserve this intent")
  })

  it("preserves form inputs when background reconciliation updates the selected balance", async () => {
    const user = userEvent.setup()

    resetHcmState()
    stubBalanceFetch()
    const { queryClient } = renderWithQueryClient(
      <div>
        <BalanceSummary employeeId="emp-avery" />
        <RequestForm selectedEmployeeId="emp-avery" />
      </div>
    )

    const requestedDays = await screen.findByLabelText("Requested days")
    const endDate = screen.getByLabelText("End date")
    const note = screen.getByLabelText("Note")

    await user.clear(endDate)
    await user.type(endDate, "2026-05-19")
    await user.type(note, "Keep this draft")

    writeBalanceCell({
      employeeId: "emp-avery",
      locationId: "loc-nyc",
      availableDays: 29,
    })

    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.batch })

    expect(
      await screen.findByText(/Refreshed balance: New York HQ now shows/i)
    ).toBeInTheDocument()
    expect(requestedDays).toHaveTextContent("2")
    expect(endDate).toHaveValue("2026-05-19")
    expect(note).toHaveValue("Keep this draft")
    expect(
      screen.getByRole("option", {
        name: /New York HQ - 29.0 days effective/i,
      })
    ).toBeInTheDocument()
  })

  it("keeps the in-flight submission visible while reconciliation applies non-conflicting balance changes", async () => {
    const user = userEvent.setup()
    let releasePost!: () => void
    const postGate = new Promise<void>((resolve) => {
      releasePost = resolve
    })

    resetHcmState()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString()

        if (url.includes("/api/hcm/balances/batch")) {
          return jsonResponse(getBalanceBatch())
        }

        if (url.includes("/api/hcm/balances?")) {
          return jsonResponse({
            balance: readBalanceCell({
              employeeId: "emp-avery",
              locationId: "loc-nyc",
              timeOffTypeId: "pto",
            }),
          })
        }

        if (
          url.includes("/api/hcm/requests") &&
          init?.method?.toUpperCase() === "POST"
        ) {
          await postGate

          const result = submitOnServer(JSON.parse(String(init.body)))

          if (!result.ok) {
            return jsonResponse(
              {
                error: {
                  code: result.code,
                  message: result.message,
                  fieldErrors: result.fieldErrors,
                },
              },
              result.status
            )
          }

          return jsonResponse(result.value)
        }

        return jsonResponse(
          {
            error: {
              code: "not_found",
              message: "Unhandled test route.",
            },
          },
          404
        )
      })
    )

    const { queryClient } = renderWithQueryClient(
      <div>
        <BalanceSummary employeeId="emp-avery" />
        <RequestForm selectedEmployeeId="emp-avery" />
      </div>
    )

    const submitButton = await screen.findByRole("button", {
      name: /submit request/i,
    })

    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    expect(await screen.findByText("Submitting")).toBeInTheDocument()

    writeBalanceCell({
      employeeId: "emp-avery",
      locationId: "loc-nyc",
      availableDays: 29,
    })

    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.batch })

    expect(
      await screen.findByText(/pending action remains visible/i)
    ).toBeInTheDocument()

    const newYork = screen.getByRole("article", { name: /new york hq/i })

    expect(within(newYork).getByText("29.0 days")).toBeInTheDocument()
    expect(within(newYork).getByText("1.0 days")).toBeInTheDocument()
    expect(within(newYork).getByText("28.0 days")).toBeInTheDocument()
    expect(screen.getByText("Submitting")).toBeInTheDocument()

    releasePost()
    expect(
      await screen.findByText("New York HQ request is pending manager review.")
    ).toBeInTheDocument()
  })
})
