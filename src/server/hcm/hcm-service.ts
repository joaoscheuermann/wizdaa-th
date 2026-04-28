import { DEFAULT_TIME_OFF_TYPE_ID } from "@/domain/time-off/constants"
import { getEffectiveAvailableDays } from "@/domain/time-off/freshness"
import {
  createAuditEvent,
  createSubmittedPendingManagerRequest,
  sortRequestsByOldest,
  sortRequestsByNewest,
} from "@/domain/time-off/lifecycle"
import {
  parseManagerDecisionRequest,
  validateTimeOffRequestForm,
} from "@/domain/time-off/schemas"
import type {
  EmployeeRequestsResponse,
  HcmBalanceRecord,
  HcmState,
  ManagerDecisionResponse,
  PendingRequestsResponse,
  RequestFormFieldErrors,
  RequestStatus,
  TimeOffRequest,
  ManagerDecisionRequest,
  TimeOffRequestSubmission,
  TimeOffRequestSubmissionResponse,
} from "@/domain/time-off/types"
import {
  getHcmState,
  replaceHcmState,
  sameBalanceCell,
  toBalanceCell,
} from "@/server/hcm/state-store"
import {
  isApprovalConflictScenario,
  isInsufficientBalanceScenario,
  isInvalidDimensionScenario,
  isSilentWrongSuccessScenario,
  isSubmitConflictScenario,
} from "@/server/hcm/scenarios"

type HcmRejectionCode =
  | "invalid_request"
  | "invalid_request_dimensions"
  | "insufficient_balance"

interface HcmRejectedResult {
  readonly ok: false
  readonly code: HcmRejectionCode
  readonly message: string
  readonly status: number
  readonly fieldErrors?: RequestFormFieldErrors
}

interface HcmAcceptedResult {
  readonly ok: true
  readonly value: TimeOffRequestSubmissionResponse
}

export type SubmitTimeOffRequestResult = HcmAcceptedResult | HcmRejectedResult

type HcmDecisionRejectionCode =
  | "invalid_decision"
  | "request_not_found"
  | "request_not_pending"
  | "balance_not_found"
  | "insufficient_balance_at_decision"

interface HcmDecisionRejectedResult {
  readonly ok: false
  readonly code: HcmDecisionRejectionCode
  readonly message: string
  readonly status: number
}

interface HcmDecisionAcceptedResult {
  readonly ok: true
  readonly value: ManagerDecisionResponse
}

export type ManagerDecisionResult =
  | HcmDecisionAcceptedResult
  | HcmDecisionRejectedResult

const nowIso = () => new Date().toISOString()

const managerPendingStatuses = new Set<RequestStatus>([
  "submitted_pending_manager",
  "manager_reviewing",
  "approval_pending_hcm",
  "conflict_needs_review",
])

const findById = <T extends { readonly id: string }>(
  values: readonly T[],
  id: string
) => values.find((value) => value.id === id)

const findBalance = (
  state: HcmState,
  submission: TimeOffRequestSubmission
) =>
  state.balances.find((balance) =>
    sameBalanceCell(balance, {
      employeeId: submission.employeeId,
      locationId: submission.locationId,
      timeOffTypeId: submission.timeOffTypeId,
    })
  )

const findRequestById = (state: HcmState, requestId: string) =>
  state.requests.find((request) => request.requestId === requestId)

const findRequestBalance = (state: HcmState, request: TimeOffRequest) =>
  state.balances.find((balance) =>
    sameBalanceCell(balance, {
      employeeId: request.employeeId,
      locationId: request.locationId,
      timeOffTypeId: request.timeOffTypeId,
    })
  )

const createRequestId = (
  submission: TimeOffRequestSubmission,
  submittedAt: string,
  requestCount: number
) =>
  `req-${submission.employeeId}-${submission.locationId}-${Date.parse(
    submittedAt
  ).toString(36)}-${requestCount + 1}`

const reserveBalance = (
  balance: HcmBalanceRecord,
  requestedDays: number,
  submittedAt: string
): HcmBalanceRecord => ({
  ...balance,
  pendingDays: Number((balance.pendingDays + requestedDays).toFixed(1)),
  lastVerifiedAt: submittedAt,
  version: balance.version + 1,
})

const roundDays = (days: number) => Number(days.toFixed(1))

const releasePendingDays = (
  balance: HcmBalanceRecord,
  requestedDays: number,
  decidedAt: string
): HcmBalanceRecord => ({
  ...balance,
  pendingDays: Math.max(0, roundDays(balance.pendingDays - requestedDays)),
  lastVerifiedAt: decidedAt,
  version: balance.version + 1,
})

