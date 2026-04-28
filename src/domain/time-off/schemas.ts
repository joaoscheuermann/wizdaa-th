import { DEFAULT_TIME_OFF_TYPE_ID } from "@/domain/time-off/constants"
import type {
  BalancePatchRequest,
  DemoLocation,
  DemoUser,
  HcmBalanceRecord,
  HcmScenarioState,
  HcmState,
  HcmStatePatch,
  ManagerDecisionAction,
  ManagerDecisionRequest,
  RequestFormFieldErrors,
  RequestAuditEvent,
  RequestStatus,
  TimeOffRequest,
  TimeOffRequestSubmission,
  TimeOffType,
  UserRole,
} from "@/domain/time-off/types"
import { hcmScenarioModes } from "@/domain/time-off/types"

type ParseResult<T> =
  | {
      readonly ok: true
      readonly value: T
    }
  | {
      readonly ok: false
      readonly message: string
    }

type MutableFieldErrors = {
  -readonly [Field in keyof RequestFormFieldErrors]?: string
}

const requestStatuses = new Set<RequestStatus>([
  "draft",
  "submitting",
  "submitted_pending_hcm",
  "submitted_pending_manager",
  "rejected_by_hcm",
  "manager_reviewing",
  "approval_pending_hcm",
  "approved",
  "denied",
  "conflict_needs_review",
  "sync_failed_retryable",
])

const userRoles = new Set<UserRole>(["employee", "manager"])

const scenarioModes = new Set<string>(hcmScenarioModes)

