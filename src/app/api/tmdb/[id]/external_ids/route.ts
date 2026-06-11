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
  const cacheKey = `external_ids:${type}:${id}`
  const cached = cacheGet(cacheKey)
  if (cached) return Response.json(cached)
  const data = await getExternalIds(type as "movie" | "tv", Number(id), apiKey)
  cacheSet(cacheKey, data, ["tmdb", "external_ids"])
  return Response.json(data)
}
