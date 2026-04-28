import { HCM_WRITE_TIMEOUT_MS } from "@/domain/time-off/constants"
import type { HcmScenarioMode } from "@/domain/time-off/types"

export type HcmReadOperation = "balance_batch" | "balance_cell" | "requests"

export type HcmWriteOperation =
  | "balance_write"
  | "submit"
  | "approve"
  | "deny"

export const HCM_SLOW_READ_DELAY_MS = 750

export const HCM_SLOW_WRITE_RESPONSE_DELAY_MS = HCM_WRITE_TIMEOUT_MS + 250

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })

export const shouldDelayHcmRead = (mode: HcmScenarioMode) =>
  mode === "slow_read"

export const shouldDelayHcmWrite = (mode: HcmScenarioMode) =>
  mode === "slow_write" || mode === "silent_no_response"

export const isSilentNoResponseScenario = (mode: HcmScenarioMode) =>
  mode === "silent_no_response"

export const isInvalidDimensionScenario = (mode: HcmScenarioMode) =>
  mode === "invalid_dimension"

export const isInsufficientBalanceScenario = (mode: HcmScenarioMode) =>
  mode === "insufficient_balance"

export const isSilentWrongSuccessScenario = (mode: HcmScenarioMode) =>
  mode === "silent_wrong_success"

export const isSubmitConflictScenario = (mode: HcmScenarioMode) =>
  mode === "conflict_on_submit"

export const isApprovalConflictScenario = (mode: HcmScenarioMode) =>
  mode === "conflict_on_approval"

export const applyHcmReadScenario = async (
  mode: HcmScenarioMode,
  _operation: HcmReadOperation
) => {
  if (!shouldDelayHcmRead(mode)) return

  await delay(HCM_SLOW_READ_DELAY_MS)
}

export const applyHcmWriteScenario = async (
  mode: HcmScenarioMode,
  _operation: HcmWriteOperation
) => {
  if (!shouldDelayHcmWrite(mode)) return

  await delay(HCM_SLOW_WRITE_RESPONSE_DELAY_MS)
}
