"use client"

import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useState } from "react"

import { BALANCE_FRESHNESS_THRESHOLD_MS } from "@/domain/time-off/constants"

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: BALANCE_FRESHNESS_THRESHOLD_MS * 4,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        retry: false,
        staleTime: BALANCE_FRESHNESS_THRESHOLD_MS,
      },
      mutations: {
        retry: false,
      },
    },
  })

export function QueryClientProvider({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const [queryClient] = useState(createQueryClient)

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  )
}
