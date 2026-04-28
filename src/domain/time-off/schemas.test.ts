import { describe, expect, it } from "vitest"

import { validateTimeOffRequestForm } from "@/domain/time-off/schemas"

const validSubmission = {
  employeeId: "emp-avery",
  locationId: "loc-nyc",
  timeOffTypeId: "pto",
  requestedDays: 1,
  startDate: "2026-05-18",
  endDate: "2026-05-18",
}

describe("time-off request validation", () => {
  it("accepts a valid inclusive local date range and manual half-day amount", () => {
    const result = validateTimeOffRequestForm(
      {
        ...validSubmission,
        requestedDays: 1.5,
        endDate: "2026-05-19",
      },
      24
    )

    expect(result.ok).toBe(true)
    expect(result.ok ? result.value.requestedDays : null).toBe(1.5)
  })

  it("returns field-level errors for invalid request inputs", () => {
    const result = validateTimeOffRequestForm(
      {
        ...validSubmission,
        locationId: "",
        requestedDays: 0.25,
        startDate: "2026-05-20",
        endDate: "2026-05-19",
      },
      24
    )

    expect(result.ok).toBe(false)
    expect(result.ok ? null : result.fieldErrors).toMatchObject({
      locationId: "Location is required.",
      requestedDays: "Requested days must be at least 0.5.",
      endDate: "End date must be on or after the start date.",
    })
  })

  it("rejects requests above the effective available balance", () => {
    const result = validateTimeOffRequestForm(
      {
        ...validSubmission,
        requestedDays: 6.5,
      },
      6
    )

    expect(result.ok).toBe(false)
    expect(result.ok ? null : result.fieldErrors).toMatchObject({
      requestedDays: "Requested days cannot exceed 6.0 effective days.",
    })
  })
})
