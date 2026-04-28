"use client"

import { useIsMutating } from "@tanstack/react-query"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { ReconciliationBanner } from "@/components/common/reconciliation-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LOW_BALANCE_THRESHOLD_DAYS } from "@/domain/time-off/constants"
import {
  formatBalanceFreshnessStatus,
  formatRelativeFreshness,
  getDisplayBalanceFreshnessStatus,
} from "@/domain/time-off/freshness"
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

const freshnessStatusIcon: Record<BalanceFreshnessStatus, LucideIcon> = {
  loading: Clock3,
  fresh: CheckCircle2,
  refreshing: RefreshCw,
  stale: Clock3,
  refresh_failed: AlertCircle,
  conflict: AlertCircle,
  error: AlertCircle,
}

const freshnessStatusVariant = (status: BalanceFreshnessStatus) => {
  if (status === "refresh_failed" || status === "error") return "destructive"
  if (status === "stale" || status === "refreshing") return "outline"

  return "secondary"
}

const getOldestVerifiedBalance = (balances: readonly BalanceCell[]) =>
  balances.reduce<BalanceCell | undefined>((oldest, balance) => {
    if (!oldest) return balance

    const oldestMs = Date.parse(oldest.lastVerifiedAt)
    const candidateMs = Date.parse(balance.lastVerifiedAt)

    if (Number.isNaN(candidateMs)) return balance
    if (Number.isNaN(oldestMs)) return oldest

    return candidateMs < oldestMs ? balance : oldest
  }, undefined)

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
    refetch,
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
  const refreshBalances = () => {
    void refetch()
  }

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
        action={
          <BalanceFreshnessControl
            canRefresh={!isFetching}
            onRefresh={refreshBalances}
            status="loading"
          />
        }
        verification="Verification pending"
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
        action={
          <BalanceFreshnessControl
            canRefresh={!isFetching}
            onRefresh={refreshBalances}
            status="error"
          />
        }
        verification="Verification unavailable"
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
        action={
          <BalanceFreshnessControl
            canRefresh={!isFetching}
            onRefresh={refreshBalances}
            status="error"
          />
        }
        verification="Verification unavailable"
      >
        <EmptyBalanceState />
      </BalanceCardShell>
    )
  }

  if (routeBalances.length === 0) {
    return (
      <BalanceCardShell
        description="No balance rows were returned for the active route employee."
        action={
          <BalanceFreshnessControl
            canRefresh={!isFetching}
            onRefresh={refreshBalances}
            status="error"
          />
        }
        verification="Verification unavailable"
      >
        <EmptyBalanceState />
      </BalanceCardShell>
    )
  }

  const oldestVerifiedBalance = getOldestVerifiedBalance(routeBalances)

  if (!oldestVerifiedBalance) return null

  const freshnessStatus = getDisplayBalanceFreshnessStatus({
    isRefreshFailed: refreshFailed,
    isRefreshing: isFetching,
    lastVerifiedAt: oldestVerifiedBalance.lastVerifiedAt,
    nowMs,
  })
  const verification = `${formatRelativeFreshness(
    oldestVerifiedBalance.lastVerifiedAt,
    nowMs
  )} from ${oldestVerifiedBalance.source}`

  return (
    <BalanceCardShell
      description="Per-location Paid Time Off balances from mock HCM."
      action={
        <BalanceFreshnessControl
          canRefresh={!isFetching}
          onRefresh={refreshBalances}
          status={freshnessStatus}
        />
      }
      verification={verification}
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

        <Table aria-label="Employee balances">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48">Location</TableHead>
              <TableHead className="min-w-32 text-right">Available</TableHead>
              <TableHead className="min-w-32 text-right">Pending</TableHead>
              <TableHead className="min-w-32 text-right">Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routeBalances.map((balance) => (
              <BalanceLocationRow
                key={`${balance.employeeId}-${balance.locationId}-${balance.timeOffTypeId}`}
                balance={balance}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </BalanceCardShell>
  )
}

function BalanceCardShell({
  action,
  children,
  description,
  verification,
}: Readonly<{
  action: ReactNode
  children: ReactNode
  description: string
  verification: string
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
      <CardFooter className="justify-end bg-card text-[lab(38.8709_-8.38673_3.32724)]">
        <p className="text-xs">{verification}</p>
      </CardFooter>
    </Card>
  )
}

function BalanceFreshnessControl({
  canRefresh,
  onRefresh,
  status,
}: Readonly<{
  canRefresh: boolean
  onRefresh: () => void
  status: BalanceFreshnessStatus
}>) {
  const Icon = freshnessStatusIcon[status]
  const label = formatBalanceFreshnessStatus(status)

  return (
    <div className="flex items-center gap-2">
      <Badge variant={freshnessStatusVariant(status)} className="capitalize">
        <Icon data-icon="inline-start" />
        {label}
      </Badge>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Refresh balances"
        title="Refresh balances"
        onClick={onRefresh}
        disabled={!canRefresh}
      >
        <RefreshCw aria-hidden="true" />
      </Button>
    </div>
  )
}

function BalanceLocationRow({
  balance,
}: Readonly<{
  balance: BalanceCell
}>) {
  const isLowBalance =
    balance.effectiveAvailableDays <= LOW_BALANCE_THRESHOLD_DAYS
  const headingId = `${balance.employeeId}-${balance.locationId}-balance-heading`

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div>
          <div id={headingId} className="font-semibold text-foreground">
            {balance.locationName}
          </div>
          <p className="text-sm text-muted-foreground">{balance.timeOffTypeName}</p>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground">
        <span className="inline-flex items-center justify-end gap-1.5">
          {isLowBalance ? (
            <TriangleAlert
              className="size-4 text-warning-foreground"
              aria-label="Low balance"
            />
          ) : null}
          {formatDays(balance.availableDays)}
        </span>
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground">
        {formatDays(balance.pendingDays)}
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground">
        {formatDays(balance.effectiveAvailableDays)}
      </TableCell>
    </TableRow>
  )
}

function EmptyBalanceState() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-8 text-center text-sm text-muted-foreground">
      No balances found.
    </div>
  )
}
