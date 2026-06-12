import { NextRequest } from "next/server"
import { getJWRankings } from "@/lib/justwatch"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const type = req.nextUrl.searchParams.get("type") as "movie" | "tv" | null
  const id = Number(req.nextUrl.searchParams.get("id"))
  if (!type || !id) return Response.json({ rank: null })
  const cacheKey = `rank:v2:${type}:${id}`
  const cached = cacheGet<{ rank: number | null; period?: string }>(cacheKey)
  if (cached) return Response.json(cached)
  try {
    const rankings = await getJWRankings(type === "movie" ? "MOVIE" : "SHOW", "IT", 100)
    const found = rankings.find((r) => r.tmdbId === id)
    if (found) {
      const body = { rank: found.rank, period: "day" }
      cacheSet(cacheKey, body, ["rank", "justwatch"])
      return Response.json(body, { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } })
    }
  } catch {}
  const body = { rank: null }
  cacheSet(cacheKey, body, ["rank", "justwatch"])
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } })
}
