"use client"

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  formatBalanceFreshnessStatus,
  formatRelativeFreshness,
} from "@/domain/time-off/freshness"
import type { BalanceFreshnessStatus } from "@/domain/time-off/types"

interface BalanceFreshnessIndicatorProps {
  readonly lastVerifiedAt: string
  readonly nowMs: number
  readonly source: string
  readonly status: BalanceFreshnessStatus
}

const statusIcon: Record<BalanceFreshnessStatus, LucideIcon> = {
  loading: Clock3,
  fresh: CheckCircle2,
  refreshing: RefreshCw,
  stale: Clock3,
  refresh_failed: AlertCircle,
  conflict: AlertCircle,
  error: AlertCircle,
}

const statusVariant = (status: BalanceFreshnessStatus) => {
  if (status === "refresh_failed" || status === "error") return "destructive"
  if (status === "stale" || status === "refreshing") return "outline"

  return "secondary"
}

export function BalanceFreshnessIndicator({
  lastVerifiedAt,
  nowMs,
  source,
  status,
}: BalanceFreshnessIndicatorProps) {
  const Icon = statusIcon[status]
  const label = formatBalanceFreshnessStatus(status)

  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={statusVariant(status)} className="capitalize">
        <Icon data-icon="inline-start" />
        {label}
      </Badge>
      <p className="text-xs text-muted-foreground">
        {formatRelativeFreshness(lastVerifiedAt, nowMs)} from {source}
      </p>
    </div>
  )
}
