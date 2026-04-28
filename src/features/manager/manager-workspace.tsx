"use client"

import { useState } from "react"

import { AllEmployeeBalancesTable } from "@/features/manager/all-employee-balances-table"
import { ManagerDecisionModal } from "@/features/manager/manager-decision-modal"
import { PendingRequestQueue } from "@/features/manager/pending-request-queue"

export function ManagerWorkspace() {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const closeDecisionModal = (open: boolean) => {
    if (open) return

    setSelectedRequestId(null)
  }

  return (
    <section
      aria-label="Manager review workspace"
      className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]"
    >
      <div className="min-w-0">
        <AllEmployeeBalancesTable />
      </div>

      <div className="min-w-0">
        <PendingRequestQueue
          selectedRequestId={selectedRequestId}
          onSelectRequest={setSelectedRequestId}
        />
      </div>

      <ManagerDecisionModal
        open={selectedRequestId !== null}
        onOpenChange={closeDecisionModal}
        selectedRequestId={selectedRequestId}
      />
    </section>
  )
}
