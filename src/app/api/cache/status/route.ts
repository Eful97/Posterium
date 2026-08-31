import { NextRequest } from "next/server"
import sharp from "sharp"
import { adminAuthResponse, checkAdminToken } from "@/lib/auth"
import { cacheStatus } from "@/lib/cache"
import { getPosterStats, posterErrorStats } from "@/lib/poster-runtime-cache"
import { getTMDBStats } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(req: NextRequest) {
  const rl = await rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  if (!checkAdminToken(req)) return adminAuthResponse()

  const sharpCache = sharp.cache()
  const sharpCounters = sharp.counters()
  const procMem = process.memoryUsage()

  const systemStats = {
    sharp: {
      memory: sharpCache,
      counters: sharpCounters,
      concurrency: sharp.concurrency(),
      simd: sharp.simd(),
    },
    memory: {
      rssMb: Math.round((procMem.rss / (1024 * 1024)) * 10) / 10,
      heapUsedMb: Math.round((procMem.heapUsed / (1024 * 1024)) * 10) / 10,
      heapTotalMb: Math.round((procMem.heapTotal / (1024 * 1024)) * 10) / 10,
      externalMb: Math.round((procMem.external / (1024 * 1024)) * 10) / 10,
    },
    uptimeSeconds: Math.round(process.uptime()),
  }

  return Response.json({
    ...cacheStatus(),
    posterErrors: posterErrorStats(),
    poster: getPosterStats(),
    tmdb: getTMDBStats(),
    system: systemStats,
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
