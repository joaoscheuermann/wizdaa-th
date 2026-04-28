"use client"

import type { QueryClient } from "@tanstack/react-query"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  BATCH_RECONCILIATION_INTERVAL_MS,
  DEFAULT_TIME_OFF_TYPE_ID,
} from "@/domain/time-off/constants"
import { reconcileBalanceBatch } from "@/domain/time-off/reconciliation"
import type {
  BalanceBatchResponse,
  BalanceCell,
} from "@/domain/time-off/types"
import {
  getBalanceBatch,
  getBalanceCell,
} from "@/lib/hcm-client/client"
import { queryKeys } from "@/lib/queries/query-keys"

type BalanceCellDimensions = Pick<
  BalanceCell,
  "employeeId" | "locationId" | "timeOffTypeId"
>

export const replaceBalanceInBatch = (
  batch: BalanceBatchResponse | undefined,
  balance: BalanceCell
): BalanceBatchResponse | undefined => {
  if (!batch) return batch

  return {
    ...batch,
    balances: batch.balances.map((candidate) =>
      candidate.employeeId === balance.employeeId &&
      candidate.locationId === balance.locationId &&
      candidate.timeOffTypeId === balance.timeOffTypeId
        ? balance
        : candidate
    ),
  }
}

export const setBalanceInBatchCache = (
  queryClient: QueryClient,
  balance: BalanceCell
) => {
  queryClient.setQueryData<BalanceBatchResponse>(
    queryKeys.balances.batch,
    (current) => replaceBalanceInBatch(current, balance)
  )
}

export const refetchBalanceCell = async (
  queryClient: QueryClient,
  balance: BalanceCellDimensions
) => {
  const response = await queryClient.fetchQuery({
    queryKey: queryKeys.balances.cell(
      balance.employeeId,
      balance.locationId,
      balance.timeOffTypeId
    ),
    queryFn: () =>
      getBalanceCell(
        balance.employeeId,
        balance.locationId,
        balance.timeOffTypeId
      ),
    staleTime: 0,
  })

  setBalanceInBatchCache(queryClient, response.balance)

  return response.balance
}

export const getReconciledBalanceBatch = async (queryClient: QueryClient) =>
  reconcileBalanceBatch(
    queryClient.getQueryData<BalanceBatchResponse>(queryKeys.balances.batch),
    await getBalanceBatch()
  )

export const useBalanceBatchQuery = () => {
  const queryClient = useQueryClient()

  return useQuery<BalanceBatchResponse>({
    queryKey: queryKeys.balances.batch,
    queryFn: () => getReconciledBalanceBatch(queryClient),
    refetchInterval: BATCH_RECONCILIATION_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

export const useBalanceCellQuery = (
  employeeId: string,
  locationId: string,
  timeOffTypeId = DEFAULT_TIME_OFF_TYPE_ID
) =>
  useQuery({
    enabled: employeeId.length > 0 && locationId.length > 0,
    queryKey: queryKeys.balances.cell(employeeId, locationId, timeOffTypeId),
    queryFn: () => getBalanceCell(employeeId, locationId, timeOffTypeId),
  })
