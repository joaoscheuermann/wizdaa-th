import { BALANCE_FRESHNESS_THRESHOLD_MS } from "@/domain/time-off/constants"
import type { BalanceFreshnessStatus } from "@/domain/time-off/types"

interface DisplayFreshnessInput {
  readonly isRefreshFailed?: boolean
  readonly isRefreshing?: boolean
  readonly lastVerifiedAt: string
  readonly nowMs?: number
}

export const getEffectiveAvailableDays = (
  availableDays: number,
  pendingDays: number
) => Number((availableDays - pendingDays).toFixed(2))

export const getBalanceAgeMs = (lastVerifiedAt: string, nowMs = Date.now()) => {
  const verifiedMs = Date.parse(lastVerifiedAt)

  if (Number.isNaN(verifiedMs)) return null

  return Math.max(0, nowMs - verifiedMs)
}

export const isBalanceStale = (
  lastVerifiedAt: string,
  nowMs = Date.now(),
  thresholdMs = BALANCE_FRESHNESS_THRESHOLD_MS
) => {
  const ageMs = getBalanceAgeMs(lastVerifiedAt, nowMs)

  if (ageMs === null) return true

  return ageMs > thresholdMs
}

export const getBalanceFreshnessStatus = (
  lastVerifiedAt: string,
  nowMs = Date.now()
): BalanceFreshnessStatus => {
  const ageMs = getBalanceAgeMs(lastVerifiedAt, nowMs)

  if (ageMs === null) return "error"

  return ageMs > BALANCE_FRESHNESS_THRESHOLD_MS ? "stale" : "fresh"
}

export const getDisplayBalanceFreshnessStatus = ({
  isRefreshFailed = false,
  isRefreshing = false,
  lastVerifiedAt,
  nowMs = Date.now(),
}: DisplayFreshnessInput): BalanceFreshnessStatus => {
  if (isRefreshFailed) return "refresh_failed"
  if (isRefreshing) return "refreshing"

  return getBalanceFreshnessStatus(lastVerifiedAt, nowMs)
}

export const formatRelativeFreshness = (
  lastVerifiedAt: string,
  nowMs = Date.now()
) => {
  const verifiedMs = Date.parse(lastVerifiedAt)

  if (Number.isNaN(verifiedMs)) return "Verification time unavailable"

  const seconds = Math.max(0, Math.round((nowMs - verifiedMs) / 1_000))

  if (seconds < 60) return `Verified ${seconds}s ago`

  return `Verified ${Math.round(seconds / 60)}m ago`
}

export const formatBalanceFreshnessStatus = (
  status: BalanceFreshnessStatus
) =>
  status
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
