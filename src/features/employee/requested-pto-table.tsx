"use client"

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Inbox,
  XCircle,
} from "lucide-react"
import type { ReactNode } from "react"

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
  getRequestStatusLabel,
  isPendingRequestStatus,
} from "@/domain/time-off/lifecycle"
import type { RequestStatus, TimeOffRequest } from "@/domain/time-off/types"
import { useEmployeeRequestsQuery } from "@/lib/queries/request-mutations"

interface RequestedPtoTableProps {
  readonly employeeId: string
  readonly headerAction?: ReactNode
}

const formatDays = (days: number) => `${days.toFixed(1)} days`

const formatDateRange = (request: TimeOffRequest) =>
  request.startDate === request.endDate
    ? request.startDate
    : `${request.startDate} to ${request.endDate}`

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate))

const getStatusVariant = (status: RequestStatus) => {
  if (
    status === "denied" ||
    status === "rejected_by_hcm" ||
    status === "sync_failed_retryable"
  ) {
    return "destructive"
  }

  if (isPendingRequestStatus(status)) return "secondary"

  return "outline"
}

function StatusIcon({ status }: Readonly<{ status: RequestStatus }>) {
  if (isPendingRequestStatus(status)) {
    return <Clock3 data-icon="inline-start" />
  }

  if (status === "approved") {
    return <CheckCircle2 data-icon="inline-start" />
  }

  if (
    status === "denied" ||
    status === "rejected_by_hcm" ||
    status === "sync_failed_retryable"
  ) {
    return <XCircle data-icon="inline-start" />
  }

  return null
}

export function RequestedPtoTable({
  employeeId,
  headerAction,
}: RequestedPtoTableProps) {
  const { data, error, isError, isFetching, isLoading } =
    useEmployeeRequestsQuery(employeeId)
  const requests = data?.requests ?? []

  return (
    <Card className="rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2>Requested PTO</h2>
          </CardTitle>
          <CardDescription>
            Submitted requests for the active route employee.
          </CardDescription>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant={isFetching ? "outline" : "secondary"}>
              {isLoading
                ? "Loading"
                : isFetching
                  ? "Refreshing"
                  : `${requests.length} total`}
            </Badge>
            {headerAction}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? <RequestedPtoLoading /> : null}
        {isError ? <RequestedPtoError error={error} /> : null}
        {!isLoading && !isError && requests.length === 0 ? (
          <RequestedPtoEmpty />
        ) : null}
        {!isLoading && !isError && requests.length > 0 ? (
          <RequestedPtoRows requests={requests} />
        ) : null}
      </CardContent>
    </Card>
  )
}

function RequestedPtoRows({
  requests,
}: Readonly<{
  requests: readonly TimeOffRequest[]
}>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table
        aria-label="Requested PTO"
        className="w-full min-w-[44rem] border-collapse text-left text-sm"
      >
        <thead className="bg-muted/40 text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2" scope="col">
              Request
            </th>
            <th className="px-3 py-2" scope="col">
              Dates
            </th>
            <th className="px-3 py-2" scope="col">
              Days
            </th>
            <th className="px-3 py-2" scope="col">
              Status
            </th>
            <th className="px-3 py-2" scope="col">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {requests.map((request) => (
            <tr key={request.requestId}>
              <td className="max-w-64 px-3 py-3 align-top">
                <div className="font-medium text-foreground">
                  {request.locationName}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {request.timeOffTypeName}
                </div>
                {request.note ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {request.note}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-3 align-top text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {formatDateRange(request)}
                </span>
              </td>
              <td className="px-3 py-3 align-top font-medium text-foreground">
                {formatDays(request.requestedDays)}
              </td>
              <td className="max-w-56 px-3 py-3 align-top">
                <Badge variant={getStatusVariant(request.status)}>
                  <StatusIcon status={request.status} />
                  {getRequestStatusLabel(request.status)}
                </Badge>
                {request.statusReason ? (
                  <div className="mt-2 text-xs leading-5 text-muted-foreground">
                    {request.statusReason}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-3 align-top text-muted-foreground">
                {formatDate(request.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RequestedPtoLoading() {
  return (
    <div className="space-y-2" aria-label="Loading requested PTO">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="grid min-h-14 grid-cols-[1.4fr_1fr_0.7fr] gap-3 rounded-lg border border-border bg-muted/40 p-3"
        >
          <div>
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="mt-2 h-3 w-20 rounded bg-secondary" />
          </div>
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}

function RequestedPtoError({ error }: Readonly<{ error: unknown }>) {
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
    >
      <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
      <span>
        Unable to load requested PTO
        {error instanceof Error ? `: ${error.message}` : "."}
      </span>
    </div>
  )
}

function RequestedPtoEmpty() {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
      <Inbox className="size-4 text-primary" aria-hidden="true" />
      <span>No requested PTO yet.</span>
    </div>
  )
}
