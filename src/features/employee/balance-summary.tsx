"use client"

import { useIsMutating } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { BalanceFreshnessIndicator } from "@/components/common/balance-freshness-indicator"
import { ReconciliationBanner } from "@/components/common/reconciliation-banner"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  LOW_BALANCE_THRESHOLD_DAYS,
} from "@/domain/time-off/constants"
import { getDisplayBalanceFreshnessStatus } from "@/domain/time-off/freshness"
import {
  getReconciledBalanceChanges,
  type ReconciledBalanceChange,
} from "@/domain/time-off/reconciliation"
import type {
  BalanceBatchResponse,
  BalanceCell,
  BalanceFreshnessStatus,
} from "@/domain/time-off/types"
import { useBalanceBatchQuery } from "@/lib/queries/balance-queries"

interface BalanceSummaryProps {
  readonly employeeId: string
}

interface ReconciliationNotice {
  readonly message: string
  readonly tone: "success" | "warning"
}

interface ScopedReconciliationNotice extends ReconciliationNotice {
  readonly employeeId: string
}

const formatDays = (days: number) => `${days.toFixed(1)} days`

const formatBalanceChangeMessage = (
  changes: readonly ReconciledBalanceChange[],
  hasActionInFlight: boolean
): ReconciliationNotice => {
  if (hasActionInFlight) {
    return {
      message:
        "Balance changed while a request action is pending. The pending action remains visible.",
      tone: "warning",
    }
  }

  if (changes.length === 1) {
    const change = changes[0]

    return {
      message: `Refreshed balance: ${change.current.locationName} now shows ${formatDays(
        change.current.availableDays
      )} available and ${formatDays(change.current.pendingDays)} pending.`,
      tone: "success",
    }
  }

  return {
    message: `Refreshed ${changes.length} balances from HCM.`,
    tone: "success",
  }
}

const useFreshnessClock = () => {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1_000)

    return () => window.clearInterval(intervalId)
  }, [])

  return nowMs
}

export function BalanceSummary({ employeeId }: BalanceSummaryProps) {
  const routeEmployeeId = employeeId.trim()
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    isRefetchError,
  } =
    useBalanceBatchQuery()
  const nowMs = useFreshnessClock()
  const activeMutations = useIsMutating()
  const previousBatchRef = useRef<BalanceBatchResponse | null>(null)
  const [notice, setNotice] = useState<ScopedReconciliationNotice | null>(null)
  const routeBalances = useMemo(
    () =>
      (data?.balances ?? []).filter(
        (balance) => balance.employeeId === routeEmployeeId
      ),
    [data?.balances, routeEmployeeId]
  )
  const refreshFailed = Boolean(data && isRefetchError)
  const visibleNotice =
    notice?.employeeId === routeEmployeeId ? notice : null

  useEffect(() => {
    if (!data) return

    const previousBatch = previousBatchRef.current
    previousBatchRef.current = data

    if (!previousBatch) return

    const changes = getReconciledBalanceChanges(previousBatch, data).filter(
      (change) => change.current.employeeId === routeEmployeeId
    )

    if (changes.length === 0) return

    setNotice({
      ...formatBalanceChangeMessage(changes, activeMutations > 0),
      employeeId: routeEmployeeId,
    })
  }, [activeMutations, data, routeEmployeeId])

  if (isLoading) {
    return (
      <BalanceCardShell
        description="Hydrating the batch corpus from mock HCM."
        action={<Badge variant="outline">Loading</Badge>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {["location", "available", "effective"].map((label) => (
            <div
              key={label}
              className="min-h-24 rounded-lg border border-border bg-muted/40 p-3"
            >
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="mt-4 h-6 w-28 rounded bg-secondary" />
            </div>
          ))}
        </div>
      </BalanceCardShell>
    )
  }

  if (isError && !data) {
    return (
      <BalanceCardShell
        description="The HCM batch endpoint did not return balances."
        action={<Badge variant="destructive">Error</Badge>}
      >
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          Unable to load balances
          {error instanceof Error ? `: ${error.message}` : "."}
        </div>
      </BalanceCardShell>
    )
  }

  if (!data || data.balances.length === 0) {
    return (
      <BalanceCardShell
        description="No balance rows were returned by HCM."
        action={<Badge variant="outline">Empty</Badge>}
      >
        <EmptyBalanceState />
      </BalanceCardShell>
    )
  }

  if (routeBalances.length === 0) {
    return (
      <BalanceCardShell
        description="No balance rows were returned for the active route employee."
        action={<Badge variant="outline">Empty</Badge>}
      >
        <EmptyBalanceState />
      </BalanceCardShell>
    )
  }

  return (
    <BalanceCardShell
      description="Per-location Paid Time Off balances from mock HCM."
      action={
        <Badge
          variant={
            refreshFailed ? "destructive" : isFetching ? "outline" : "secondary"
          }
        >
          {refreshFailed
            ? "Refresh failed"
            : isFetching
              ? "Refreshing"
              : "Batch hydrated"}
        </Badge>
      }
    >
      <div className="space-y-4">
        {refreshFailed ? (
          <ReconciliationBanner
            message="Balance refresh failed. Last known values remain visible until HCM responds."
            tone="warning"
          />
        ) : null}
        {!refreshFailed && visibleNotice ? (
          <ReconciliationBanner
            message={visibleNotice.message}
            tone={visibleNotice.tone}
          />
        ) : null}

        <div className="grid gap-3">
          {routeBalances.map((balance) => (
            <BalanceLocationRow
              key={`${balance.employeeId}-${balance.locationId}-${balance.timeOffTypeId}`}
              balance={balance}
              isRefreshFailed={refreshFailed}
              isRefreshing={isFetching}
              nowMs={nowMs}
            />
          ))}
        </div>
      </div>
    </BalanceCardShell>
  )
}

function BalanceCardShell({
  action,
  children,
  description,
}: Readonly<{
  action: ReactNode
  children: ReactNode
  description: string
}>) {
  return (
    <Card className="rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2 id="employee-workspace-heading">Employee balances</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction>{action}</CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function BalanceLocationRow({
  balance,
  isRefreshFailed,
  isRefreshing,
  nowMs,
}: Readonly<{
  balance: BalanceCell
  isRefreshFailed: boolean
  isRefreshing: boolean
  nowMs: number
}>) {
  const isLowBalance =
    balance.effectiveAvailableDays <= LOW_BALANCE_THRESHOLD_DAYS
  const headingId = `${balance.employeeId}-${balance.locationId}-balance-heading`
  const freshnessStatus = getDisplayBalanceFreshnessStatus({
    isRefreshFailed,
    isRefreshing,
    lastVerifiedAt: balance.lastVerifiedAt,
    nowMs,
  })

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-lg border border-border bg-muted/40 p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id={headingId} className="text-base font-semibold text-foreground">
            {balance.locationName}
          </h3>
          <p className="text-sm text-muted-foreground">{balance.timeOffTypeName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLowBalance ? (
            <Badge variant="destructive">Low balance</Badge>
          ) : null}
          <BalanceFreshnessIndicator
            lastVerifiedAt={balance.lastVerifiedAt}
            nowMs={nowMs}
            source={balance.source}
            status={freshnessStatus}
          />
        </div>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <BalanceMetric label="Available" value={formatDays(balance.availableDays)} />
        <BalanceMetric label="Pending" value={formatDays(balance.pendingDays)} />
        <BalanceMetric
          label="Effective"
          value={formatDays(balance.effectiveAvailableDays)}
        />
      </dl>
    </article>
  )
}

function BalanceMetric({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function EmptyBalanceState() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
      No balances found.
    </div>
  )
}
