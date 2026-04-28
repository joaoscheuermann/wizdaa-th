"use client"

import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

interface ReconciliationBannerProps {
  readonly message: string
  readonly tone: "info" | "success" | "warning"
}

const toneStyles: Record<ReconciliationBannerProps["tone"], string> = {
  info: "border-border bg-muted/40 text-foreground",
  success: "border-success-border bg-success text-success-foreground",
  warning: "border-warning-border bg-warning text-warning-foreground",
}

export function ReconciliationBanner({
  message,
  tone,
}: ReconciliationBannerProps) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "warning" ? AlertCircle : RefreshCw

  return (
    <div
      role="status"
      className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${toneStyles[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
