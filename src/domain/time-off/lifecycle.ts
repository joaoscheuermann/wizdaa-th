import type {
  BalanceCell,
  DemoLocation,
  DemoUser,
  RequestAuditEvent,
  RequestStatus,
  TimeOffRequest,
  TimeOffRequestSubmission,
  TimeOffType,
} from "@/domain/time-off/types"

interface SubmittedRequestInput {
  readonly requestId: string
  readonly submission: TimeOffRequestSubmission
  readonly employee: Pick<DemoUser, "id" | "name">
  readonly location: Pick<DemoLocation, "id" | "name">
  readonly timeOffType: Pick<TimeOffType, "id" | "name">
  readonly submittedAt: string
  readonly balanceVersionAtSubmission: number
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  draft: "Draft",
  submitting: "Submitting",
  submitted_pending_hcm: "Pending HCM verification",
  submitted_pending_manager: "Pending manager review",
  rejected_by_hcm: "Rejected by HCM",
  manager_reviewing: "Manager reviewing",
  approval_pending_hcm: "Approval pending HCM",
  approved: "Approved",
  denied: "Denied",
  conflict_needs_review: "Conflict needs review",
  sync_failed_retryable: "Sync failed",
}

export const getRequestStatusLabel = (status: RequestStatus) =>
  requestStatusLabels[status]

export const isPendingRequestStatus = (status: RequestStatus) =>
  status === "submitted_pending_hcm" ||
  status === "submitted_pending_manager" ||
  status === "manager_reviewing" ||
  status === "approval_pending_hcm" ||
  status === "conflict_needs_review"

export const createAuditEvent = (
  at: string,
  type: string,
  message: string
): RequestAuditEvent => ({
  at,
  type,
  message,
})

export const createSubmittedPendingManagerRequest = ({
  balanceVersionAtSubmission,
  employee,
  location,
  requestId,
  submission,
  submittedAt,
  timeOffType,
}: SubmittedRequestInput): TimeOffRequest => ({
  requestId,
  employeeId: employee.id,
  employeeName: employee.name,
  timeOffTypeId: timeOffType.id,
  timeOffTypeName: timeOffType.name,
  locationId: location.id,
  locationName: location.name,
  requestedDays: submission.requestedDays,
  startDate: submission.startDate,
  endDate: submission.endDate,
  note: submission.note,
  status: "submitted_pending_manager",
  createdAt: submittedAt,
  updatedAt: submittedAt,
  lastHcmVerificationAt: submittedAt,
  balanceVersionAtSubmission,
  auditEvents: [
    createAuditEvent(
      submittedAt,
      "submitted_pending_manager",
      "HCM reserved pending days and sent the request to manager review."
    ),
  ],
})

export const createOptimisticPendingRequest = (
  submission: TimeOffRequestSubmission,
  balance: BalanceCell,
  submittedAt: string
) =>
  createSubmittedPendingManagerRequest({
    requestId: `optimistic-${submission.employeeId}-${submittedAt}`,
    submission,
    employee: {
      id: balance.employeeId,
      name: balance.employeeName,
    },
    location: {
      id: balance.locationId,
      name: balance.locationName,
    },
    timeOffType: {
      id: balance.timeOffTypeId,
      name: balance.timeOffTypeName,
    },
    submittedAt,
    balanceVersionAtSubmission: balance.version,
  })

export const sortRequestsByNewest = (
  requests: readonly TimeOffRequest[]
): readonly TimeOffRequest[] =>
  [...requests].sort(
    (left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
      right.requestId.localeCompare(left.requestId)
  )

export const sortRequestsByOldest = (
  requests: readonly TimeOffRequest[]
): readonly TimeOffRequest[] =>
  [...requests].sort(
    (left, right) =>
      Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
      left.requestId.localeCompare(right.requestId)
  )
