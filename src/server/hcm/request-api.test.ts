import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  GET as listRequests,
  POST as submitRequest,
} from "@/app/api/hcm/requests/route"
import { PATCH as decideRequest } from "@/app/api/hcm/requests/[requestId]/route"
import type {
  ApiErrorResponse,
  HcmState,
  ManagerDecisionResponse,
  PendingRequestsResponse,
  TimeOffRequest,
  TimeOffRequestSubmissionResponse,
} from "@/domain/time-off/types"
import { HCM_SLOW_WRITE_RESPONSE_DELAY_MS } from "@/server/hcm/scenarios"
import {
  getHcmState,
  patchHcmState,
  replaceHcmState,
  resetHcmState,
  writeBalanceCell,
} from "@/server/hcm/state-store"

const requestBody = (body: unknown) =>
  new Request("http://localhost/api/hcm/requests", {
    method: "POST",
    body: JSON.stringify(body),
  })

const decisionBody = (requestId: string, body: unknown) =>
  new Request(`http://localhost/api/hcm/requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })

const decisionContext = (requestId: string) => ({
  params: Promise.resolve({ requestId }),
})

const validSubmission = {
  employeeId: "emp-avery",
  locationId: "loc-nyc",
  timeOffTypeId: "pto",
  requestedDays: 2.5,
  startDate: "2026-05-18",
  endDate: "2026-05-20",
  note: "Family trip",
}

const findBalance = (state: HcmState, employeeId: string, locationId: string) =>
  state.balances.find(
    (balance) =>
      balance.employeeId === employeeId && balance.locationId === locationId
  )

const patchScenarioMode = (mode: HcmState["scenario"]["mode"]) => {
  const patched = patchHcmState({
    scenario: {
      mode,
      updatedAt: "2026-04-28T13:00:00.000Z",
    },
  })

  if (!patched) throw new Error(`Unable to patch scenario ${mode}.`)
}

const seededPendingRequest = () => {
  const request = getHcmState().requests.find(
    (candidate) => candidate.requestId === "req-seeded-pending"
  )

  if (!request) throw new Error("Missing seeded pending request.")

  return request
}

const clonePendingRequest = (
  request: TimeOffRequest,
  requestId: string,
  createdAt: string
): TimeOffRequest => ({
  ...request,
  requestId,
  createdAt,
  updatedAt: createdAt,
  auditEvents: [...request.auditEvents],
})

const decideSeededRequest = (body: unknown) =>
  decideRequest(
    decisionBody("req-seeded-pending", body),
    decisionContext("req-seeded-pending")
  )

describe("/api/hcm/requests", () => {
  beforeEach(() => {
    resetHcmState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("creates a pending manager-review request and reserves pending days", async () => {
    const before = getHcmState()
    const beforeBalance = findBalance(before, "emp-avery", "loc-nyc")

    const response = await submitRequest(requestBody(validSubmission))
    const body = (await response.json()) as TimeOffRequestSubmissionResponse
    const after = getHcmState()
    const afterBalance = findBalance(after, "emp-avery", "loc-nyc")

    expect(response.status).toBe(200)
    expect(body.request).toMatchObject({
      employeeId: "emp-avery",
      locationId: "loc-nyc",
      requestedDays: 2.5,
      status: "submitted_pending_manager",
    })
    expect(body.request.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "submitted_pending_manager",
        }),
      ])
    )
    expect(body.balance.pendingDays).toBe(
      (beforeBalance?.pendingDays ?? 0) + 2.5
    )
    expect(afterBalance?.pendingDays).toBe(
      (beforeBalance?.pendingDays ?? 0) + 2.5
    )
    expect(afterBalance?.version).toBe((beforeBalance?.version ?? 0) + 1)
    expect(after.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: body.request.requestId,
          status: "submitted_pending_manager",
        }),
      ])
    )
  })

  it("rejects insufficient balance without mutating pending days or requests", async () => {
    const before = getHcmState()
    const response = await submitRequest(
      requestBody({
        ...validSubmission,
        employeeId: "emp-jordan",
        locationId: "loc-nyc",
        requestedDays: 2,
      })
    )
    const body = (await response.json()) as ApiErrorResponse
    const after = getHcmState()

    expect(response.status).toBe(409)
    expect(body.error.code).toBe("insufficient_balance")
    expect(findBalance(after, "emp-jordan", "loc-nyc")).toEqual(
      findBalance(before, "emp-jordan", "loc-nyc")
    )
    expect(after.requests).toEqual(before.requests)
  })

  it("rejects invalid dimensions without mutating state", async () => {
    const before = getHcmState()
    const response = await submitRequest(
      requestBody({
        ...validSubmission,
        locationId: "loc-missing",
      })
    )
    const body = (await response.json()) as ApiErrorResponse
    const after = getHcmState()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("invalid_request_dimensions")
    expect(after).toEqual(before)
  })

  it("delays slow write scenario responses beyond the client write timeout window", async () => {
    vi.useFakeTimers()
    patchScenarioMode("slow_write")

    const before = getHcmState()
    const responsePromise = submitRequest(requestBody(validSubmission))

    await vi.advanceTimersByTimeAsync(HCM_SLOW_WRITE_RESPONSE_DELAY_MS - 1)

    expect(getHcmState()).toEqual(before)

    await vi.advanceTimersByTimeAsync(1)

    const response = await responsePromise
    const body = (await response.json()) as TimeOffRequestSubmissionResponse

    expect(response.status).toBe(200)
    expect(body.request.status).toBe("submitted_pending_manager")
  })

  it("keeps silent no-response submissions retryable without mutating state", async () => {
    vi.useFakeTimers()
    patchScenarioMode("silent_no_response")

    const before = getHcmState()
    const responsePromise = submitRequest(requestBody(validSubmission))

    await vi.advanceTimersByTimeAsync(HCM_SLOW_WRITE_RESPONSE_DELAY_MS)

    const response = await responsePromise
    const body = (await response.json()) as ApiErrorResponse

    expect(response.status).toBe(504)
    expect(body.error.code).toBe("sync_failed_retryable")
    expect(getHcmState()).toEqual(before)

    patchScenarioMode("normal")

    const retryResponse = await submitRequest(requestBody(validSubmission))
    const retryBody =
      (await retryResponse.json()) as TimeOffRequestSubmissionResponse

    expect(retryResponse.status).toBe(200)
    expect(retryBody.request.status).toBe("submitted_pending_manager")
  })

  it("records silent wrong success contradictions for reconciliation", async () => {
    patchScenarioMode("silent_wrong_success")

    const before = getHcmState()
    const beforeBalance = findBalance(before, "emp-avery", "loc-nyc")
    const response = await submitRequest(requestBody(validSubmission))
    const body = (await response.json()) as TimeOffRequestSubmissionResponse
    const after = getHcmState()
    const authoritativeRequest = after.requests.find(
      (request) => request.requestId === body.request.requestId
    )
    const authoritativeBalance = findBalance(after, "emp-avery", "loc-nyc")

    expect(response.status).toBe(200)
    expect(body.request.status).toBe("submitted_pending_manager")
    expect(body.balance.pendingDays).toBe(
      (beforeBalance?.pendingDays ?? 0) + validSubmission.requestedDays
    )
    expect(authoritativeRequest).toMatchObject({
      requestId: body.request.requestId,
      status: "conflict_needs_review",
    })
    expect(authoritativeBalance).toEqual(beforeBalance)

    const reconciliationResponse = await listRequests(
      new Request("http://localhost/api/hcm/requests?employeeId=emp-avery")
    )
    const reconciliationBody =
      (await reconciliationResponse.json()) as PendingRequestsResponse

    expect(
      reconciliationBody.requests.find(
        (request) => request.requestId === body.request.requestId
      )
    ).toMatchObject({
      status: "conflict_needs_review",
      statusReason:
        "HCM accepted the request response but later contradicted it during reconciliation.",
    })
  })

  it("creates a visible submit conflict without reserving pending days", async () => {
    patchScenarioMode("conflict_on_submit")

    const before = getHcmState()
    const beforeBalance = findBalance(before, "emp-avery", "loc-nyc")
    const response = await submitRequest(requestBody(validSubmission))
    const body = (await response.json()) as TimeOffRequestSubmissionResponse
    const after = getHcmState()

    expect(response.status).toBe(200)
    expect(body.request.status).toBe("conflict_needs_review")
    expect(body.request.statusReason).toBe(
      "HCM rejected the submission after verification. Manager review is required."
    )
    expect(findBalance(after, "emp-avery", "loc-nyc")).toEqual(beforeBalance)
    expect(after.requests).toHaveLength(before.requests.length + 1)
  })

  it("applies deterministic invalid dimension and insufficient balance scenarios", async () => {
    patchScenarioMode("invalid_dimension")

    const invalidResponse = await submitRequest(requestBody(validSubmission))
    const invalidBody = (await invalidResponse.json()) as ApiErrorResponse

    expect(invalidResponse.status).toBe(400)
    expect(invalidBody.error.code).toBe("invalid_request_dimensions")
    expect(invalidBody.error.fieldErrors?.locationId).toBe(
      "Choose a location with an HCM balance."
    )

    patchScenarioMode("insufficient_balance")

    const insufficientResponse = await submitRequest(
      requestBody(validSubmission)
    )
    const insufficientBody =
      (await insufficientResponse.json()) as ApiErrorResponse

    expect(insufficientResponse.status).toBe(409)
    expect(insufficientBody.error.code).toBe("insufficient_balance")
    expect(insufficientBody.error.fieldErrors?.requestedDays).toBe(
      "Requested days exceed the current effective balance."
    )
  })

  it("returns the pending queue sorted oldest first", async () => {
    const request = seededPendingRequest()

    replaceHcmState({
      ...getHcmState(),
      requests: [
        clonePendingRequest(request, "req-newer", "2026-04-28T12:30:00.000Z"),
        clonePendingRequest(request, "req-older", "2026-04-28T11:55:00.000Z"),
      ],
    })

    const response = await listRequests(
      new Request("http://localhost/api/hcm/requests?status=pending")
    )
    const body = (await response.json()) as PendingRequestsResponse

    expect(response.status).toBe(200)
    expect(body.requests.map((request) => request.requestId)).toEqual([
      "req-older",
      "req-newer",
    ])
  })

  it("moves a pending request to approved only after decision-time verification", async () => {
    const response = await decideSeededRequest({
      decision: "approve",
      expectedBalanceVersion: 1,
    })
    const body = (await response.json()) as ManagerDecisionResponse

    expect(response.status).toBe(200)
    expect(body.outcome).toBe("approved")
    expect(body.request.status).toBe("approved")
    expect(body.request.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "approval_pending_hcm" }),
        expect.objectContaining({ type: "approved" }),
      ])
    )
  })

  it("converts approved pending days into consumed balance", async () => {
    const before = getHcmState()
    const beforeBalance = findBalance(before, "emp-jordan", "loc-austin")

    await decideSeededRequest({
      decision: "approve",
      expectedBalanceVersion: beforeBalance?.version,
    })

    const after = getHcmState()
    const afterBalance = findBalance(after, "emp-jordan", "loc-austin")

    expect(afterBalance?.availableDays).toBe(
      (beforeBalance?.availableDays ?? 0) - 2
    )
    expect(afterBalance?.pendingDays).toBe(
      (beforeBalance?.pendingDays ?? 0) - 2
    )
    expect(afterBalance?.version).toBe((beforeBalance?.version ?? 0) + 1)
  })

  it("stores a denial reason on denied requests", async () => {
    const response = await decideSeededRequest({
      decision: "deny",
      reason: "Coverage gap during launch week",
    })
    const body = (await response.json()) as ManagerDecisionResponse

    expect(response.status).toBe(200)
    expect(body.outcome).toBe("denied")
    expect(body.request).toMatchObject({
      status: "denied",
      statusReason: "Coverage gap during launch week",
    })
  })

  it("releases pending days after denial", async () => {
    const before = getHcmState()
    const beforeBalance = findBalance(before, "emp-jordan", "loc-austin")

    await decideSeededRequest({
      decision: "deny",
      reason: "Coverage gap during launch week",
    })

    const after = getHcmState()
    const afterBalance = findBalance(after, "emp-jordan", "loc-austin")

    expect(afterBalance?.availableDays).toBe(beforeBalance?.availableDays)
    expect(afterBalance?.pendingDays).toBe(
      (beforeBalance?.pendingDays ?? 0) - 2
    )
    expect(afterBalance?.version).toBe((beforeBalance?.version ?? 0) + 1)
  })

  it("requires reconfirmation when the balance changed but remains sufficient", async () => {
    const beforeBalance = findBalance(
      getHcmState(),
      "emp-jordan",
      "loc-austin"
    )

    writeBalanceCell({
      employeeId: "emp-jordan",
      locationId: "loc-austin",
      availableDays: 15,
    })

    const response = await decideSeededRequest({
      decision: "approve",
      expectedBalanceVersion: beforeBalance?.version,
    })
    const body = (await response.json()) as ManagerDecisionResponse
    const conflictState = getHcmState()
    const conflictRequest = conflictState.requests.find(
      (request) => request.requestId === "req-seeded-pending"
    )

    expect(response.status).toBe(200)
    expect(body.outcome).toBe("reconfirmation_required")
    expect(body.reconfirmation).toMatchObject({
      previousBalanceVersion: beforeBalance?.version,
      currentBalanceVersion: body.balance.version,
    })
    expect(conflictRequest?.status).toBe("conflict_needs_review")

    const confirmedResponse = await decideSeededRequest({
      decision: "approve",
      expectedBalanceVersion: body.balance.version,
    })
    const confirmedBody =
      (await confirmedResponse.json()) as ManagerDecisionResponse

    expect(confirmedBody.outcome).toBe("approved")
    expect(confirmedBody.request.status).toBe("approved")
  })

  it("keeps final approval conflicts in manager re-review until retried", async () => {
    const before = getHcmState()
    const beforeBalance = findBalance(before, "emp-jordan", "loc-austin")

    patchScenarioMode("conflict_on_approval")

    const response = await decideSeededRequest({
      decision: "approve",
      expectedBalanceVersion: beforeBalance?.version,
    })
    const body = (await response.json()) as ManagerDecisionResponse
    const conflictState = getHcmState()
    const conflictBalance = findBalance(
      conflictState,
      "emp-jordan",
      "loc-austin"
    )

    expect(response.status).toBe(200)
    expect(body.outcome).toBe("conflict_needs_review")
    expect(body.request.status).toBe("conflict_needs_review")
    expect(body.request.statusReason).toBe(
      "HCM reported a final approval conflict. A manager must re-review before approval."
    )
    expect(conflictBalance?.availableDays).toBe(beforeBalance?.availableDays)
    expect(conflictBalance?.pendingDays).toBe(beforeBalance?.pendingDays)

    patchScenarioMode("normal")

    const retryResponse = await decideSeededRequest({
      decision: "approve",
      expectedBalanceVersion: conflictBalance?.version,
    })
    const retryBody = (await retryResponse.json()) as ManagerDecisionResponse

    expect(retryBody.outcome).toBe("approved")
    expect(retryBody.request.status).toBe("approved")
  })

  it("keeps denial retryable when HCM silently fails the decision write", async () => {
    vi.useFakeTimers()
    patchScenarioMode("silent_no_response")

    const before = getHcmState()
    const responsePromise = decideSeededRequest({
      decision: "deny",
      reason: "Coverage gap during launch week",
    })

    await vi.advanceTimersByTimeAsync(HCM_SLOW_WRITE_RESPONSE_DELAY_MS)

    const response = await responsePromise
    const body = (await response.json()) as ApiErrorResponse

    expect(response.status).toBe(504)
    expect(body.error.code).toBe("sync_failed_retryable")
    expect(getHcmState()).toEqual(before)

    patchScenarioMode("normal")

    const retryResponse = await decideSeededRequest({
      decision: "deny",
      reason: "Coverage gap during launch week",
    })
    const retryBody = (await retryResponse.json()) as ManagerDecisionResponse

    expect(retryResponse.status).toBe(200)
    expect(retryBody.outcome).toBe("denied")
    expect(retryBody.request.statusReason).toBe("Coverage gap during launch week")
  })
})