const managerDecisionActions = new Set<ManagerDecisionAction>([
  "approve",
  "deny",
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback

const asOptionalString = (value: unknown) =>
  typeof value === "string" ? value : undefined

const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const asVersion = (value: unknown) => Math.max(1, Math.round(asNumber(value, 1)))

const asArray = (value: unknown): readonly unknown[] =>
  Array.isArray(value) ? value : []

const normalizeUser = (value: unknown): DemoUser | null => {
  if (!isRecord(value)) return null

  const role = asString(value.role)

  if (!userRoles.has(role as UserRole)) return null

  return {
    id: asString(value.id),
    name: asString(value.name),
    role: role as UserRole,
    managerId: asOptionalString(value.managerId),
  }
}

const normalizeLocation = (value: unknown): DemoLocation | null => {
  if (!isRecord(value)) return null

  return {
    id: asString(value.id),
    name: asString(value.name),
    code: asString(value.code),
  }
}

const normalizeTimeOffType = (value: unknown): TimeOffType | null => {
  if (!isRecord(value)) return null

  return {
    id: asString(value.id),
    name: asString(value.name),
  }
}

const normalizeBalance = (value: unknown): HcmBalanceRecord | null => {
  if (!isRecord(value)) return null

  return {
    employeeId: asString(value.employeeId),
    locationId: asString(value.locationId),
    timeOffTypeId: asString(value.timeOffTypeId, DEFAULT_TIME_OFF_TYPE_ID),
    availableDays: asNumber(value.availableDays),
    pendingDays: asNumber(value.pendingDays),
    lastVerifiedAt: asString(value.lastVerifiedAt, new Date(0).toISOString()),
    source: "hcm",
    version: asVersion(value.version),
  }
}

const asRequestDays = (value: unknown) => {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN

  return Number(value)
}

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/

const isValidLocalDate = (value: string) => {
  if (!localDatePattern.test(value)) return false

  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

const isHalfDayIncrement = (value: number) =>
  Math.abs(value * 2 - Math.round(value * 2)) < 0.000_001

const hasErrors = (errors: MutableFieldErrors) =>
  Object.keys(errors).length > 0

const trimOptionalNote = (value: unknown) => {
  if (typeof value !== "string") return undefined

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeAuditEvent = (value: unknown): RequestAuditEvent | null => {
  if (!isRecord(value)) return null

  return {
    at: asString(value.at),
    type: asString(value.type),
    message: asString(value.message),
  }
}

const normalizeRequest = (value: unknown): TimeOffRequest | null => {
  if (!isRecord(value)) return null

  const status = asString(value.status)

  if (!requestStatuses.has(status as RequestStatus)) return null

  return {
    requestId: asString(value.requestId),
    employeeId: asString(value.employeeId),
    employeeName: asString(value.employeeName),
    timeOffTypeId: asString(value.timeOffTypeId, DEFAULT_TIME_OFF_TYPE_ID),
    timeOffTypeName: asString(value.timeOffTypeName, "Paid Time Off"),
    locationId: asString(value.locationId),
    locationName: asString(value.locationName),
    requestedDays: asNumber(value.requestedDays),
    startDate: asString(value.startDate),
    endDate: asString(value.endDate),
    note: asOptionalString(value.note),
    status: status as RequestStatus,
    createdAt: asString(value.createdAt),
    updatedAt: asString(value.updatedAt),
    lastHcmVerificationAt: asOptionalString(value.lastHcmVerificationAt),
    balanceVersionAtSubmission:
      typeof value.balanceVersionAtSubmission === "number"
        ? value.balanceVersionAtSubmission
        : undefined,
    balanceVersionAtDecision:
      typeof value.balanceVersionAtDecision === "number"
        ? value.balanceVersionAtDecision
        : undefined,
    statusReason: asOptionalString(value.statusReason),
    auditEvents: asArray(value.auditEvents)
      .map(normalizeAuditEvent)
      .filter((event): event is RequestAuditEvent => event !== null),
  }
}

const normalizeScenario = (value: unknown): HcmScenarioState | null => {
  if (!isRecord(value)) {
    return {
      mode: "normal",
      updatedAt: new Date(0).toISOString(),
    }
  }

  const mode = asString(value.mode, "normal")

  if (!scenarioModes.has(mode)) return null

  return {
    mode: mode as HcmScenarioState["mode"],
    updatedAt: asString(value.updatedAt, new Date(0).toISOString()),
  }
}

const hasEmptyIds = (values: readonly { readonly id: string }[]) =>
  values.some((value) => value.id.trim().length === 0)

const hasInvalidBalanceKeys = (balances: readonly HcmBalanceRecord[]) =>
  balances.some(
    (balance) =>
      balance.employeeId.trim().length === 0 ||
      balance.locationId.trim().length === 0 ||
      balance.timeOffTypeId.trim().length === 0
  )

export const normalizeHcmState = (input: unknown): HcmState | null => {
  if (!isRecord(input)) return null

  const employees = asArray(input.employees)
    .map(normalizeUser)
    .filter((employee): employee is DemoUser => employee !== null)
  const locations = asArray(input.locations)
    .map(normalizeLocation)
    .filter((location): location is DemoLocation => location !== null)
  const timeOffTypes = asArray(input.timeOffTypes)
    .map(normalizeTimeOffType)
    .filter((timeOffType): timeOffType is TimeOffType => timeOffType !== null)
  const balances = asArray(input.balances)
    .map(normalizeBalance)
    .filter((balance): balance is HcmBalanceRecord => balance !== null)
  const requests = asArray(input.requests)
    .map(normalizeRequest)
    .filter((request): request is TimeOffRequest => request !== null)
  const scenario = normalizeScenario(input.scenario)

  if (
    employees.length === 0 ||
    locations.length === 0 ||
    timeOffTypes.length === 0 ||
    !scenario ||
    hasEmptyIds(employees) ||
    hasEmptyIds(locations) ||
    hasEmptyIds(timeOffTypes) ||
    hasInvalidBalanceKeys(balances)
  ) {
    return null
  }

  return {
    employees,
    locations,
    timeOffTypes,
    balances,
    requests,
    scenario,
  }
}

export const parseHcmState = (input: unknown): ParseResult<HcmState> => {
  const state = normalizeHcmState(input)

  if (!state) {
    return {
      ok: false,
      message: "Expected a complete HCM state payload.",
    }
  }

  return {
    ok: true,
    value: state,
  }
}

export const parseHcmStatePatch = (input: unknown): ParseResult<HcmStatePatch> => {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Expected a JSON object patch.",
    }
  }

  return {
    ok: true,
    value: input as HcmStatePatch,
  }
}

export const parseBalancePatchRequest = (
  input: unknown
): ParseResult<BalancePatchRequest> => {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Expected a JSON object balance patch.",
    }
  }

  const employeeId = asString(input.employeeId)
  const locationId = asString(input.locationId)
  const timeOffTypeId = asOptionalString(input.timeOffTypeId)
  const availableDays =
    typeof input.availableDays === "number" ? input.availableDays : undefined
  const pendingDays =
    typeof input.pendingDays === "number" ? input.pendingDays : undefined
  const hasAvailableDays = availableDays !== undefined
  const hasPendingDays = pendingDays !== undefined

  if (employeeId.trim().length === 0 || locationId.trim().length === 0) {
    return {
      ok: false,
      message: "employeeId and locationId are required.",
    }
  }

  if (!hasAvailableDays && !hasPendingDays) {
    return {
      ok: false,
      message: "availableDays or pendingDays is required.",
    }
  }

  if (
    (hasAvailableDays && !Number.isFinite(availableDays)) ||
    (hasPendingDays && !Number.isFinite(pendingDays))
  ) {
    return {
      ok: false,
      message: "Balance day values must be finite numbers.",
    }
  }

  if (
    (hasAvailableDays && availableDays < 0) ||
    (hasPendingDays && pendingDays < 0)
  ) {
    return {
      ok: false,
      message: "Balance day values cannot be negative.",
    }
  }

  return {
    ok: true,
    value: {
      employeeId,
      locationId,
      timeOffTypeId,
      availableDays,
      pendingDays,
    },
  }
}

