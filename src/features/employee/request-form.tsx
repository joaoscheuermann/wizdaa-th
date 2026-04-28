"use client"

import type { QueryClient } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, RefreshCcw, Send } from "lucide-react"
import type { ChangeEvent, FormEvent, ReactNode } from "react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DEFAULT_TIME_OFF_TYPE_ID } from "@/domain/time-off/constants"
import { validateTimeOffRequestForm } from "@/domain/time-off/schemas"
import type {
  BalanceCell,
  RequestFormFieldErrors,
  TimeOffRequestSubmissionResponse,
} from "@/domain/time-off/types"
import {
  HcmClientError,
  isRetryableHcmError,
} from "@/lib/hcm-client/errors"
import {
  refetchBalanceCell,
  useBalanceBatchQuery,
} from "@/lib/queries/balance-queries"
import { useSubmitTimeOffRequestMutation } from "@/lib/queries/request-mutations"

const DAY_IN_MS = 24 * 60 * 60 * 1000
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

interface RequestFormProps {
  readonly onSubmitSuccess?: (response: TimeOffRequestSubmissionResponse) => void
  readonly selectedEmployeeId: string
  readonly surface?: "card" | "plain"
}

interface FormState {
  readonly locationId: string
  readonly startDate: string
  readonly endDate: string
  readonly note: string
}

const initialFormState: FormState = {
  locationId: "",
  startDate: "2026-05-18",
  endDate: "2026-05-18",
  note: "",
}

const formatDays = (days: number) => `${days.toFixed(1)} days`

const fieldError = (
  fieldErrors: RequestFormFieldErrors,
  field: keyof RequestFormFieldErrors
) => fieldErrors[field]

const parseLocalDateToUtcMs = (value: string) => {
  const match = LOCAL_DATE_PATTERN.exec(value)

  if (!match) return null

  const [, year, month, day] = match
  const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day))
  const parsed = new Date(utcMs)

  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null
  }

  return utcMs
}

const calculateRequestedDays = (startDate: string, endDate: string) => {
  const startUtcMs = parseLocalDateToUtcMs(startDate)
  const endUtcMs = parseLocalDateToUtcMs(endDate)

  if (startUtcMs === null || endUtcMs === null || endUtcMs < startUtcMs) {
    return null
  }

  return Math.floor((endUtcMs - startUtcMs) / DAY_IN_MS) + 1
}

const getRefreshErrorMessage = (error: unknown) => {
  if (error instanceof HcmClientError) return error.message
  if (error instanceof Error) return error.message

  return "Unable to refresh the selected balance before submitting."
}

const getSubmissionSuccessMessage = (
  locationName: string,
  status: string,
  statusReason: string | undefined
) => {
  if (status === "conflict_needs_review") {
    return statusReason ?? "HCM reported a conflict. Manager review is required."
  }

  return `${locationName} request is pending manager review.`
}

const refreshSelectedBalance = async (
  queryClient: QueryClient,
  selectedBalance: BalanceCell | undefined,
  setIsRefreshingSelectedBalance: (isRefreshing: boolean) => void,
  setStatusMessage: (message: string | null) => void
) => {
  if (!selectedBalance) return selectedBalance

  setIsRefreshingSelectedBalance(true)

  try {
    return await refetchBalanceCell(queryClient, selectedBalance)
  } catch (error) {
    setStatusMessage(getRefreshErrorMessage(error))
    return null
  } finally {
    setIsRefreshingSelectedBalance(false)
  }
}

