import {
  handleStateDelete,
  handleStateGet,
  handleStatePatch,
  handleStatePost,
} from "@/server/hcm/state-api"

export const dynamic = "force-dynamic"

export const GET = handleStateGet
export const POST = handleStatePost
export const PATCH = handleStatePatch
export const DELETE = handleStateDelete
