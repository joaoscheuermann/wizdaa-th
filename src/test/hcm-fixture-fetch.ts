import type { HcmStatePatch } from "@/domain/time-off/types"
import {
  decideTimeOffRequest,
  listEmployeeRequests,
  listPendingRequests,
  submitTimeOffRequest,
} from "@/server/hcm/hcm-service"
import {
  getBalanceBatch,
  getHcmState,
  patchHcmState,
  readBalanceCell,
  resetHcmState,
  writeBalanceCell,
} from "@/server/hcm/state-store"
import { getDemoUser } from "@/server/hcm/user-api"

interface HcmFixtureFetchOptions {
  readonly statePatch?: HcmStatePatch
  readonly failBatch?: boolean
  readonly failEmployeeRequests?: boolean
  readonly failFirstSubmit?: boolean
  readonly failFirstDecision?: boolean
  readonly failPendingRequests?: boolean
  readonly holdEmployeeRequests?: boolean
  readonly delaySubmitMs?: number
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })

const retryableWriteFailure = (message: string) =>
  jsonResponse(
    {
      error: {
        code: "sync_failed_retryable",
        message,
      },
    },
    504
  )

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const parseUrl = (input: RequestInfo | URL) =>
  new URL(input.toString(), "http://storybook.local")

export const installHcmFixtureFetch = ({
  delaySubmitMs = 0,
  failBatch = false,
  failEmployeeRequests = false,
  failFirstDecision = false,
  failFirstSubmit = false,
  failPendingRequests = false,
  holdEmployeeRequests = false,
  statePatch,
}: HcmFixtureFetchOptions = {}) => {
  const previousFetch = globalThis.fetch
  let submitAttempts = 0
  let decisionAttempts = 0

  resetHcmState()
  if (statePatch) patchHcmState(statePatch)

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = parseUrl(input)
    const method = init?.method?.toUpperCase() ?? "GET"

    if (url.pathname === "/api/hcm/balances/batch" && method === "GET") {
      if (failBatch) {
        return jsonResponse(
          {
            error: {
              code: "hcm_unavailable",
              message: "HCM unavailable.",
            },
          },
          503
        )
      }

      return jsonResponse(getBalanceBatch())
    }

    if (url.pathname.startsWith("/api/hcm/users/") && method === "GET") {
      const userId = decodeURIComponent(
        url.pathname.replace("/api/hcm/users/", "")
      )
      const user = getDemoUser(userId)

      if (!user) {
        return jsonResponse(
          {
            error: {
              code: "user_not_found",
              message: `No seeded ExampleHR user exists for "${userId}".`,
            },
          },
          404
        )
      }

      return jsonResponse({ user })
    }

    if (url.pathname === "/api/hcm/balances" && method === "GET") {
      return jsonResponse({
        balance: readBalanceCell({
          employeeId: url.searchParams.get("employeeId") ?? "",
          locationId: url.searchParams.get("locationId") ?? "",
          timeOffTypeId: url.searchParams.get("timeOffTypeId") ?? undefined,
        }),
      })
    }

    if (url.pathname === "/api/hcm/balances" && method === "PATCH") {
      return jsonResponse(writeBalanceCell(JSON.parse(String(init?.body))))
    }

    if (url.pathname === "/api/hcm/requests" && method === "GET") {
      const status = url.searchParams.get("status")

      if (status === "pending") {
        if (failPendingRequests) {
          return jsonResponse(
            {
              error: {
                code: "hcm_unavailable",
                message: "Unable to reach pending requests.",
              },
            },
            503
          )
        }

        return jsonResponse(listPendingRequests())
      }

      if (failEmployeeRequests) {
        return jsonResponse(
          {
            error: {
              code: "hcm_unavailable",
              message: "Unable to reach employee requests.",
            },
          },
          503
        )
      }

      if (holdEmployeeRequests) {
        return new Promise<Response>(() => {})
      }

      return jsonResponse(
        listEmployeeRequests(url.searchParams.get("employeeId") ?? "")
      )
    }

    if (url.pathname === "/api/hcm/requests" && method === "POST") {
      submitAttempts += 1

      if (delaySubmitMs > 0) await delay(delaySubmitMs)

      if (failFirstSubmit && submitAttempts === 1) {
        return retryableWriteFailure(
          "HCM did not respond to the submission. Review the preserved request and retry."
        )
      }

      const result = submitTimeOffRequest(JSON.parse(String(init?.body)))

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

    if (
      url.pathname.startsWith("/api/hcm/requests/") &&
      method === "PATCH"
    ) {
      decisionAttempts += 1

      if (failFirstDecision && decisionAttempts === 1) {
        return retryableWriteFailure(
          "HCM did not respond to the manager decision. Review the preserved action and retry."
        )
      }

      const requestId = decodeURIComponent(
        url.pathname.replace("/api/hcm/requests/", "")
      )
      const result = decideTimeOffRequest(
        requestId,
        JSON.parse(String(init?.body))
      )

      if (!result.ok) {
        return jsonResponse(
          {
            error: {
              code: result.code,
              message: result.message,
            },
          },
          result.status
        )
      }

      return jsonResponse(result.value)
    }

    if (url.pathname === "/api/hcm/state" && method === "GET") {
      return jsonResponse(getHcmState())
    }

    if (url.pathname === "/api/hcm/state" && method === "DELETE") {
      return jsonResponse(resetHcmState())
    }

    if (url.pathname === "/api/hcm/state" && method === "PATCH") {
      return jsonResponse(patchHcmState(JSON.parse(String(init?.body))))
    }

    return jsonResponse(
      {
        error: {
          code: "not_found",
          message: `Unhandled fixture route: ${method} ${url.pathname}`,
        },
      },
      404
    )
  }

  return () => {
    globalThis.fetch = previousFetch
  }
}