const consumePendingDays = (
  balance: HcmBalanceRecord,
  requestedDays: number,
  decidedAt: string
): HcmBalanceRecord => ({
  ...balance,
  availableDays: Math.max(0, roundDays(balance.availableDays - requestedDays)),
  pendingDays: Math.max(0, roundDays(balance.pendingDays - requestedDays)),
  lastVerifiedAt: decidedAt,
  version: balance.version + 1,
})

const verifyBalance = (
  balance: HcmBalanceRecord,
  decidedAt: string
): HcmBalanceRecord => ({
  ...balance,
  lastVerifiedAt: decidedAt,
})

const isManagerPendingStatus = (status: RequestStatus) =>
  managerPendingStatuses.has(status)

const hasSufficientApprovalBalance = (
  balance: HcmBalanceRecord,
  request: TimeOffRequest
) =>
  balance.availableDays >= request.requestedDays &&
  balance.pendingDays >= request.requestedDays

const decisionError = (
  code: HcmDecisionRejectionCode,
  message: string,
  status: number
): HcmDecisionRejectedResult => ({
  ok: false,
  code,
  message,
  status,
})

const invalidDimensionResult = (): HcmRejectedResult => ({
  ok: false,
  code: "invalid_request_dimensions",
  message: "The selected employee, location, or time-off type is unavailable.",
  status: 400,
  fieldErrors: {
    locationId: "Choose a location with an HCM balance.",
  },
})

const insufficientBalanceResult = (
  effectiveAvailableDays: number
): HcmRejectedResult => ({
  ok: false,
  code: "insufficient_balance",
  message: `Only ${effectiveAvailableDays.toFixed(
    1
  )} effective days are available for that location.`,
  status: 409,
  fieldErrors: {
    requestedDays: "Requested days exceed the current effective balance.",
  },
})

const createConflictRequest = (
  request: TimeOffRequest,
  at: string,
  reason: string
): TimeOffRequest => ({
  ...request,
  status: "conflict_needs_review",
  statusReason: reason,
  updatedAt: at,
  lastHcmVerificationAt: at,
  auditEvents: [
    ...request.auditEvents,
    createAuditEvent(at, "conflict_needs_review", reason),
  ],
})

export const listEmployeeRequests = (
  employeeId: string
): EmployeeRequestsResponse => {
  const fetchedAt = nowIso()
  const state = getHcmState()

  return {
    requests: sortRequestsByNewest(
      state.requests.filter((request) => request.employeeId === employeeId)
    ),
    fetchedAt,
  }
}

export const listPendingRequests = (): PendingRequestsResponse => {
  const fetchedAt = nowIso()
  const state = getHcmState()

  return {
    requests: sortRequestsByOldest(
      state.requests.filter((request) =>
        isManagerPendingStatus(request.status)
      )
    ),
    fetchedAt,
  }
}

export const submitTimeOffRequest = (
  input: unknown,
  submittedAt = nowIso()
): SubmitTimeOffRequestResult => {
  const parsed = validateTimeOffRequestForm(input)

  if (!parsed.ok) {
    return {
      ok: false,
      code: "invalid_request",
      message: parsed.message,
      status: 400,
      fieldErrors: parsed.fieldErrors,
    }
  }

  const submission = {
    ...parsed.value,
    timeOffTypeId: parsed.value.timeOffTypeId || DEFAULT_TIME_OFF_TYPE_ID,
  }
  const state = getHcmState()
  const scenarioMode = state.scenario.mode
  const employee = findById(state.employees, submission.employeeId)
  const location = findById(state.locations, submission.locationId)
  const timeOffType = findById(state.timeOffTypes, submission.timeOffTypeId)
  const balance = findBalance(state, submission)

  if (
    !employee ||
    !location ||
    !timeOffType ||
    !balance ||
    isInvalidDimensionScenario(scenarioMode)
  ) {
    return invalidDimensionResult()
  }

  const effectiveAvailableDays = getEffectiveAvailableDays(
    balance.availableDays,
    balance.pendingDays
  )

  if (
    submission.requestedDays > effectiveAvailableDays ||
    isInsufficientBalanceScenario(scenarioMode)
  ) {
    return insufficientBalanceResult(effectiveAvailableDays)
  }

  const request = createSubmittedPendingManagerRequest({
    requestId: createRequestId(submission, submittedAt, state.requests.length),
    submission,
    employee,
    location,
    timeOffType,
    submittedAt,
    balanceVersionAtSubmission: balance.version,
  })

  if (isSubmitConflictScenario(scenarioMode)) {
    const conflictReason =
      "HCM rejected the submission after verification. Manager review is required."
    const conflictRequest = createConflictRequest(
      request,
      submittedAt,
      conflictReason
    )
    const updatedState = replaceHcmState({
      ...state,
      requests: [...state.requests, conflictRequest],
    })

    return {
      ok: true,
      value: {
        request: conflictRequest,
        balance: toBalanceCell(updatedState, balance, Date.parse(submittedAt)),
      },
    }
  }

  if (isSilentWrongSuccessScenario(scenarioMode)) {
    const conflictReason =
      "HCM accepted the request response but later contradicted it during reconciliation."
    const conflictRequest = createConflictRequest(
      request,
      submittedAt,
      conflictReason
    )
    const wrongSuccessBalance = reserveBalance(
      balance,
      submission.requestedDays,
      submittedAt
    )
    const authoritativeState = replaceHcmState({
      ...state,
      requests: [...state.requests, conflictRequest],
    })
    const responseState: HcmState = {
      ...authoritativeState,
      balances: updateBalance(authoritativeState, wrongSuccessBalance),
    }

    return {
      ok: true,
      value: {
        request,
        balance: toBalanceCell(
          responseState,
          wrongSuccessBalance,
          Date.parse(submittedAt)
        ),
      },
    }
  }

  const reservedBalance = reserveBalance(
    balance,
    submission.requestedDays,
    submittedAt
  )
  const updatedState = replaceHcmState({
    ...state,
    balances: state.balances.map((candidate) =>
      sameBalanceCell(candidate, submission) ? reservedBalance : candidate
    ),
    requests: [...state.requests, request],
  })
  const updatedBalance = updatedState.balances.find((candidate) =>
    sameBalanceCell(candidate, submission)
  )

  if (!updatedBalance) return invalidDimensionResult()

  return {
    ok: true,
    value: {
      request,
      balance: toBalanceCell(updatedState, updatedBalance, Date.parse(submittedAt)),
    },
  }
}

