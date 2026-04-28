import {
  handleRequestsGet,
  handleRequestsPost,
} from "@/server/hcm/request-api"

export const dynamic = "force-dynamic"

export const GET = handleRequestsGet
export const POST = handleRequestsPost
