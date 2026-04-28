import type {
  ApiErrorResponse,
  BalanceBatchResponse,
  BalanceCellResponse,
  BalancePatchRequest,
  EmployeeRequestsResponse,
  ManagerDecisionRequest,
  ManagerDecisionResponse,
  PendingRequestsResponse,
  TimeOffRequestSubmission,
  TimeOffRequestSubmissionResponse,
  UserResponse,
} from "@/domain/time-off/types"
import { HCM_WRITE_TIMEOUT_MS } from "@/domain/time-off/constants"
import { HcmClientError } from "@/lib/hcm-client/errors"

const jsonHeaders = {
  "Content-Type": "application/json",
} as const

interface JsonRequestInit extends RequestInit {
  readonly timeoutMs?: number
}

const readErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>

    return {
      code: body.error?.code ?? "hcm_error",
      message: body.error?.message ?? response.statusText,
      fieldErrors: body.error?.fieldErrors,
    }
  } catch {
    return {
      code: "hcm_error",
      message: response.statusText,
    }
  }
}

const requestJson = async <T>(
  path: string,
  init?: JsonRequestInit
): Promise<T> => {
  const { timeoutMs, ...fetchInit } = init ?? {}
  const abortController = timeoutMs ? new AbortController() : null
  const timeoutId = abortController
    ? setTimeout(() => abortController.abort(), timeoutMs)
    : null
  const requestInit = abortController
    ? {
        ...fetchInit,
        signal: abortController.signal,
      }
    : fetchInit
  let response: Response

  try {
    response = await fetchWithTimeoutError(path, requestInit, timeoutMs)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const error = await readErrorMessage(response)

    throw new HcmClientError(
      response.status,
      error.message,
      error.code,
      error.fieldErrors
    )
  }

  return (await response.json()) as T
}

const isAbortError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "AbortError"

const fetchWithTimeoutError = async (
  path: string,
  init: RequestInit,
  timeoutMs: number | undefined
) => {
  try {
    return await fetch(path, init)
  } catch (error) {
    if (timeoutMs && isAbortError(error)) {
      throw new HcmClientError(
        504,
        `HCM did not respond within ${Math.round(
          timeoutMs / 1_000
        )} seconds. Review the preserved action and retry.`,
        "write_timeout"
      )
    }

    if (error instanceof Error) {
      throw new HcmClientError(0, error.message, "network_error")
    }

    throw new HcmClientError(0, "Unable to reach HCM.", "network_error")
  }
}

export const getBalanceBatch = () =>
  requestJson<BalanceBatchResponse>("/api/hcm/balances/batch")

export const getUser = (userId: string) =>
  requestJson<UserResponse>(`/api/hcm/users/${encodeURIComponent(userId)}`)

export const getBalanceCell = (
  employeeId: string,
  locationId: string,
  timeOffTypeId?: string
) => {
  const searchParams = new URLSearchParams({
    employeeId,
    locationId,
  })

  if (timeOffTypeId) searchParams.set("timeOffTypeId", timeOffTypeId)

  return requestJson<BalanceCellResponse>(
    `/api/hcm/balances?${searchParams.toString()}`
  )
}

export const patchBalanceCell = (payload: BalancePatchRequest) =>
  requestJson<BalanceCellResponse>("/api/hcm/balances", {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    timeoutMs: HCM_WRITE_TIMEOUT_MS,
  })

export const getEmployeeRequests = (employeeId: string) => {
  const searchParams = new URLSearchParams({
    employeeId,
  })

  return requestJson<EmployeeRequestsResponse>(
    `/api/hcm/requests?${searchParams.toString()}`
  )
}

export const getPendingRequests = () =>
  requestJson<PendingRequestsResponse>("/api/hcm/requests?status=pending")

export const submitTimeOffRequest = (payload: TimeOffRequestSubmission) =>
  requestJson<TimeOffRequestSubmissionResponse>("/api/hcm/requests", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    timeoutMs: HCM_WRITE_TIMEOUT_MS,
  })

export const decideTimeOffRequest = (
  requestId: string,
  payload: ManagerDecisionRequest
) =>
  requestJson<ManagerDecisionResponse>(`/api/hcm/requests/${requestId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
    timeoutMs: HCM_WRITE_TIMEOUT_MS,
  })
