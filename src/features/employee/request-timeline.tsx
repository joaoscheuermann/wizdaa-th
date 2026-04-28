"use client"

import { AlertCircle, CalendarDays, Clock3 } from "lucide-react"

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
import type { TimeOffRequest } from "@/domain/time-off/types"
import { useEmployeeRequestsQuery } from "@/lib/queries/request-mutations"

interface RequestTimelineProps {
  readonly employeeId: string
}

const formatDays = (days: number) => `${days.toFixed(1)} days`

const formatDateRange = (request: TimeOffRequest) =>
  request.startDate === request.endDate
    ? request.startDate
    : `${request.startDate} to ${request.endDate}`

export function RequestTimeline({ employeeId }: RequestTimelineProps) {
  const { data, error, isError, isLoading } = useEmployeeRequestsQuery(employeeId)
  const requests = data?.requests ?? []

  return (
    <Card className="rounded-lg border border-border shadow-none">
      <CardHeader>
        <div>
          <CardTitle>
            <h2>Request timeline</h2>
          </CardTitle>
          <CardDescription>Submitted employee PTO requests.</CardDescription>
        </div>
        <CardAction>
          <Badge variant="outline">{requests.length} total</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? <TimelineLoading /> : null}
        {isError ? <TimelineError error={error} /> : null}
        {!isLoading && !isError && requests.length === 0 ? (
          <TimelineEmpty />
        ) : null}
        {!isLoading && !isError && requests.length > 0 ? (
          <ol className="space-y-3">
            {requests.map((request) => (
              <TimelineItem key={request.requestId} request={request} />
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TimelineItem({
  request,
}: Readonly<{
  request: TimeOffRequest
}>) {
  const isPending = isPendingRequestStatus(request.status)
  const statusLabel = getRequestStatusLabel(request.status)
  const headingId = `${request.requestId}-timeline-heading`

  return (
    <li>
      <article
        aria-labelledby={headingId}
        className="rounded-lg border border-border bg-muted/40 p-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 id={headingId} className="font-semibold text-foreground">
              {request.locationName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatDateRange(request)} - {formatDays(request.requestedDays)}
            </p>
          </div>
          <Badge variant={isPending ? "secondary" : "outline"}>
            {isPending ? <Clock3 data-icon="inline-start" /> : null}
            {statusLabel}
          </Badge>
        </div>
        {request.note ? (
          <p className="mt-2 text-sm text-muted-foreground">{request.note}</p>
        ) : null}
        {request.statusReason ? (
          <p className="mt-2 rounded-lg border border-border bg-card px-2 py-1 text-sm text-muted-foreground">
            Reason: {request.statusReason}
          </p>
        ) : null}
      </article>
    </li>
  )
}

function TimelineLoading() {
  return (
    <div className="space-y-2">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="min-h-20 rounded-lg border border-border bg-muted/40 p-3"
        >
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="mt-3 h-3 w-44 rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}

function TimelineError({ error }: Readonly<{ error: unknown }>) {
  return (
    <div
      role="alert"
      className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
    >
      <AlertCircle className="mt-0.5 size-4" />
      <span>
        Unable to load requests
        {error instanceof Error ? `: ${error.message}` : "."}
      </span>
    </div>
  )
}

function TimelineEmpty() {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
      <CalendarDays className="size-4 text-primary" aria-hidden="true" />
      <span>No submitted requests.</span>
    </div>
  )
}
