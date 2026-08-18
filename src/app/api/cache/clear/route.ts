import { cacheClear } from "@/lib/cache"
import { clearAutoFitCache } from "@/lib/poster-auto-fit"
import { __resetJWRankingsCache } from "@/lib/justwatch"
import { __clearTMDBCache } from "@/lib/tmdb"
import { __clearFlixpatrolCache } from "@/lib/flixpatrol"
import { __resetTMDBSessionCache } from "@/lib/tmdb-session-cache"
import { clearRegionStatsCache } from "@/lib/image-utils"
import { checkAdminToken, isSameOrigin, adminAuthResponse, originMismatchResponse } from "@/lib/auth"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
  const rl = rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()
  if (!isSameOrigin(req)) return originMismatchResponse()
  // Fix L26: il clear ora copre anche le cache module-level (TMDB, JustWatch,
  // FlixPatrol, region-stats, session cache) — prima "svuotava" solo la cache
  // condivisa di cache.ts e i dati stale restavano serviti dalle altre.
  cacheClear()
  clearAutoFitCache()
  __resetJWRankingsCache()
  __clearTMDBCache()
  __clearFlixpatrolCache()
  __resetTMDBSessionCache()
  clearRegionStatsCache()
  return Response.json({ ok: true, message: "Cache svuotata" })
}
