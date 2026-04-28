"use client"

import { useIsMutating } from "@tanstack/react-query"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Inbox,
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

const formatDays = (days: number) => `${days.toFixed(1)} days`

interface ReconciliationNotice {
  readonly message: string
  readonly tone: "success" | "warning"
}

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

const sortBalances = (balances: readonly BalanceCell[]) =>
  [...balances].sort((first, second) => {
    const employeeComparison = first.employeeName.localeCompare(
      second.employeeName
    )

    if (employeeComparison !== 0) return employeeComparison

    return first.locationName.localeCompare(second.locationName)
  })

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
      message: `Refreshed balance: ${change.current.employeeName} ${change.current.locationName} now shows ${formatDays(
        change.current.availableDays
      )} available and ${formatDays(change.current.pendingDays)} pending.`,
      tone: "success",
    }
  }

  return {
    message: `Refreshed ${changes.length} employee balances from HCM.`,
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

export function AllEmployeeBalancesTable() {
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
  const [notice, setNotice] = useState<ReconciliationNotice | null>(null)
  const rows = useMemo(
    () => sortBalances(data?.balances ?? []),
    [data?.balances]
  )
  const refreshFailed = Boolean(data && isRefetchError)
  const refreshBalances = () => {
    void refetch()
  }

  useEffect(() => {
    if (!data) return

    const previousBatch = previousBatchRef.current
    previousBatchRef.current = data

    if (!previousBatch) return

    const changes = getReconciledBalanceChanges(previousBatch, data)

    if (changes.length === 0) return

    setNotice(formatBalanceChangeMessage(changes, activeMutations > 0))
  }, [activeMutations, data])

  if (isLoading) {
    return (
      <AllEmployeeBalancesShell
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
        <AllEmployeeBalancesLoading />
      </AllEmployeeBalancesShell>
    )
  }

  if (isError && !data) {
    return (
      <AllEmployeeBalancesShell
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
        <AllEmployeeBalancesError error={error} />
      </AllEmployeeBalancesShell>
    )
  }

  if (!data || rows.length === 0) {
    return (
      <AllEmployeeBalancesShell
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
        <AllEmployeeBalancesEmpty />
      </AllEmployeeBalancesShell>
    )
  }

  const oldestVerifiedBalance = getOldestVerifiedBalance(rows)

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
    <AllEmployeeBalancesShell
      description="Manager-visible HCM balance corpus across employees and locations."
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
        {!refreshFailed && notice ? (
          <ReconciliationBanner message={notice.message} tone={notice.tone} />
        ) : null}

        <AllEmployeeBalancesRows rows={rows} />
      </div>
    </AllEmployeeBalancesShell>
  )
}

function AllEmployeeBalancesShell({
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
    <Card className="h-fit rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2>All employee balances</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction>{action}</CardAction>
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
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

function AllEmployeeBalancesRows({
  rows,
}: Readonly<{
  rows: readonly BalanceCell[]
}>) {
  return (
    <Table aria-label="All employee balances">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-44">Employee</TableHead>
          <TableHead className="min-w-48">Location</TableHead>
          <TableHead className="min-w-32 text-right">Available</TableHead>
          <TableHead className="min-w-32 text-right">Pending</TableHead>
          <TableHead className="min-w-32 text-right">Effective</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((balance) => (
          <AllEmployeeBalanceRow
            key={`${balance.employeeId}-${balance.locationId}-${balance.timeOffTypeId}`}
            balance={balance}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function AllEmployeeBalanceRow({
  balance,
}: Readonly<{
  balance: BalanceCell
}>) {
  const isLowBalance =
    balance.effectiveAvailableDays <= LOW_BALANCE_THRESHOLD_DAYS

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="font-semibold text-foreground">
          {balance.employeeName}
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div>
          <div className="font-semibold text-foreground">
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

function AllEmployeeBalancesLoading() {
  return (
    <div className="space-y-2" aria-label="Loading all employee balances">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="grid min-h-16 gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[1.2fr_1.3fr_0.8fr_0.8fr_0.8fr]"
        >
          <div>
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
          <div>
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="mt-2 h-3 w-24 rounded bg-secondary" />
          </div>
          <div className="h-4 w-20 rounded bg-muted sm:justify-self-end" />
          <div className="h-4 w-20 rounded bg-muted sm:justify-self-end" />
          <div className="h-5 w-24 rounded bg-secondary sm:justify-self-end" />
        </div>
      ))}
    </div>
  )
}

function AllEmployeeBalancesError({ error }: Readonly<{ error: unknown }>) {
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
    >
      <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
      <span>
        Unable to load all employee balances
        {error instanceof Error ? `: ${error.message}` : "."}
      </span>
    </div>
  )
}

function AllEmployeeBalancesEmpty() {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
      <Inbox className="size-4 text-primary" aria-hidden="true" />
      <span>No employee balances found.</span>
    </div>
  )
}
