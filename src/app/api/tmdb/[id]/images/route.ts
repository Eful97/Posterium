import { NextRequest } from "next/server"
import { getImages } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

type RouteParams = { id: string }

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") || "movie"
  const languages = req.nextUrl.searchParams.get("languages") || "en,null,it"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const cacheKey = `images:${type}:${id}:${languages}`
  const cached = cacheGet(cacheKey)
  if (cached) return Response.json(cached)
  const data = await getImages(type as "movie" | "tv", Number(id), languages, apiKey).catch(() => ({ posters: [], logos: [], backdrops: [] }))
  cacheSet(cacheKey, data, ["tmdb", "images"])
  return Response.json(data)
}
