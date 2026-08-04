import { cacheClear } from "@/lib/cache"
import { clearAutoFitCache } from "@/lib/poster-auto-fit"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  cacheClear()
  clearAutoFitCache()
  return Response.json({ ok: true, message: "Cache svuotata" })
}
