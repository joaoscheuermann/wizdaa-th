import {
  decideTimeOffRequest,
  listEmployeeRequests,
  listPendingRequests,
  submitTimeOffRequest,
} from "@/server/hcm/hcm-service"
import {
  applyHcmReadScenario,
  applyHcmWriteScenario,
  isSilentNoResponseScenario,
  type HcmWriteOperation,
} from "@/server/hcm/scenarios"
import { hcmErrorResponse } from "@/server/hcm/state-api"
import { getHcmState } from "@/server/hcm/state-store"

interface RequestRouteContext {
  readonly params: Promise<{
    readonly requestId: string
  }>
}

const readJsonBody = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const requiredSearchParam = (searchParams: URLSearchParams, key: string) => {
  const value = searchParams.get(key)

  if (!value || value.trim().length === 0) return null

  return value
}

export const handleRequestsGet = async (request: Request) => {
  const scenarioMode = getHcmState().scenario.mode
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  await applyHcmReadScenario(scenarioMode, "requests")

  if (status) {
    if (status !== "pending") {
      return hcmErrorResponse(
        "unsupported_request_status",
        "Only status=pending is supported for request queues.",
        400
      )
    }

    return Response.json(listPendingRequests())
  }

  const employeeId = requiredSearchParam(searchParams, "employeeId")

  if (!employeeId) {
    return hcmErrorResponse(
      "missing_employee",
      "employeeId query parameter is required.",
      400
    )
  }

  return Response.json(listEmployeeRequests(employeeId))
}

export const handleRequestsPost = async (request: Request) => {
  const body = await readJsonBody(request)
  const scenarioMode = getHcmState().scenario.mode

  await applyHcmWriteScenario(scenarioMode, "submit")

  if (isSilentNoResponseScenario(scenarioMode)) {
    return hcmErrorResponse(
      "sync_failed_retryable",
      "HCM did not respond to the submission. Review the preserved request and retry.",
      504
    )
  }

  const result = submitTimeOffRequest(body)

  if (!result.ok) {
    return hcmErrorResponse(
      result.code,
      result.message,
      result.status,
      result.fieldErrors
    )
  }

  return Response.json(result.value)
}

export const handleRequestPatch = async (
  request: Request,
  context: RequestRouteContext
) => {
  const { requestId } = await context.params
  const body = await readJsonBody(request)

  if (requestId.trim().length === 0) {
    return hcmErrorResponse(
      "missing_request_id",
      "requestId route parameter is required.",
      400
    )
  }

  const operation = getDecisionOperation(body)
  const scenarioMode = getHcmState().scenario.mode

  await applyHcmWriteScenario(scenarioMode, operation)

  if (isSilentNoResponseScenario(scenarioMode)) {
    return hcmErrorResponse(
      "sync_failed_retryable",
      "HCM did not respond to the manager decision. Review the request and retry.",
      504
    )
  }

  const result = decideTimeOffRequest(requestId, body)

  if (!result.ok) {
    return hcmErrorResponse(result.code, result.message, result.status)
  }

  return Response.json(result.value)
}

const getDecisionOperation = (body: unknown): HcmWriteOperation => {
  if (
    typeof body === "object" &&
    body !== null &&
    "decision" in body &&
    body.decision === "deny"
  ) {
    return "deny"
  }

  return "approve"
}
