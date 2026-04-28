import {
  handleBalanceCellGet,
  handleBalanceCellPatch,
} from "@/server/hcm/balance-api"

export const dynamic = "force-dynamic"

export const GET = handleBalanceCellGet
export const PATCH = handleBalanceCellPatch