export function RequestForm({
  onSubmitSuccess,
  selectedEmployeeId,
  surface = "card",
}: RequestFormProps) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useBalanceBatchQuery()
  const submitRequest = useSubmitTimeOffRequestMutation()
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [fieldErrors, setFieldErrors] = useState<RequestFormFieldErrors>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isRetryableFailure, setIsRetryableFailure] = useState(false)
  const [isRefreshingSelectedBalance, setIsRefreshingSelectedBalance] =
    useState(false)
  const employeeBalances = useMemo(
    () =>
      (data?.balances ?? []).filter(
        (balance) => balance.employeeId === selectedEmployeeId
      ),
    [data?.balances, selectedEmployeeId]
  )
  const selectedBalance = employeeBalances.find(
    (balance) => balance.locationId === formState.locationId
  ) ?? employeeBalances[0]
  const activeLocationId = selectedBalance?.locationId ?? formState.locationId
  const requestedDays = calculateRequestedDays(
    formState.startDate,
    formState.endDate
  )
  const requestedDaysInputValue =
    requestedDays === null ? "" : String(requestedDays)

  const updateField =
    (field: keyof FormState) =>
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | ChangeEvent<HTMLSelectElement>
        | ChangeEvent<HTMLTextAreaElement>
    ) => {
      setFormState((current) => ({
        ...current,
        [field]: event.target.value,
      }))
      setFieldErrors((current) => ({
        ...current,
        [field]: undefined,
        requestedDays:
          field === "startDate" || field === "endDate"
            ? undefined
            : current.requestedDays,
      }))
      setStatusMessage(null)
      setIsRetryableFailure(false)
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsRetryableFailure(false)

    const draft = {
      employeeId: selectedEmployeeId,
      locationId: activeLocationId,
      timeOffTypeId: selectedBalance?.timeOffTypeId ?? DEFAULT_TIME_OFF_TYPE_ID,
      requestedDays: requestedDays ?? 1,
      startDate: formState.startDate,
      endDate: formState.endDate,
      note: formState.note,
    }
    const preliminary = validateTimeOffRequestForm(draft)

    if (!preliminary.ok) {
      setFieldErrors(preliminary.fieldErrors ?? {})
      setStatusMessage(preliminary.message)
      return
    }

    const balanceForValidation = await refreshSelectedBalance(
      queryClient,
      selectedBalance,
      setIsRefreshingSelectedBalance,
      setStatusMessage
    )

    if (selectedBalance && !balanceForValidation) return

    const verifiedSubmission = {
      ...preliminary.value,
      timeOffTypeId:
        balanceForValidation?.timeOffTypeId ?? preliminary.value.timeOffTypeId,
    }
    const verified = validateTimeOffRequestForm(
      verifiedSubmission,
      balanceForValidation?.effectiveAvailableDays ?? 0
    )

    if (!verified.ok) {
      setFieldErrors(verified.fieldErrors ?? {})
      setStatusMessage(verified.message)
      return
    }

    try {
      const response = await submitRequest.mutateAsync(verified.value)

      setFieldErrors({})
      setStatusMessage(
        getSubmissionSuccessMessage(
          response.request.locationName,
          response.request.status,
          response.request.statusReason
        )
      )
      setFormState((current) => ({
        ...current,
        note: "",
      }))
      onSubmitSuccess?.(response)
    } catch (error) {
      const hcmError = error instanceof HcmClientError ? error : null
      const isRetryable = isRetryableHcmError(error)

      setFieldErrors(hcmError?.fieldErrors ?? {})
      setStatusMessage(
        hcmError?.message ?? "HCM rejected the request. Try again."
      )
      setIsRetryableFailure(isRetryable)
    }
  }

  const canSubmit =
    !isLoading &&
    employeeBalances.length > 0 &&
    !isRefreshingSelectedBalance &&
    !submitRequest.isPending

  const form = (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <FormField
        error={fieldError(fieldErrors, "locationId")}
        htmlFor="request-location"
        label="Location"
      >
        <select
          id="request-location"
          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
          value={activeLocationId}
          onChange={updateField("locationId")}
          aria-invalid={Boolean(fieldErrors.locationId)}
          disabled={employeeBalances.length === 0}
        >
          {employeeBalances.length === 0 ? (
            <option value="">No locations</option>
          ) : null}
          {employeeBalances.map((balance) => (
            <option key={balance.locationId} value={balance.locationId}>
              {balance.locationName} -{" "}
              {formatDays(balance.effectiveAvailableDays)} effective
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          error={fieldError(fieldErrors, "startDate")}
          htmlFor="request-start-date"
          label="Start date"
        >
          <input
            id="request-start-date"
            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            type="date"
            value={formState.startDate}
            onChange={updateField("startDate")}
            aria-invalid={Boolean(fieldErrors.startDate)}
            required
          />
        </FormField>

        <FormField
          error={fieldError(fieldErrors, "endDate")}
          htmlFor="request-end-date"
          label="End date"
        >
          <input
            id="request-end-date"
            className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            type="date"
            value={formState.endDate}
            onChange={updateField("endDate")}
            aria-invalid={Boolean(fieldErrors.endDate)}
            required
          />
        </FormField>
      </div>

      <FormField
        error={fieldError(fieldErrors, "requestedDays")}
        htmlFor="request-days"
        label="Requested days"
      >
        <output
          id="request-days"
          className="flex h-9 w-full items-center rounded-lg border border-input bg-muted/40 px-3 text-sm text-foreground"
        >
          {requestedDaysInputValue}
        </output>
      </FormField>

      <FormField
        error={fieldError(fieldErrors, "note")}
        htmlFor="request-note"
        label="Note"
      >
        <textarea
          id="request-note"
          className="min-h-20 w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
          value={formState.note}
          onChange={updateField("note")}
          aria-invalid={Boolean(fieldErrors.note)}
        />
      </FormField>

      {statusMessage ? (
        <div
          role={submitRequest.isError || isRetryableFailure ? "alert" : "status"}
          className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
        >
          {submitRequest.isError || isRetryableFailure ? (
            <AlertCircle className="mt-0.5 size-4 text-red-700" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 text-primary" />
          )}
          <span>{statusMessage}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {isRetryableFailure ? (
          <RefreshCcw data-icon="inline-start" />
        ) : (
          <Send data-icon="inline-start" />
        )}
        {isRetryableFailure ? "Retry request" : "Submit request"}
      </Button>
    </form>
  )

  if (surface === "plain") return form

  return (
    <Card className="rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2>Request PTO</h2>
          </CardTitle>
          <CardDescription>
            Submit dates and a calculated day total.
          </CardDescription>
        </div>
        <CardAction>
          <Badge
            variant={
              submitRequest.isPending || isRefreshingSelectedBalance
                ? "outline"
                : "secondary"
            }
          >
            {isRefreshingSelectedBalance
              ? "Refreshing"
              : submitRequest.isPending
                ? "Submitting"
                : "Ready"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  )
}

function FormField({
  children,
  error,
  htmlFor,
  label,
}: Readonly<{
  children: ReactNode
  error?: string
  htmlFor: string
  label: string
}>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  )
}
