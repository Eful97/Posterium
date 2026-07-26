import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { jsonGzip } from "@/lib/json-response"

const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_KEY = process.env.TMDB_API_KEY || ""

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const apiKey = req.nextUrl.searchParams.get("api_key") || TMDB_KEY
  const origLang = req.nextUrl.searchParams.get("with_original_language")
  const cacheKey = `trending:tv:week:${origLang || "all"}:${apiKey.slice(0, 6)}`

  const cached = cacheGet<{ results: unknown[] }>(cacheKey)
  if (cached) return jsonGzip(cached)

  try {
    let url: string
    if (origLang) {
      url = `${TMDB_BASE}/discover/tv?api_key=${apiKey}&with_original_language=${encodeURIComponent(origLang)}&sort_by=popularity.desc&language=it-IT`
    } else {
      url = `${TMDB_BASE}/trending/tv/week?api_key=${apiKey}&language=it-IT`
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      return jsonGzip({ results: [] }, 200, { "Cache-Control": "no-store" })
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
    return jsonGzip(body, 200, { "Cache-Control": "public, max-age=300, s-maxage=1800" })
  } catch (err) {
    console.error("[tmdb/trending/tv/week] Error:", err)
    return jsonGzip({ results: [] }, 200, { "Cache-Control": "no-store" })
  }
}
