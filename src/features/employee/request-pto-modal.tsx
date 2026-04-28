"use client"

import { Plus } from "lucide-react"
import { useLayoutEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RequestForm } from "@/features/employee/request-form"

interface RequestPtoModalProps {
  readonly defaultOpen?: boolean
  readonly selectedEmployeeId: string
}

export function RequestPtoModal({
  defaultOpen = false,
  selectedEmployeeId,
}: RequestPtoModalProps) {
  const [open, setOpen] = useState(defaultOpen)

  useLayoutEffect(() => {
    return () => {
      setOpen(false)
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            aria-label="Request PTO"
            title="Request PTO"
          />
        }
      >
        <Plus aria-hidden="true" />
        <span className="sr-only">Request PTO</span>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Request PTO</DialogTitle>
          <DialogDescription>
            Submit dates and a calculated day total.
          </DialogDescription>
        </DialogHeader>
        <RequestForm
          key={selectedEmployeeId}
          selectedEmployeeId={selectedEmployeeId}
          onSubmitSuccess={() => setOpen(false)}
          surface="plain"
        />
      </DialogContent>
    </Dialog>
  )
}
