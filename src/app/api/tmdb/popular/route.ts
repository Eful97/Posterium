import { NextRequest } from "next/server"
import { getPopularMovies, getPopularTV, type TMDBMediaResult } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const cacheKey = `popular:${req.nextUrl.searchParams.toString()}`
  const cached = cacheGet<{ results: any[]; page: number; totalPages: number }>(cacheKey)
  if (cached) return Response.json(cached)
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10)
  const language = req.nextUrl.searchParams.get("language") || "it-IT"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const [movies, tv] = await Promise.all([getPopularMovies(page, language, apiKey), getPopularTV(page, language, apiKey)])
  const movieResults = movies.results
    .filter((r: TMDBMediaResult) => r.poster_path)
    .map((r: TMDBMediaResult) => ({ ...r, media_type: "movie" as const }))
  const tvResults = tv.results
    .filter((r: TMDBMediaResult) => r.poster_path)
    .map((r: TMDBMediaResult) => ({ ...r, media_type: "tv" as const }))
  const results: Array<TMDBMediaResult & { media_type: "movie" | "tv" }> = []
  const max = Math.max(movieResults.length, tvResults.length)
  for (let i = 0; i < max; i++) {
    if (i < movieResults.length) results.push(movieResults[i])
    if (i < tvResults.length) results.push(tvResults[i])
  }
  const totalPages = Math.min(movies.total_pages, tv.total_pages)
  const body = { results: results.slice(0, 24), page, totalPages }
  cacheSet(cacheKey, body, ["tmdb", "popular"])
  return Response.json(body)
}
