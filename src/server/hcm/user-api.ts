import type { DemoUser, UserResponse } from "@/domain/time-off/types"
import { hcmErrorResponse } from "@/server/hcm/state-api"
import { getHcmState } from "@/server/hcm/state-store"

interface UserRouteContext {
  readonly params: Promise<{
    readonly userId: string
  }>
}

export const getDemoUser = (userId: string): DemoUser | null => {
  const normalizedUserId = userId.trim()

  if (normalizedUserId.length === 0) return null

  return (
    getHcmState().employees.find((user) => user.id === normalizedUserId) ?? null
  )
}

export const handleUserGet = async (
  _request: Request,
  context: UserRouteContext
) => {
  const { userId } = await context.params
  const normalizedUserId = userId.trim()

  if (normalizedUserId.length === 0) {
    return hcmErrorResponse(
      "missing_user_id",
      "userId route parameter is required.",
      400
    )
  }

  const user = getDemoUser(normalizedUserId)

  if (!user) {
    return hcmErrorResponse(
      "user_not_found",
      `No seeded ExampleHR user exists for "${normalizedUserId}".`,
      404
    )
  }

  return Response.json({ user } satisfies UserResponse)
}
