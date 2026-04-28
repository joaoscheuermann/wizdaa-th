"use client"

import { AlertCircle, Inbox } from "lucide-react"
import { useMemo } from "react"

import { BalanceFreshnessIndicator } from "@/components/common/balance-freshness-indicator"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LOW_BALANCE_THRESHOLD_DAYS } from "@/domain/time-off/constants"
import { getDisplayBalanceFreshnessStatus } from "@/domain/time-off/freshness"
import type { BalanceCell } from "@/domain/time-off/types"
import { useBalanceBatchQuery } from "@/lib/queries/balance-queries"

const formatDays = (days: number) => `${days.toFixed(1)} days`

const formatVerifiedAt = (isoDate: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(isoDate))

const sortBalances = (balances: readonly BalanceCell[]) =>
  [...balances].sort((first, second) => {
    const employeeComparison = first.employeeName.localeCompare(
      second.employeeName
    )

    if (employeeComparison !== 0) return employeeComparison

    return first.locationName.localeCompare(second.locationName)
  })

export function AllEmployeeBalancesTable() {
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    isRefetchError,
  } =
    useBalanceBatchQuery()
  const rows = useMemo(
    () => sortBalances(data?.balances ?? []),
    [data?.balances]
  )
  const refreshFailed = Boolean(data && isRefetchError)
  const fetchedAtMs = data ? Date.parse(data.fetchedAt) : 0

  return (
    <Card className="h-fit rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2>All employee balances</h2>
          </CardTitle>
          <CardDescription>
            Manager-visible HCM balance corpus across employees and locations.
          </CardDescription>
        </div>
        <CardAction>
          <Badge
            variant={
              refreshFailed ? "destructive" : isFetching ? "outline" : "secondary"
            }
          >
            {isLoading
              ? "Loading"
              : refreshFailed
                ? "Refresh failed"
                : isFetching
                  ? "Refreshing"
                  : `${rows.length} cells`}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? <AllEmployeeBalancesLoading /> : null}
        {isError && !data ? <AllEmployeeBalancesError error={error} /> : null}
        {!isLoading && !isError && rows.length === 0 ? (
          <AllEmployeeBalancesEmpty />
        ) : null}
        {rows.length > 0 ? (
          <AllEmployeeBalancesRows
            isRefreshFailed={refreshFailed}
            isRefreshing={isFetching}
            nowMs={fetchedAtMs}
            rows={rows}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

function AllEmployeeBalancesRows({
  isRefreshFailed,
  isRefreshing,
  nowMs,
  rows,
}: Readonly<{
  isRefreshFailed: boolean
  isRefreshing: boolean
  nowMs: number
  rows: readonly BalanceCell[]
}>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table
        aria-label="All employee balances"
        className="w-full min-w-[54rem] border-collapse text-left text-sm"
      >
        <thead className="bg-muted/40 text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2" scope="col">
              Employee
            </th>
            <th className="px-3 py-2" scope="col">
              Available
            </th>
            <th className="px-3 py-2" scope="col">
              Pending
            </th>
            <th className="px-3 py-2" scope="col">
              Effective
            </th>
            <th className="px-3 py-2" scope="col">
              Freshness
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.map((balance) => {
            const isLowBalance =
              balance.effectiveAvailableDays <= LOW_BALANCE_THRESHOLD_DAYS
            const freshnessStatus = getDisplayBalanceFreshnessStatus({
              isRefreshFailed,
              isRefreshing,
              lastVerifiedAt: balance.lastVerifiedAt,
              nowMs,
            })

            return (
              <tr
                key={`${balance.employeeId}-${balance.locationId}-${balance.timeOffTypeId}`}
              >
                <td className="max-w-72 px-3 py-3 align-top">
                  <div className="font-medium text-foreground">
                    {balance.employeeName}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {balance.locationName} - {balance.timeOffTypeName}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Verified {formatVerifiedAt(balance.lastVerifiedAt)}
                  </div>
                </td>
                <BalanceValueCell value={formatDays(balance.availableDays)} />
                <BalanceValueCell value={formatDays(balance.pendingDays)} />
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-foreground">
                    {formatDays(balance.effectiveAvailableDays)}
                  </div>
                  {isLowBalance ? (
                    <Badge variant="destructive" className="mt-2">
                      Low balance
                    </Badge>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top">
                  <BalanceFreshnessIndicator
                    lastVerifiedAt={balance.lastVerifiedAt}
                    nowMs={nowMs}
                    source={balance.source}
                    status={freshnessStatus}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Version {balance.version}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BalanceValueCell({ value }: Readonly<{ value: string }>) {
  return (
    <td className="px-3 py-3 align-top font-semibold text-foreground">
      {value}
    </td>
  )
}

function AllEmployeeBalancesLoading() {
  return (
    <div className="space-y-2" aria-label="Loading all employee balances">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="grid min-h-16 grid-cols-[1.5fr_0.8fr_0.8fr] gap-3 rounded-lg border border-border bg-muted/40 p-3"
        >
          <div>
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="mt-2 h-3 w-24 rounded bg-secondary" />
          </div>
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-5 w-28 rounded bg-secondary" />
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
