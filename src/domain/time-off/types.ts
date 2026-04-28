export type UserRole = "employee" | "manager"

export type BalanceFreshnessStatus =
  | "loading"
  | "fresh"
  | "refreshing"
  | "stale"
  | "refresh_failed"
  | "conflict"
  | "error"

export type BalanceSource = "hcm"

export type RequestStatus =
  | "draft"
  | "submitting"
  | "submitted_pending_hcm"
  | "submitted_pending_manager"
  | "rejected_by_hcm"
  | "manager_reviewing"
  | "approval_pending_hcm"
  | "approved"
  | "denied"
  | "conflict_needs_review"
  | "sync_failed_retryable"

export const hcmScenarioModes = [
  "normal",
  "slow_read",
  "slow_write",
  "insufficient_balance",
  "invalid_dimension",
  "silent_wrong_success",
  "silent_no_response",
  "conflict_on_submit",
  "conflict_on_approval",
  "anniversary_bonus_mid_session",
] as const

export type HcmScenarioMode = (typeof hcmScenarioModes)[number]

export interface DemoUser {
  readonly id: string
  readonly name: string
  readonly role: UserRole
  readonly managerId?: string
}

export interface DemoLocation {
  readonly id: string
  readonly name: string
  readonly code: string
}

export interface TimeOffType {
  readonly id: string
  readonly name: string
}

export interface HcmBalanceRecord {
  readonly employeeId: string
  readonly locationId: string
  readonly timeOffTypeId: string
  readonly availableDays: number
  readonly pendingDays: number
  readonly lastVerifiedAt: string
  readonly source: BalanceSource
  readonly version: number
}

export interface BalanceCell extends HcmBalanceRecord {
  readonly employeeName: string
  readonly locationName: string
  readonly timeOffTypeName: string
  readonly effectiveAvailableDays: number
  readonly freshnessStatus: BalanceFreshnessStatus
}

export interface BalanceBatchResponse {
  readonly balances: readonly BalanceCell[]
  readonly fetchedAt: string
}

export interface BalanceCellResponse {
  readonly balance: BalanceCell
}

export interface BalancePatchRequest {
  readonly employeeId: string
  readonly locationId: string
  readonly timeOffTypeId?: string
  readonly availableDays?: number
  readonly pendingDays?: number
}

export type HcmBalanceRecordPatch = Pick<
  HcmBalanceRecord,
  "employeeId" | "locationId"
> &
  Partial<Omit<HcmBalanceRecord, "employeeId" | "locationId" | "source">>

export interface TimeOffRequestSubmission {
  readonly employeeId: string
  readonly locationId: string
  readonly timeOffTypeId: string
  readonly requestedDays: number
  readonly startDate: string
  readonly endDate: string
  readonly note?: string
}

export interface RequestFormFieldErrors {
  readonly employeeId?: string
  readonly locationId?: string
  readonly timeOffTypeId?: string
  readonly requestedDays?: string
  readonly startDate?: string
  readonly endDate?: string
  readonly note?: string
}

export interface RequestAuditEvent {
  readonly at: string
  readonly type: string
  readonly message: string
}

export interface TimeOffRequest {
  readonly requestId: string
  readonly employeeId: string
  readonly employeeName: string
  readonly timeOffTypeId: string
  readonly timeOffTypeName: string
  readonly locationId: string
  readonly locationName: string
  readonly requestedDays: number
  readonly startDate: string
  readonly endDate: string
  readonly note?: string
  readonly status: RequestStatus
  readonly createdAt: string
  readonly updatedAt: string
  readonly lastHcmVerificationAt?: string
  readonly balanceVersionAtSubmission?: number
  readonly balanceVersionAtDecision?: number
  readonly statusReason?: string
  readonly auditEvents: readonly RequestAuditEvent[]
}

export interface HcmScenarioState {
  readonly mode: HcmScenarioMode
  readonly updatedAt: string
}

export interface HcmState {
  readonly employees: readonly DemoUser[]
  readonly locations: readonly DemoLocation[]
  readonly timeOffTypes: readonly TimeOffType[]
  readonly balances: readonly HcmBalanceRecord[]
  readonly requests: readonly TimeOffRequest[]
  readonly scenario: HcmScenarioState
}

export interface HcmStatePatch {
  readonly employees?: readonly DemoUser[]
  readonly locations?: readonly DemoLocation[]
  readonly timeOffTypes?: readonly TimeOffType[]
  readonly balances?: readonly HcmBalanceRecordPatch[]
  readonly requests?: readonly TimeOffRequest[]
  readonly scenario?: Partial<HcmScenarioState>
}

export interface UserResponse {
  readonly user: DemoUser
}

export interface TimeOffRequestSubmissionResponse {
  readonly request: TimeOffRequest
  readonly balance: BalanceCell
}

export interface EmployeeRequestsResponse {
  readonly requests: readonly TimeOffRequest[]
  readonly fetchedAt: string
}

export interface PendingRequestsResponse {
  readonly requests: readonly TimeOffRequest[]
  readonly fetchedAt: string
}

export type ManagerDecisionAction = "approve" | "deny"

export interface ManagerDecisionRequest {
  readonly decision: ManagerDecisionAction
  readonly reason?: string
  readonly expectedBalanceVersion?: number
}

export interface ManagerDecisionReconfirmation {
  readonly previousBalanceVersion: number
  readonly currentBalanceVersion: number
  readonly message: string
}

export interface ManagerDecisionResponse {
  readonly outcome:
    | "approved"
    | "denied"
    | "reconfirmation_required"
    | "conflict_needs_review"
  readonly request: TimeOffRequest
  readonly balance: BalanceCell
  readonly reconfirmation?: ManagerDecisionReconfirmation
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly fieldErrors?: RequestFormFieldErrors
  }
}