const toDecisionResponse = (
  state: HcmState,
  requestId: string,
  balance: HcmBalanceRecord,
  decidedAt: string,
  outcome: ManagerDecisionResponse["outcome"],
  reconfirmation?: ManagerDecisionResponse["reconfirmation"]
): ManagerDecisionResult => {
  const request = findRequestById(state, requestId)
  const updatedBalance = state.balances.find((candidate) =>
    sameBalanceCell(candidate, balance)
  )

  if (!request || !updatedBalance) {
    return decisionError(
      "request_not_found",
      "The request could not be resolved after the decision.",
      404
    )
  }

  return {
    ok: true,
    value: {
      outcome,
      request,
      balance: toBalanceCell(state, updatedBalance, Date.parse(decidedAt)),
      reconfirmation,
    },
  }
}

const updateRequest = (
  state: HcmState,
  request: TimeOffRequest
): readonly TimeOffRequest[] =>
  state.requests.map((candidate) =>
    candidate.requestId === request.requestId ? request : candidate
  )

const updateBalance = (
  state: HcmState,
  balance: HcmBalanceRecord
): readonly HcmBalanceRecord[] =>
  state.balances.map((candidate) =>
    sameBalanceCell(candidate, balance) ? balance : candidate
  )

const approveRequest = (
  state: HcmState,
  request: TimeOffRequest,
  balance: HcmBalanceRecord,
  decidedAt: string
): ManagerDecisionResult => {
  const approvedBalance = consumePendingDays(
    balance,
    request.requestedDays,
    decidedAt
  )
  const approvedRequest: TimeOffRequest = {
    ...request,
    status: "approved",
    updatedAt: decidedAt,
    lastHcmVerificationAt: decidedAt,
    balanceVersionAtDecision: approvedBalance.version,
    statusReason: undefined,
    auditEvents: [
      ...request.auditEvents,
      createAuditEvent(
        decidedAt,
        "approval_pending_hcm",
        "Manager approved the request and HCM verified the current balance."
      ),
      createAuditEvent(
        decidedAt,
        "approved",
        "HCM converted pending days into consumed balance."
      ),
    ],
  }
  const updatedState = replaceHcmState({
    ...state,
    balances: updateBalance(state, approvedBalance),
    requests: updateRequest(state, approvedRequest),
  })

  return toDecisionResponse(
    updatedState,
    request.requestId,
    approvedBalance,
    decidedAt,
    "approved"
  )
}

const denyRequest = (
  state: HcmState,
  request: TimeOffRequest,
  balance: HcmBalanceRecord,
  decision: ManagerDecisionRequest,
  decidedAt: string
): ManagerDecisionResult => {
  const deniedBalance = releasePendingDays(
    balance,
    request.requestedDays,
    decidedAt
  )
  const deniedRequest: TimeOffRequest = {
    ...request,
    status: "denied",
    statusReason: decision.reason,
    updatedAt: decidedAt,
    lastHcmVerificationAt: decidedAt,
    balanceVersionAtDecision: deniedBalance.version,
    auditEvents: [
      ...request.auditEvents,
      createAuditEvent(
        decidedAt,
        "denied",
        `Manager denied the request: ${decision.reason}`
      ),
    ],
  }
  const updatedState = replaceHcmState({
    ...state,
    balances: updateBalance(state, deniedBalance),
    requests: updateRequest(state, deniedRequest),
  })

  return toDecisionResponse(
    updatedState,
    request.requestId,
    deniedBalance,
    decidedAt,
    "denied"
  )
}

