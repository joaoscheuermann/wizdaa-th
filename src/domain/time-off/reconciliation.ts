import { getEffectiveAvailableDays } from "@/domain/time-off/freshness"
import type {
  BalanceBatchResponse,
  BalanceCell,
} from "@/domain/time-off/types"

type BalanceIdentity = Pick<
  BalanceCell,
  "employeeId" | "locationId" | "timeOffTypeId"
>

export interface ReconciledBalanceChange {
  readonly current: BalanceCell
  readonly previous: BalanceCell
}

export const isSameBalanceIdentity = (
  left: BalanceIdentity,
  right: BalanceIdentity
) =>
  left.employeeId === right.employeeId &&
  left.locationId === right.locationId &&
  left.timeOffTypeId === right.timeOffTypeId

export const hasBalanceReconciliationChange = (
  previous: BalanceCell,
  current: BalanceCell
) =>
  previous.version !== current.version ||
  previous.availableDays !== current.availableDays ||
  previous.pendingDays !== current.pendingDays

export const findMatchingBalance = (
  balances: readonly BalanceCell[],
  balance: BalanceIdentity
) =>
  balances.find((candidate) => isSameBalanceIdentity(candidate, balance))

export const getReconciledBalanceChanges = (
  previous: BalanceBatchResponse,
  current: BalanceBatchResponse
): readonly ReconciledBalanceChange[] =>
  current.balances.reduce<readonly ReconciledBalanceChange[]>(
    (changes, currentBalance) => {
      const previousBalance = findMatchingBalance(
        previous.balances,
        currentBalance
      )

      if (!previousBalance) return changes
      if (!hasBalanceReconciliationChange(previousBalance, currentBalance)) {
        return changes
      }

      return [
        ...changes,
        {
          current: currentBalance,
          previous: previousBalance,
        },
      ]
    },
    []
  )

const hasOptimisticPendingReservation = (
  previous: BalanceCell,
  current: BalanceCell
) =>
  previous.freshnessStatus === "refreshing" &&
  previous.pendingDays > current.pendingDays

export const mergeReconciledBalance = (
  previous: BalanceCell,
  current: BalanceCell
): BalanceCell => {
  if (!hasOptimisticPendingReservation(previous, current)) return current

  return {
    ...current,
    pendingDays: previous.pendingDays,
    effectiveAvailableDays: getEffectiveAvailableDays(
      current.availableDays,
      previous.pendingDays
    ),
    freshnessStatus: previous.freshnessStatus,
  }
}

export const reconcileBalanceBatch = (
  previous: BalanceBatchResponse | undefined,
  current: BalanceBatchResponse
): BalanceBatchResponse => {
  if (!previous) return current

  return {
    ...current,
    balances: current.balances.map((currentBalance) => {
      const previousBalance = findMatchingBalance(
        previous.balances,
        currentBalance
      )

      if (!previousBalance) return currentBalance

      return mergeReconciledBalance(previousBalance, currentBalance)
    }),
  }
}
