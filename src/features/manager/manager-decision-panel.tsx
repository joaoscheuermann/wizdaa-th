"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import type { ChangeEvent } from "react"
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
import { getRequestStatusLabel } from "@/domain/time-off/lifecycle"
import { hasBalanceReconciliationChange } from "@/domain/time-off/reconciliation"
import type {
  BalanceCell,
  ManagerDecisionRequest,
  ManagerDecisionResponse,
  TimeOffRequest,
} from "@/domain/time-off/types"
import {
  HcmClientError,
  isRetryableHcmError,
} from "@/lib/hcm-client/errors"
import {
  refetchBalanceCell,
  useBalanceCellQuery,
} from "@/lib/queries/balance-queries"
import {
  useManagerDecisionMutation,
  usePendingRequestsQuery,
} from "@/lib/queries/request-mutations"

interface ManagerDecisionPanelProps {
  readonly selectedRequestId: string | null
  readonly variant?: "card" | "modal"
}

type DecisionNoticeTone = "success" | "warning" | "error"

type RetryableDecisionInput = ManagerDecisionRequest & {
  readonly requestId: string
}

const formatDays = (days: number) => `${days.toFixed(1)} days`

const formatDateRange = (request: TimeOffRequest) =>
  request.startDate === request.endDate
    ? request.startDate
    : `${request.startDate} to ${request.endDate}`

const hasSufficientDecisionBalance = (
  balance: BalanceCell,
  request: TimeOffRequest
) =>
  balance.availableDays >= request.requestedDays &&
  balance.pendingDays >= request.requestedDays