const requireReconfirmation = (
  state: HcmState,
  request: TimeOffRequest,
  balance: HcmBalanceRecord,
  previousBalanceVersion: number,
  decidedAt: string
): ManagerDecisionResult => {
  const verifiedBalance = verifyBalance(balance, decidedAt)
  const reconfirmationRequest: TimeOffRequest = {
    ...request,
    status: "conflict_needs_review",
    updatedAt: decidedAt,
    lastHcmVerificationAt: decidedAt,
    balanceVersionAtDecision: verifiedBalance.version,
    auditEvents: [
      ...request.auditEvents,
      createAuditEvent(
        decidedAt,
        "conflict_needs_review",
        "HCM balance changed at decision time; manager reconfirmation is required."
      ),
    ],
  }
  const updatedState = replaceHcmState({
    ...state,
    balances: updateBalance(state, verifiedBalance),
    requests: updateRequest(state, reconfirmationRequest),
  })

  return toDecisionResponse(
    updatedState,
    request.requestId,
    verifiedBalance,
    decidedAt,
    "reconfirmation_required",
    {
      previousBalanceVersion,
      currentBalanceVersion: verifiedBalance.version,
      message:
        "The HCM balance changed but can still cover this request. Confirm approval again to continue.",
    }
  )
}

const requireManagerReviewConflict = (
  state: HcmState,
  request: TimeOffRequest,
  balance: HcmBalanceRecord,
  decidedAt: string,
  reason: string
): ManagerDecisionResult => {
  const verifiedBalance = verifyBalance(balance, decidedAt)
  const conflictRequest: TimeOffRequest = {
    ...createConflictRequest(request, decidedAt, reason),
    balanceVersionAtDecision: verifiedBalance.version,
  }
  const updatedState = replaceHcmState({
    ...state,
    balances: updateBalance(state, verifiedBalance),
    requests: updateRequest(state, conflictRequest),
  })

  return toDecisionResponse(
    updatedState,
    request.requestId,
    verifiedBalance,
    decidedAt,
    "conflict_needs_review"
  )
}

export const decideTimeOffRequest = (
  requestId: string,
  input: unknown,
  decidedAt = nowIso()
): ManagerDecisionResult => {
  const parsed = parseManagerDecisionRequest(input)

  if (!parsed.ok) {
    return decisionError("invalid_decision", parsed.message, 400)
  }

  const decision = parsed.value
  const state = getHcmState()
  const scenarioMode = state.scenario.mode
  const request = findRequestById(state, requestId)

  if (!request) {
    return decisionError(
      "request_not_found",
      "No HCM request exists for that requestId.",
      404
    )
  }

  if (!isManagerPendingStatus(request.status)) {
    return decisionError(
      "request_not_pending",
      "Only pending manager-review requests can be decided.",
      409
    )
  }

  const balance = findRequestBalance(state, request)

  if (!balance) {
    return decisionError(
      "balance_not_found",
      "No HCM balance exists for that request.",
      404
    )
  }

  if (decision.decision === "deny") {
    return denyRequest(state, request, balance, decision, decidedAt)
  }

  if (isInvalidDimensionScenario(scenarioMode)) {
    return requireManagerReviewConflict(
      state,
      request,
      balance,
      decidedAt,
      "HCM rejected approval because the employee/location dimension is unavailable."
    )
  }

  if (
    !hasSufficientApprovalBalance(balance, request) ||
    isInsufficientBalanceScenario(scenarioMode)
  ) {
    return requireManagerReviewConflict(
      state,
      request,
      balance,
      decidedAt,
      "The current HCM balance can no longer cover this request."
    )
  }

  if (isApprovalConflictScenario(scenarioMode)) {
    return requireManagerReviewConflict(
      state,
      request,
      balance,
      decidedAt,
      "HCM reported a final approval conflict. A manager must re-review before approval."
    )
  }

  if (
    decision.expectedBalanceVersion !== undefined &&
    balance.version !== decision.expectedBalanceVersion
  ) {
    return requireReconfirmation(
      state,
      request,
      balance,
      decision.expectedBalanceVersion,
      decidedAt
    )
  }

  return approveRequest(state, request, balance, decidedAt)
}
