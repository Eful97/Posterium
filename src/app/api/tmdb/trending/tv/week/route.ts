import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getServerDefaults } from "@/lib/server-defaults"
import { createLogger } from "@/lib/logger"
import { jsonGzip } from "@/lib/json-response"

const log = createLogger("trending-tv-week")

const TMDB_BASE = "https://api.themoviedb.org/3"

/** Chiave d'istanza TMDB (risolta a request time: può cambiare via Impostazioni). */
function tmdbInstanceKey(): string {
  return getServerDefaults().tmdbApiKey || ""
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const apiKey = req.nextUrl.searchParams.get("api_key") || tmdbInstanceKey()
  const origLang = req.nextUrl.searchParams.get("with_original_language")
  // Hash della chiave API nel cache key — mai il frammento grezzo (i log/status
  // della cache non devono esporre porzioni di credential).
  const apiKeyHash = crypto.createHash("sha1").update(apiKey).digest("hex").slice(0, 8)
  const cacheKey = `trending:tv:week:${origLang || "all"}:${apiKeyHash}`

  const acceptEncoding = req.headers.get("accept-encoding")
  const cached = cacheGet<{ results: unknown[] }>(cacheKey)
  if (cached) return jsonGzip(cached, 200, undefined, acceptEncoding)

  try {
    let url: string
    if (origLang) {
      url = `${TMDB_BASE}/discover/tv?api_key=${apiKey}&with_original_language=${encodeURIComponent(origLang)}&sort_by=popularity.desc&language=it-IT`
    } else {
      url = `${TMDB_BASE}/trending/tv/week?api_key=${apiKey}&language=it-IT`
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      return jsonGzip({ results: [] }, 200, { "Cache-Control": "no-store" }, acceptEncoding)
    }

    const data = await res.json()
    const rawResults = Array.isArray(data.results) ? data.results : []
    const results = rawResults.map((item: Record<string, unknown>) => ({
      id: item.id,
      media_type: "tv" as const,
      name: item.name || item.original_name || "",
      title: item.name || item.original_name || "",
      poster_path: item.poster_path || null,
      first_air_date: item.first_air_date || null,
      vote_average: item.vote_average || 0,
    }))

    const body = { results }
    cacheSet(cacheKey, body, ["tmdb", "trending", "anime"])
    return jsonGzip(body, 200, { "Cache-Control": "public, max-age=300, s-maxage=1800" }, acceptEncoding)
  } catch (err) {
    log.error("TV week fetch failed", { error: err instanceof Error ? err.message : String(err) })
    return jsonGzip({ results: [] }, 200, { "Cache-Control": "no-store" }, acceptEncoding)
  }
}
