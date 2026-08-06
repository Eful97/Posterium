import { NextRequest } from "next/server"
import { adminAuthResponse, checkAdminToken } from "@/lib/auth"
import { cacheStatus } from "@/lib/cache"
import { posterErrorStats } from "@/lib/poster-runtime-cache"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()

  return Response.json({ ...cacheStatus(), posterErrors: posterErrorStats() }, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
