import { NextRequest } from "next/server"
import { getExternalIds } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") || "movie"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  // Fix M9: validazione esplicita (prima `type` libero finiva interpolato
  // nell'URL upstream e Number(id) poteva essere NaN → 500 generico).
  if (type !== "movie" && type !== "tv") {
    return Response.json({ error: "Invalid type: must be 'movie' or 'tv'" }, { status: 400 })
  }
  const tmdbId = Number(id)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "Invalid id: must be a positive integer" }, { status: 400 })
  }
  const cacheKey = `external_ids:${type}:${id}`
  const cached = cacheGet(cacheKey)
  if (cached) return Response.json(cached)
  // Fix M9: try/catch come la route images — un errore upstream (getExternalIds
  // lancia su !res.ok) risponde 502 invece di un 500 generico, e NON viene
  // messo in cache.
  let data: Awaited<ReturnType<typeof getExternalIds>>
  try {
    data = await getExternalIds(type, tmdbId, apiKey)
  } catch {
    return Response.json({ error: "TMDB external_ids unavailable" }, { status: 502 })
  }
  cacheSet(cacheKey, data, ["tmdb", "external_ids"])
  return Response.json(data)
}
