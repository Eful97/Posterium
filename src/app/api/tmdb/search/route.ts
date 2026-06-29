import { NextRequest } from "next/server"
import { searchMulti, type TMDBMediaResult } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "search")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const rawQuery = req.nextUrl.searchParams.get("q")
  const query = rawQuery ? rawQuery.trim().slice(0, 100) : null
  const language = req.nextUrl.searchParams.get("language") || "it-IT"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10)
  if (!query || query.length < 2) {
    return Response.json({ results: [], total_results: 0, total_pages: 0 })
  }
  const cacheKey = `search:${query}:${language}:${page}`
  const cached = cacheGet<{ results: TMDBMediaResult[]; total_results: number; total_pages: number }>(cacheKey)
  if (cached) return Response.json(cached)
  try {
    const data = await searchMulti(query, language, apiKey, page)
    const results = (data.results || []).filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
    const body = { results, total_results: data.total_results || 0, total_pages: data.total_pages || 0 }
    cacheSet(cacheKey, body, ["tmdb", "search"])
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } })
  } catch {
    return Response.json({ results: [], total_results: 0, total_pages: 0 }, { headers: { "Cache-Control": "no-store" } })
  }
}
