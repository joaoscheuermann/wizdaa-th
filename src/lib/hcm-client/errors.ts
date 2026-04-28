import type { RequestFormFieldErrors } from "@/domain/time-off/types"

export class HcmClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "hcm_error",
    readonly fieldErrors?: RequestFormFieldErrors
  ) {
    super(message)
    this.name = "HcmClientError"
  }
}

const retryableHcmErrorCodes = new Set([
  "sync_failed_retryable",
  "write_timeout",
])

export const isRetryableHcmError = (error: unknown) =>
  error instanceof HcmClientError && retryableHcmErrorCodes.has(error.code)
