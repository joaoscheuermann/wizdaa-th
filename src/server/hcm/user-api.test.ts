import { beforeEach, describe, expect, it } from "vitest"

import { GET as getUser } from "@/app/api/hcm/users/[userId]/route"
import type { ApiErrorResponse, UserResponse } from "@/domain/time-off/types"
import { resetHcmState } from "@/server/hcm/state-store"

const userRequest = (userId: string) =>
  new Request(`http://localhost/api/hcm/users/${userId}`)

const userContext = (userId: string) => ({
  params: Promise.resolve({ userId }),
})

describe("/api/hcm/users/[userId]", () => {
  beforeEach(() => {
    resetHcmState()
  })

  it("returns a seeded product user", async () => {
    const response = await getUser(userRequest("emp-avery"), userContext("emp-avery"))
    const body = (await response.json()) as UserResponse

    expect(response.status).toBe(200)
    expect(body.user).toEqual({
      id: "emp-avery",
      name: "Avery Stone",
      role: "employee",
      managerId: "mgr-morgan",
    })
  })

  it("returns a not-found response for unknown users", async () => {
    const response = await getUser(
      userRequest("not-a-user"),
      userContext("not-a-user")
    )
    const body = (await response.json()) as ApiErrorResponse

    expect(response.status).toBe(404)
    expect(body.error).toMatchObject({
      code: "user_not_found",
      message: 'No seeded ExampleHR user exists for "not-a-user".',
    })
  })
})
