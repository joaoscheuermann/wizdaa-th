"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getEffectiveAvailableDays } from "@/domain/time-off/freshness"
import { BATCH_RECONCILIATION_INTERVAL_MS } from "@/domain/time-off/constants"
import { createOptimisticPendingRequest } from "@/domain/time-off/lifecycle"
import { isSameBalanceIdentity } from "@/domain/time-off/reconciliation"
import type {
  BalanceBatchResponse,
  BalanceCell,
  EmployeeRequestsResponse,
  ManagerDecisionRequest,
  PendingRequestsResponse,
  TimeOffRequestSubmission,
} from "@/domain/time-off/types"
import {
  decideTimeOffRequest,
  getEmployeeRequests,
  getPendingRequests,
  submitTimeOffRequest,
} from "@/lib/hcm-client/client"
import { replaceBalanceInBatch } from "@/lib/queries/balance-queries"
import { queryKeys } from "@/lib/queries/query-keys"

type ManagerDecisionMutationInput = ManagerDecisionRequest & {
  readonly requestId: string
}

const isSubmissionBalance = (
  balance: BalanceCell,
  submission: TimeOffRequestSubmission
) =>
  balance.employeeId === submission.employeeId &&
  balance.locationId === submission.locationId &&
  balance.timeOffTypeId === submission.timeOffTypeId

const reserveOptimisticBalance = (
  balance: BalanceCell,
  requestedDays: number
): BalanceCell => {
  const pendingDays = Number((balance.pendingDays + requestedDays).toFixed(1))

  return {
    ...balance,
    pendingDays,
    effectiveAvailableDays: getEffectiveAvailableDays(
      balance.availableDays,
      pendingDays
    ),
    freshnessStatus: "refreshing",
  }
}

const replaceBatchBalance = (
  batch: BalanceBatchResponse | undefined,
  submission: TimeOffRequestSubmission,
  balance: BalanceCell
): BalanceBatchResponse | undefined => {
  if (!batch) return batch

  return {
    ...batch,
    balances: batch.balances.map((candidate) =>
      isSameBalanceIdentity(candidate, submission) ? balance : candidate
    ),
  }
}

export const useEmployeeRequestsQuery = (employeeId: string) =>
  useQuery({
    enabled: employeeId.length > 0,
    queryKey: queryKeys.requests.employee(employeeId),
    queryFn: () => getEmployeeRequests(employeeId),
    refetchInterval: BATCH_RECONCILIATION_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

export const usePendingRequestsQuery = () =>
  useQuery<PendingRequestsResponse>({
    queryKey: queryKeys.requests.pending,
    queryFn: getPendingRequests,
    refetchInterval: BATCH_RECONCILIATION_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

export const useSubmitTimeOffRequestMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: queryKeys.mutations.submitRequest,
    mutationFn: submitTimeOffRequest,
    onMutate: async (submission) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.balances.batch })
      await queryClient.cancelQueries({
        queryKey: queryKeys.requests.employee(submission.employeeId),
      })

      const previousBalances =
        queryClient.getQueryData<BalanceBatchResponse>(
          queryKeys.balances.batch
        )
      const previousRequests =
        queryClient.getQueryData<EmployeeRequestsResponse>(
          queryKeys.requests.employee(submission.employeeId)
        )
      const targetBalance = previousBalances?.balances.find((balance) =>
        isSubmissionBalance(balance, submission)
      )

      if (!targetBalance) {
        return {
          previousBalances,
          previousRequests,
          employeeId: submission.employeeId,
        }
      }

      const submittedAt = new Date().toISOString()
      const optimisticRequest = createOptimisticPendingRequest(
        submission,
        targetBalance,
        submittedAt
      )

      queryClient.setQueryData<BalanceBatchResponse>(
        queryKeys.balances.batch,
        (current) =>
          replaceBatchBalance(
            current,
            submission,
            reserveOptimisticBalance(targetBalance, submission.requestedDays)
          )
      )
      queryClient.setQueryData<EmployeeRequestsResponse>(
        queryKeys.requests.employee(submission.employeeId),
        (current) => ({
          fetchedAt: submittedAt,
          requests: [
            optimisticRequest,
            ...(current?.requests.filter(
              (request) => request.requestId !== optimisticRequest.requestId
            ) ?? []),
          ],
        })
      )

      return {
        previousBalances,
        previousRequests,
        employeeId: submission.employeeId,
      }
    },
    onError: (_error, _submission, context) => {
      if (!context) return

      queryClient.setQueryData(queryKeys.balances.batch, context.previousBalances)
      queryClient.setQueryData(
        queryKeys.requests.employee(context.employeeId),
        context.previousRequests
      )
    },
    onSuccess: (response, submission) => {
      queryClient.setQueryData<BalanceBatchResponse>(
        queryKeys.balances.batch,
        (current) => replaceBatchBalance(current, submission, response.balance)
      )
      queryClient.setQueryData<EmployeeRequestsResponse>(
        queryKeys.requests.employee(submission.employeeId),
        (current) => ({
          fetchedAt: response.request.updatedAt,
          requests: [
            response.request,
            ...(current?.requests.filter(
              (request) =>
                !request.requestId.startsWith("optimistic-") &&
                request.requestId !== response.request.requestId
            ) ?? []),
          ],
        })
      )
    },
  })
}

export const useManagerDecisionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: queryKeys.mutations.managerDecision,
    mutationFn: ({ requestId, ...payload }: ManagerDecisionMutationInput) =>
      decideTimeOffRequest(requestId, payload),
    onSuccess: (response) => {
      queryClient.setQueryData<BalanceBatchResponse>(
        queryKeys.balances.batch,
        (current) => replaceBalanceInBatch(current, response.balance)
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.pending })
      queryClient.invalidateQueries({
        queryKey: queryKeys.requests.employee(response.request.employeeId),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.balances.batch })
      queryClient.invalidateQueries({
        queryKey: queryKeys.balances.cell(
          response.balance.employeeId,
          response.balance.locationId,
          response.balance.timeOffTypeId
        ),
      })
    },
  })
}
