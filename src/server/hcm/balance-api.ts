import { DEFAULT_TIME_OFF_TYPE_ID } from "@/domain/time-off/constants"
import { parseBalancePatchRequest } from "@/domain/time-off/schemas"
import {
  applyHcmReadScenario,
  applyHcmWriteScenario,
  isSilentNoResponseScenario,
} from "@/server/hcm/scenarios"
import { hcmErrorResponse } from "@/server/hcm/state-api"
import {
  getBalanceBatch,
  getHcmState,
  readBalanceCell,
  writeBalanceCell,
} from "@/server/hcm/state-store"

const requiredSearchParam = (
  searchParams: URLSearchParams,
  key: string
) => {
  const value = searchParams.get(key)

  if (!value || value.trim().length === 0) return null

  return value
}

const readJsonBody = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export const handleBalanceBatchGet = async () => {
  const scenarioMode = getHcmState().scenario.mode

  await applyHcmReadScenario(scenarioMode, "balance_batch")

  return Response.json(getBalanceBatch())
}

export const handleBalanceCellGet = async (request: Request) => {
  const scenarioMode = getHcmState().scenario.mode
  const { searchParams } = new URL(request.url)
  const employeeId = requiredSearchParam(searchParams, "employeeId")
  const locationId = requiredSearchParam(searchParams, "locationId")
  const timeOffTypeId =
    searchParams.get("timeOffTypeId") ?? DEFAULT_TIME_OFF_TYPE_ID

  if (!employeeId || !locationId) {
    return hcmErrorResponse(
      "missing_balance_dimensions",
      "employeeId and locationId query parameters are required.",
      400
    )
  }

  await applyHcmReadScenario(scenarioMode, "balance_cell")

  const balance = readBalanceCell({
    employeeId,
    locationId,
    timeOffTypeId,
  })

  if (!balance) {
    return hcmErrorResponse(
      "balance_not_found",
      "No HCM balance exists for that employee/location.",
      404
    )
  }

  return Response.json({ balance })
}

export const handleBalanceCellPatch = async (request: Request) => {
  const parsed = parseBalancePatchRequest(await readJsonBody(request))
  const scenarioMode = getHcmState().scenario.mode

  if (!parsed.ok) {
    return hcmErrorResponse("invalid_balance_patch", parsed.message, 400)
  }

  await applyHcmWriteScenario(scenarioMode, "balance_write")

  if (isSilentNoResponseScenario(scenarioMode)) {
    return hcmErrorResponse(
      "sync_failed_retryable",
      "HCM did not respond to the balance write. Review the change and retry.",
      504
    )
  }

  const balance = writeBalanceCell(parsed.value)

  if (!balance) {
    return hcmErrorResponse(
      "balance_not_found",
      "No HCM balance exists for that employee/location.",
      404
    )
  }

  return Response.json({ balance })
}
