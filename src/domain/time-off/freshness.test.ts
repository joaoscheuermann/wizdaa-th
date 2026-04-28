import { describe, expect, it } from "vitest"

import { BALANCE_FRESHNESS_THRESHOLD_MS } from "@/domain/time-off/constants"
import {
  getBalanceFreshnessStatus,
  getDisplayBalanceFreshnessStatus,
  isBalanceStale,
} from "@/domain/time-off/freshness"

describe("balance freshness", () => {
  const verifiedAt = "2026-04-28T12:00:00.000Z"
  const verifiedMs = Date.parse(verifiedAt)

  it("keeps balances fresh through the 30 second threshold", () => {
    expect(
      getBalanceFreshnessStatus(
        verifiedAt,
        verifiedMs + BALANCE_FRESHNESS_THRESHOLD_MS
      )
    ).toBe("fresh")
    expect(
      isBalanceStale(verifiedAt, verifiedMs + BALANCE_FRESHNESS_THRESHOLD_MS)
    ).toBe(false)
  })

  it("marks balances stale after the threshold is exceeded", () => {
    expect(
      getBalanceFreshnessStatus(
        verifiedAt,
        verifiedMs + BALANCE_FRESHNESS_THRESHOLD_MS + 1
      )
    ).toBe("stale")
    expect(
      isBalanceStale(
        verifiedAt,
        verifiedMs + BALANCE_FRESHNESS_THRESHOLD_MS + 1
      )
    ).toBe(true)
  })

  it("prioritizes active refresh and refresh-failed display states", () => {
    expect(
      getDisplayBalanceFreshnessStatus({
        isRefreshing: true,
        lastVerifiedAt: verifiedAt,
        nowMs: verifiedMs,
      })
    ).toBe("refreshing")
    expect(
      getDisplayBalanceFreshnessStatus({
        isRefreshFailed: true,
        isRefreshing: true,
        lastVerifiedAt: verifiedAt,
        nowMs: verifiedMs,
      })
    ).toBe("refresh_failed")
  })
})