export function ManagerDecisionPanel({
  selectedRequestId,
  variant = "card",
}: ManagerDecisionPanelProps) {
  const queryClient = useQueryClient()
  const pendingRequests = usePendingRequestsQuery()
  const decisionMutation = useManagerDecisionMutation()
  const [denialReason, setDenialReason] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<DecisionNoticeTone>("success")
  const [retryDecision, setRetryDecision] =
    useState<RetryableDecisionInput | null>(null)
  const [reconfirmation, setReconfirmation] =
    useState<ManagerDecisionResponse | null>(null)
  const [isRefreshingDecisionBalance, setIsRefreshingDecisionBalance] =
    useState(false)
  const requests = useMemo(
    () => pendingRequests.data?.requests ?? [],
    [pendingRequests.data?.requests]
  )
  const request = useMemo(() => {
    if (!selectedRequestId) return null

    return (
      requests.find((candidate) => candidate.requestId === selectedRequestId) ??
      null
    )
  }, [requests, selectedRequestId])
  const balanceQuery = useBalanceCellQuery(
    request?.employeeId ?? "",
    request?.locationId ?? "",
    request?.timeOffTypeId ?? DEFAULT_TIME_OFF_TYPE_ID
  )
  const decisionBalance = reconfirmation?.balance ?? balanceQuery.data?.balance
  const requiresReconfirmation =
    reconfirmation !== null || request?.status === "conflict_needs_review"

  const updateDenialReason = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDenialReason(event.target.value)
    setStatusMessage(null)
    setRetryDecision(null)
  }

  const setDecisionNotice = (
    message: string | null,
    tone: DecisionNoticeTone
  ) => {
    setStatusMessage(message)
    setStatusTone(tone)
  }

  const handleDecisionResponse = (response: ManagerDecisionResponse) => {
    setRetryDecision(null)

    if (response.outcome === "reconfirmation_required") {
      setReconfirmation(response)
      setDecisionNotice(response.reconfirmation?.message ?? null, "warning")
      return
    }

    if (response.outcome === "conflict_needs_review") {
      setReconfirmation(null)
      setDecisionNotice(
        response.request.statusReason ??
          "HCM reported a conflict. Manager re-review is required.",
        "warning"
      )
      return
    }

    setReconfirmation(null)

    if (response.outcome === "denied") {
      setDenialReason("")
      setDecisionNotice(`${response.request.locationName} request denied.`, "success")
      return
    }

    setDecisionNotice(`${response.request.locationName} request approved.`, "success")
  }

  const handleDecisionError = (
    error: unknown,
    decisionInput: RetryableDecisionInput
  ) => {
    setDecisionNotice(getDecisionErrorMessage(error), "error")
    setRetryDecision(isRetryableHcmError(error) ? decisionInput : null)
  }

  const saveDecision = async (decisionInput: RetryableDecisionInput) => {
    try {
      const response = await decisionMutation.mutateAsync(decisionInput)

      handleDecisionResponse(response)
    } catch (error) {
      handleDecisionError(error, decisionInput)
    }
  }

  const handleApprove = async () => {
    if (!request || !decisionBalance) return

    setRetryDecision(null)

    try {
      setIsRefreshingDecisionBalance(true)
      const freshBalance = await refetchBalanceCell(queryClient, request)

      if (
        hasBalanceReconciliationChange(decisionBalance, freshBalance) &&
        hasSufficientDecisionBalance(freshBalance, request)
      ) {
        const response = createReconfirmationResponse(
          request,
          decisionBalance,
          freshBalance
        )

        setReconfirmation(response)
        setDecisionNotice(response.reconfirmation?.message ?? null, "warning")
        return
      }

      await saveDecision({
        requestId: request.requestId,
        decision: "approve",
        expectedBalanceVersion: freshBalance.version,
      })
    } catch (error) {
      setDecisionNotice(getDecisionErrorMessage(error), "error")
    } finally {
      setIsRefreshingDecisionBalance(false)
    }
  }

  const handleDeny = async () => {
    if (!request) return

    setRetryDecision(null)

    const reason = denialReason.trim()

    if (reason.length === 0) {
      setDecisionNotice("Enter a denial reason.", "error")
      return
    }

    await saveDecision({
      requestId: request.requestId,
      decision: "deny",
      reason,
    })
  }

  const decisionPanelContent = (
    <>
      {!request ? (
        <div className="space-y-3">
          <EmptyDecisionState />
          <DecisionNotice message={statusMessage} tone={statusTone} />
        </div>
      ) : null}
      {request ? (
        <div className="space-y-4">
          <RequestSummary request={request} />
          <BalanceContext
            balance={decisionBalance}
            isLoading={balanceQuery.isLoading || isRefreshingDecisionBalance}
            request={request}
            response={reconfirmation}
          />

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="manager-denial-reason"
            >
              Denial reason
            </label>
            <textarea
              id="manager-denial-reason"
              className="min-h-20 w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
              value={denialReason}
              onChange={updateDenialReason}
            />
          </div>

          <DecisionNotice message={statusMessage} tone={statusTone} />

          {retryDecision ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveDecision(retryDecision)}
              disabled={decisionMutation.isPending}
            >
              <RefreshCcw data-icon="inline-start" />
              Retry decision
            </Button>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={
                decisionMutation.isPending ||
                balanceQuery.isLoading ||
                isRefreshingDecisionBalance ||
                !decisionBalance
              }
            >
              <ShieldCheck data-icon="inline-start" />
              {requiresReconfirmation ? "Confirm approval" : "Approve"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeny}
              disabled={decisionMutation.isPending}
            >
              <XCircle data-icon="inline-start" />
              Deny
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )

  if (variant === "modal") return decisionPanelContent

  return (
    <Card className="rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2>Decision panel</h2>
          </CardTitle>
          <CardDescription>
            Fresh HCM balance verification before final approval.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant={requiresReconfirmation ? "outline" : "secondary"}>
            {requiresReconfirmation ? "Reconfirm" : "Ready"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>{decisionPanelContent}</CardContent>
    </Card>
  )
}

function DecisionNotice({
  message,
  tone,
}: Readonly<{
  message: string | null
  tone: DecisionNoticeTone
}>) {
  if (!message) return null

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
    >
      {tone === "warning" ? (
        <AlertCircle className="mt-0.5 size-4 text-warning-foreground" />
      ) : tone === "error" ? (
        <AlertCircle className="mt-0.5 size-4 text-red-700" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 text-primary" />
      )}
      <span>{message}</span>
    </div>
  )
}

function getDecisionErrorMessage(error: unknown) {
  if (error instanceof HcmClientError) return error.message
  if (error instanceof Error) return error.message

  return "The manager decision could not be saved."
}

function createReconfirmationResponse(
  request: TimeOffRequest,
  previousBalance: BalanceCell,
  currentBalance: BalanceCell
): ManagerDecisionResponse {
  return {
    outcome: "reconfirmation_required",
    request,
    balance: currentBalance,
    reconfirmation: {
      previousBalanceVersion: previousBalance.version,
      currentBalanceVersion: currentBalance.version,
      message:
        "The HCM balance changed but can still cover this request. Confirm approval again to continue.",
    },
  }
}

function RequestSummary({
  request,
}: Readonly<{
  request: TimeOffRequest
}>) {
  return (
    <article className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">
            {request.employeeName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {request.locationName} - {formatDateRange(request)}
          </p>
        </div>
        <Badge variant="outline">{getRequestStatusLabel(request.status)}</Badge>
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <DecisionMetric label="Requested" value={formatDays(request.requestedDays)} />
        <DecisionMetric label="Submitted" value={request.createdAt.slice(0, 10)} />
      </dl>
      {request.note ? (
        <p className="mt-3 text-sm text-muted-foreground">{request.note}</p>
      ) : null}
    </article>
  )
}

function BalanceContext({
  balance,
  isLoading,
  request,
  response,
}: Readonly<{
  balance: ManagerDecisionResponse["balance"] | undefined
  isLoading: boolean
  request: TimeOffRequest
  response: ManagerDecisionResponse | null
}>) {
  if (isLoading && !balance) {
    return (
      <div className="min-h-24 rounded-lg border border-border bg-muted/40 p-3">
        <div className="h-4 w-36 rounded bg-muted" />
        <div className="mt-3 h-3 w-48 rounded bg-secondary" />
      </div>
    )
  }

  if (!balance) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        Balance context is loading.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">HCM balance</h3>
          <p className="text-sm text-muted-foreground">
            {request.locationName} - version {balance.version}
          </p>
        </div>
        {response?.reconfirmation ? (
          <Badge variant="outline">
            v{response.reconfirmation.previousBalanceVersion} to v
            {response.reconfirmation.currentBalanceVersion}
          </Badge>
        ) : null}
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <DecisionMetric label="Available" value={formatDays(balance.availableDays)} />
        <DecisionMetric label="Pending" value={formatDays(balance.pendingDays)} />
        <DecisionMetric
          label="Effective"
          value={formatDays(balance.effectiveAvailableDays)}
        />
      </dl>
    </div>
  )
}

function DecisionMetric({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function EmptyDecisionState() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
      Select a pending request.
    </div>
  )
}
