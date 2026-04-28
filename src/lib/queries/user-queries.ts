"use client"

import { useQuery } from "@tanstack/react-query"

import type { UserResponse } from "@/domain/time-off/types"
import { getUser } from "@/lib/hcm-client/client"
import { queryKeys } from "@/lib/queries/query-keys"

export const useRouteUserQuery = (userId: string) =>
  useQuery<UserResponse>({
    enabled: userId.trim().length > 0,
    queryKey: queryKeys.users.byId(userId),
    queryFn: () => getUser(userId),
    retry: false,
  })
