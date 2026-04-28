import { DEFAULT_TIME_OFF_TYPE_ID } from "@/domain/time-off/constants"
import {
  getBalanceFreshnessStatus,
  getEffectiveAvailableDays,
} from "@/domain/time-off/freshness"
import { normalizeHcmState } from "@/domain/time-off/schemas"
import type {
  BalanceBatchResponse,
  BalanceCell,
  BalancePatchRequest,
  HcmBalanceRecord,
  HcmBalanceRecordPatch,
  HcmState,
  HcmStatePatch,
} from "@/domain/time-off/types"
import defaultState from "@/server/hcm/seed/default-state.json"

type HcmGlobalState = typeof globalThis & {
  __exampleHrHcmState?: HcmState
}

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const createSeedState = () => {
  const state = normalizeHcmState(defaultState)

  if (!state) throw new Error("Invalid default HCM seed state.")

  return state
}

const getGlobalState = () => {
  const globalState = globalThis as HcmGlobalState

  if (!globalState.__exampleHrHcmState) {
    globalState.__exampleHrHcmState = createSeedState()
  }

  return globalState
}

const getCurrentState = () => {
  const state = getGlobalState().__exampleHrHcmState

  if (!state) throw new Error("HCM state was not initialized.")

  return state
}

const setCurrentState = (state: HcmState) => {
  getGlobalState().__exampleHrHcmState = state
}

const nowIso = () => new Date().toISOString()

const findById = <T extends { readonly id: string }>(
  values: readonly T[],
  id: string
) => values.find((value) => value.id === id)

export const sameBalanceCell = (
  balance: HcmBalanceRecord,
  input: {
    readonly employeeId: string
    readonly locationId: string
    readonly timeOffTypeId?: string
  }
) =>
  balance.employeeId === input.employeeId &&
  balance.locationId === input.locationId &&
  balance.timeOffTypeId === (input.timeOffTypeId ?? DEFAULT_TIME_OFF_TYPE_ID)

export const toBalanceCell = (
  state: HcmState,
  balance: HcmBalanceRecord,
  nowMs = Date.now()
): BalanceCell => {
  const employee = findById(state.employees, balance.employeeId)
  const location = findById(state.locations, balance.locationId)
  const timeOffType = findById(state.timeOffTypes, balance.timeOffTypeId)

  return {
    ...balance,
    employeeName: employee?.name ?? "Unknown employee",
    locationName: location?.name ?? "Unknown location",
    timeOffTypeName: timeOffType?.name ?? "Time off",
    effectiveAvailableDays: getEffectiveAvailableDays(
      balance.availableDays,
      balance.pendingDays
    ),
    freshnessStatus: getBalanceFreshnessStatus(balance.lastVerifiedAt, nowMs),
  }
}

const withVerifiedBalances = (
  state: HcmState,
  predicate: (balance: HcmBalanceRecord) => boolean,
  verifiedAt: string
): HcmState => ({
  ...state,
  balances: state.balances.map((balance) =>
    predicate(balance)
      ? {
          ...balance,
          lastVerifiedAt: verifiedAt,
        }
      : balance
  ),
})

const hasBalanceDayPatch = (patch: HcmBalanceRecordPatch) =>
  patch.availableDays !== undefined || patch.pendingDays !== undefined

const mergeBalancePatch = (
  balance: HcmBalanceRecord,
  patch: HcmBalanceRecordPatch
): HcmBalanceRecord => {
  const shouldIncrementVersion =
    patch.version === undefined && hasBalanceDayPatch(patch)

  return {
    ...balance,
    ...patch,
    source: "hcm",
    timeOffTypeId: patch.timeOffTypeId ?? balance.timeOffTypeId,
    version:
      patch.version ??
      (shouldIncrementVersion ? balance.version + 1 : balance.version),
  }
}

