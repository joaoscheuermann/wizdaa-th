"use client"

import { AlertCircle, Clock3, Inbox } from "lucide-react"
import { useMemo } from "react"

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
import { getRequestStatusLabel } from "@/domain/time-off/lifecycle"
import type { TimeOffRequest } from "@/domain/time-off/types"
import { usePendingRequestsQuery } from "@/lib/queries/request-mutations"

interface PendingRequestQueueProps {
  readonly selectedRequestId?: string | null
  readonly onSelectRequest: (requestId: string) => void
}

const formatDays = (days: number) => `${days.toFixed(1)} days`

const formatDateRange = (request: TimeOffRequest) =>
  request.startDate === request.endDate
    ? request.startDate
    : `${request.startDate} to ${request.endDate}`

export function PendingRequestQueue({
  onSelectRequest,
  selectedRequestId,
}: PendingRequestQueueProps) {
  const { data, error, isError, isFetching, isLoading } =
    usePendingRequestsQuery()
  const requests = useMemo(() => data?.requests ?? [], [data?.requests])

  return (
    <Card className="rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2 id="manager-workspace-heading">Manager workspace</h2>
          </CardTitle>
          <CardDescription>
            Pending manager-review requests sorted oldest first.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant={isFetching ? "outline" : "secondary"}>
            {isFetching ? "Refreshing" : `${requests.length} pending`}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? <QueueLoading /> : null}
        {isError ? <QueueError error={error} /> : null}
        {!isLoading && !isError && requests.length === 0 ? <QueueEmpty /> : null}
        {!isLoading && !isError && requests.length > 0 ? (
          <ol className="space-y-3">
            {requests.map((request, index) => (
              <QueueItem
                key={request.requestId}
                isOldest={index === 0}
                isSelected={request.requestId === selectedRequestId}
                onSelect={() => onSelectRequest(request.requestId)}
                request={request}
              />
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  )
}

function QueueItem({
  isOldest,
  isSelected,
  onSelect,
  request,
}: Readonly<{
  isOldest: boolean
  isSelected: boolean
  onSelect: () => void
  request: TimeOffRequest
}>) {
  const statusLabel = getRequestStatusLabel(request.status)

  return (
    <li>
      <Button
        type="button"
        variant={isSelected ? "default" : "outline"}
        className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
        aria-pressed={isSelected}
        aria-label={`Review ${request.employeeName} ${request.locationName}`}
        onClick={onSelect}
      >
        <span className="flex w-full flex-col gap-2">
          <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <span>
              <span className="block font-semibold">{request.employeeName}</span>
              <span className="block text-xs opacity-80">
                {request.locationName} - {formatDays(request.requestedDays)}
              </span>
            </span>
            <span className="flex flex-wrap gap-1">
              {isOldest ? <Badge variant="outline">Oldest</Badge> : null}
              <Badge variant="secondary">
                <Clock3 data-icon="inline-start" />
                {statusLabel}
              </Badge>
            </span>
          </span>
          <span className="text-xs opacity-80">{formatDateRange(request)}</span>
        </span>
      </Button>
    </li>
  )
}

function QueueLoading() {
  return (
    <div className="space-y-2">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="min-h-24 rounded-lg border border-border bg-muted/40 p-3"
        >
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="mt-3 h-3 w-48 rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}

function QueueError({ error }: Readonly<{ error: unknown }>) {
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
    >
      <AlertCircle className="mt-0.5 size-4" />
      <span>
        Unable to load pending requests
        {error instanceof Error ? `: ${error.message}` : "."}
      </span>
    </div>
  )
}

function QueueEmpty() {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
      <Inbox className="size-4 text-primary" aria-hidden="true" />
      <span>No pending requests.</span>
    </div>
  )
}
