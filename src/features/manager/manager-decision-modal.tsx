"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ManagerDecisionPanel } from "@/features/manager/manager-decision-panel"

interface ManagerDecisionModalProps {
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly selectedRequestId: string | null
}

export function ManagerDecisionModal({
  onOpenChange,
  open,
  selectedRequestId,
}: ManagerDecisionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Review pending request</DialogTitle>
          <DialogDescription>
            Verify the latest HCM balance before approving or denying.
          </DialogDescription>
        </DialogHeader>
        <ManagerDecisionPanel
          key={selectedRequestId ?? "none"}
          selectedRequestId={selectedRequestId}
          variant="modal"
        />
      </DialogContent>
    </Dialog>
  )
}
