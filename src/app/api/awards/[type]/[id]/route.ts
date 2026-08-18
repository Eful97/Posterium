import { NextRequest } from "next/server"
import { fetchAllWikidata } from "@/lib/awards"
import { getKeywords } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { createLogger } from "@/lib/logger"

const log = createLogger("awards")

type RouteParams = { type: string; id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "default")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { type, id } = await params
  const mediaType = type === "tv" || type === "series" ? "tv" : "movie"
  const tmdbId = Number(id)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ awards: [], nominations: [], studios: [], keywords: [] })
  }
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  // Fix L10: try/catch — prima un throw di fetchAllWikidata/getKeywords
  // (outage upstream) cascava in un 500 generico.
  try {
    const [data, keywords] = await Promise.all([
      fetchAllWikidata(tmdbId, mediaType),
      getKeywords(mediaType, tmdbId, apiKey),
    ])
    return Response.json({ ...data, keywords })
  } catch (e) {
    log.warn("Awards fetch failed", { mediaType, tmdbId, error: e instanceof Error ? e.message : String(e) })
    return Response.json({ error: "Awards data unavailable" }, { status: 502 })
  }
}
