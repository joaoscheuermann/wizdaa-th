import type { TimeOffRequest } from "@/domain/time-off/types"

export const seededPendingRequest: TimeOffRequest = {
  requestId: "req-seeded-pending",
  employeeId: "emp-jordan",
  employeeName: "Jordan Lee",
  timeOffTypeId: "pto",
  timeOffTypeName: "Paid Time Off",
  locationId: "loc-austin",
  locationName: "Austin Studio",
  requestedDays: 2,
  startDate: "2026-05-11",
  endDate: "2026-05-12",
  note: "Seeded pending request placeholder for manager workflow.",
  status: "submitted_pending_manager",
  createdAt: "2026-04-28T12:10:00.000Z",
  updatedAt: "2026-04-28T12:10:00.000Z",
  lastHcmVerificationAt: "2026-04-28T12:10:00.000Z",
  balanceVersionAtSubmission: 1,
  auditEvents: [
    {
      at: "2026-04-28T12:10:00.000Z",
      type: "seeded",
      message: "Seeded request awaits manager review.",
    },
  ],
}

export const syncFailedRetryableRequest: TimeOffRequest = {
  ...seededPendingRequest,
  requestId: "req-sync-failed",
  employeeId: "emp-avery",
  employeeName: "Avery Stone",
  locationId: "loc-nyc",
  locationName: "New York HQ",
  requestedDays: 1,
  startDate: "2026-05-18",
  endDate: "2026-05-18",
  status: "sync_failed_retryable",
  statusReason:
    "HCM did not confirm the write. The employee can retry without re-entering the request.",
}

export const conflictReviewRequest: TimeOffRequest = {
  ...seededPendingRequest,
  requestId: "req-conflict-review",
  status: "conflict_needs_review",
  statusReason:
    "HCM reported a final approval conflict. A manager must re-review before approval.",
}
