import { NextRequest } from "next/server"
import { getDetails } from "@/lib/tmdb"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") || "movie"
  const language = req.nextUrl.searchParams.get("language") || "it-IT"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const mediaType = type === "tv" || type === "series" ? "tv" : "movie"
  const cacheKey = `details:v2:${type}:${id}:${language}`
  const cached = cacheGet<{ title?: string; name?: string; genres: any[]; voteAverage: number; voteCount: number; type?: string; status?: string; release_date?: string; last_air_date?: string; next_episode_to_air?: any; number_of_seasons?: number; number_of_episodes?: number }>(cacheKey)
  if (cached) return Response.json(cached)
  try {
    const data = await getDetails(mediaType, Number(id), language, apiKey)
    const body = { title: data.title, name: data.name, genres: data.genres, voteAverage: data.vote_average, voteCount: data.vote_count, type: data.type, status: data.status, release_date: data.release_date, last_air_date: data.last_air_date, next_episode_to_air: data.next_episode_to_air, number_of_seasons: data.number_of_seasons, number_of_episodes: data.number_of_episodes }
    cacheSet(cacheKey, body, ["tmdb", "details"])
    return Response.json(body)
  } catch {
    return Response.json({ genres: [], voteAverage: 0, voteCount: 0 })
  }
}