const mergeBalancePatches = (
  balances: readonly HcmBalanceRecord[],
  patches: readonly HcmBalanceRecordPatch[] | undefined
): readonly HcmBalanceRecord[] => {
  if (!patches) return balances

  const patchedBalances = balances.map((balance) => {
    const patch = patches.find((candidate) => sameBalanceCell(balance, candidate))

    if (!patch) return balance

    return mergeBalancePatch(balance, patch)
  })
  const unmatchedPatches = patches.filter(
    (patch) =>
      !balances.some((balance) => sameBalanceCell(balance, patch))
  )
  const unmatchedBalances = unmatchedPatches.map(
    (patch): HcmBalanceRecord => ({
      employeeId: patch.employeeId,
      locationId: patch.locationId,
      timeOffTypeId: patch.timeOffTypeId ?? DEFAULT_TIME_OFF_TYPE_ID,
      availableDays: patch.availableDays ?? 0,
      pendingDays: patch.pendingDays ?? 0,
      lastVerifiedAt: patch.lastVerifiedAt ?? nowIso(),
      source: "hcm",
      version: patch.version ?? 1,
    })
  )

  return [...patchedBalances, ...unmatchedBalances]
}

export const getHcmState = () => cloneJson(getCurrentState())

export const replaceHcmState = (state: HcmState) => {
  setCurrentState(cloneJson(state))
  return getHcmState()
}

export const resetHcmState = () => {
  setCurrentState(createSeedState())
  return getHcmState()
}

export const patchHcmState = (patch: HcmStatePatch) => {
  const currentState = getCurrentState()
  const merged = {
    ...currentState,
    ...patch,
    balances: mergeBalancePatches(currentState.balances, patch.balances),
    scenario: {
      ...currentState.scenario,
      ...patch.scenario,
    },
  }
  const normalized = normalizeHcmState(merged)

  if (!normalized) return null

  setCurrentState(normalized)
  return getHcmState()
}

export const getBalanceBatch = (): BalanceBatchResponse => {
  const fetchedAt = nowIso()
  const fetchedAtMs = Date.parse(fetchedAt)

  const currentState = withVerifiedBalances(
    getCurrentState(),
    () => true,
    fetchedAt
  )

  setCurrentState(currentState)

  return {
    balances: currentState.balances.map((balance) =>
      toBalanceCell(currentState, balance, fetchedAtMs)
    ),
    fetchedAt,
  }
}

export const readBalanceCell = (input: {
  readonly employeeId: string
  readonly locationId: string
  readonly timeOffTypeId?: string
}) => {
  const fetchedAt = nowIso()
  const fetchedAtMs = Date.parse(fetchedAt)

  const currentState = withVerifiedBalances(
    getCurrentState(),
    (balance) => sameBalanceCell(balance, input),
    fetchedAt
  )

  setCurrentState(currentState)

  const balance = currentState.balances.find((candidate) =>
    sameBalanceCell(candidate, input)
  )

  if (!balance) return null

  return toBalanceCell(currentState, balance, fetchedAtMs)
}

export const writeBalanceCell = (patch: BalancePatchRequest) => {
  const updatedAt = nowIso()
  const updatedAtMs = Date.parse(updatedAt)
  const currentState = getCurrentState()
  const target = currentState.balances.find((balance) =>
    sameBalanceCell(balance, patch)
  )

  if (!target) return null

  const updatedState = {
    ...currentState,
    balances: currentState.balances.map((balance) =>
      sameBalanceCell(balance, patch)
        ? {
            ...balance,
            availableDays: patch.availableDays ?? balance.availableDays,
            pendingDays: patch.pendingDays ?? balance.pendingDays,
            lastVerifiedAt: updatedAt,
            version: balance.version + 1,
          }
        : balance
    ),
  }

  setCurrentState(updatedState)

  const updatedBalance = updatedState.balances.find((balance) =>
    sameBalanceCell(balance, patch)
  )

  if (!updatedBalance) return null

  return toBalanceCell(updatedState, updatedBalance, updatedAtMs)
}