export const validateTimeOffRequestForm = (
  input: unknown,
  effectiveAvailableDays?: number
): ParseResult<TimeOffRequestSubmission> & {
  readonly fieldErrors?: RequestFormFieldErrors
} => {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Expected a JSON object request submission.",
      fieldErrors: {
        employeeId: "Employee is required.",
        locationId: "Location is required.",
      },
    }
  }

  const employeeId = asString(input.employeeId).trim()
  const locationId = asString(input.locationId).trim()
  const timeOffTypeId = asString(
    input.timeOffTypeId,
    DEFAULT_TIME_OFF_TYPE_ID
  ).trim()
  const requestedDays = asRequestDays(input.requestedDays)
  const startDate = asString(input.startDate).trim()
  const endDate = asString(input.endDate).trim()
  const note = trimOptionalNote(input.note)
  const fieldErrors: MutableFieldErrors = {}

  if (employeeId.length === 0) {
    fieldErrors.employeeId = "Employee is required."
  }

  if (locationId.length === 0) {
    fieldErrors.locationId = "Location is required."
  }

  if (timeOffTypeId.length === 0) {
    fieldErrors.timeOffTypeId = "Time-off type is required."
  }

  if (!Number.isFinite(requestedDays)) {
    fieldErrors.requestedDays = "Requested days must be a number."
  } else if (requestedDays < 0.5) {
    fieldErrors.requestedDays = "Requested days must be at least 0.5."
  } else if (!isHalfDayIncrement(requestedDays)) {
    fieldErrors.requestedDays =
      "Requested days must use 0.5 day increments."
  } else if (
    effectiveAvailableDays !== undefined &&
    Number.isFinite(effectiveAvailableDays) &&
    requestedDays > effectiveAvailableDays
  ) {
    fieldErrors.requestedDays = `Requested days cannot exceed ${effectiveAvailableDays.toFixed(
      1
    )} effective days.`
  }

  if (!isValidLocalDate(startDate)) {
    fieldErrors.startDate = "Start date must be a valid local date."
  }

  if (!isValidLocalDate(endDate)) {
    fieldErrors.endDate = "End date must be a valid local date."
  }

  if (
    !fieldErrors.startDate &&
    !fieldErrors.endDate &&
    startDate > endDate
  ) {
    fieldErrors.endDate = "End date must be on or after the start date."
  }

  if (hasErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Request submission has invalid fields.",
      fieldErrors,
    }
  }

  return {
    ok: true,
    value: {
      employeeId,
      locationId,
      timeOffTypeId,
      requestedDays: Number(requestedDays.toFixed(1)),
      startDate,
      endDate,
      note,
    },
  }
}

export const parseManagerDecisionRequest = (
  input: unknown
): ParseResult<ManagerDecisionRequest> => {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Expected a JSON object manager decision.",
    }
  }

  const decision = asString(input.decision) as ManagerDecisionAction
  const reason = trimOptionalNote(input.reason)
  const expectedBalanceVersion =
    typeof input.expectedBalanceVersion === "number" &&
    Number.isFinite(input.expectedBalanceVersion)
      ? Math.round(input.expectedBalanceVersion)
      : undefined

  if (!managerDecisionActions.has(decision)) {
    return {
      ok: false,
      message: "decision must be approve or deny.",
    }
  }

  if (decision === "deny" && !reason) {
    return {
      ok: false,
      message: "A denial reason is required.",
    }
  }

  if (
    "expectedBalanceVersion" in input &&
    expectedBalanceVersion === undefined
  ) {
    return {
      ok: false,
      message: "expectedBalanceVersion must be a finite number.",
    }
  }

  return {
    ok: true,
    value: {
      decision,
      reason,
      expectedBalanceVersion,
    },
  }
}
