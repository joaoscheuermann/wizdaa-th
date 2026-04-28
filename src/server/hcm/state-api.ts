import { parseHcmState, parseHcmStatePatch } from "@/domain/time-off/schemas"
import type { ApiErrorResponse } from "@/domain/time-off/types"
import {
  getHcmState,
  patchHcmState,
  replaceHcmState,
  resetHcmState,
} from "@/server/hcm/state-store"
import type { RequestFormFieldErrors } from "@/domain/time-off/types"

export const hcmErrorResponse = (
  code: string,
  message: string,
  status: number,
  fieldErrors?: RequestFormFieldErrors
) =>
  Response.json(
    {
      error: {
        code,
        message,
        fieldErrors,
      },
    } satisfies ApiErrorResponse,
    { status }
  )

const readJsonBody = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export const handleStateGet = () => Response.json(getHcmState())

export const handleStatePost = async (request: Request) => {
  const parsed = parseHcmState(await readJsonBody(request))

  if (!parsed.ok) {
    return hcmErrorResponse("invalid_state", parsed.message, 400)
  }

  return Response.json(replaceHcmState(parsed.value))
}

export const handleStatePatch = async (request: Request) => {
  const parsed = parseHcmStatePatch(await readJsonBody(request))

  if (!parsed.ok) {
    return hcmErrorResponse("invalid_state_patch", parsed.message, 400)
  }

  const updatedState = patchHcmState(parsed.value)

  if (!updatedState) {
    return hcmErrorResponse(
      "invalid_state_patch",
      "Patch would produce an invalid HCM state.",
      400
    )
  }

  return Response.json(updatedState)
}

export const handleStateDelete = () => Response.json(resetHcmState())
