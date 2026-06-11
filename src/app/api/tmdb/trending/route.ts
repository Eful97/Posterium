import { NextRequest } from "next/server"
import { getJWRankings } from "@/lib/justwatch"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_KEY = process.env.TMDB_API_KEY!

async function tmdbFetch(path: string, apiKey?: string) {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set("api_key", apiKey || TMDB_KEY)
  url.searchParams.set("language", "it-IT")
  const res = await fetch(url.toString())
  if (!res.ok) return null
  return res.json()
}

async function tmdbFetchImages(mediaType: string, id: number, apiKey?: string) {
  const res = await fetch(`${TMDB_BASE}/${mediaType}/${id}/images?api_key=${apiKey || TMDB_KEY}&include_image_language=it,en,null`)
  if (!res.ok) return null
  return res.json()
}

interface TrendingItem {
  id: number
  media_type: "movie" | "tv"
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  rank: number
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const country = req.nextUrl.searchParams.get("country") || "IT"
  const cacheKey = `trending:${country}`
  const cached = cacheGet<{ movies: any[]; tv: any[] }>(cacheKey)
  if (cached) return Response.json(cached)
  try {
    const [movieRanks, tvRanks] = await Promise.all([
      getJWRankings("MOVIE", country).catch(() => [] as { tmdbId: number; rank: number }[]),
      getJWRankings("SHOW", country).catch(() => [] as { tmdbId: number; rank: number }[]),
    ])
    const movieResults: TrendingItem[] = []
    const tvResults: TrendingItem[] = []
    const enrichItem = async (tmdbId: number, mediaType: string) => {
      const [details, images] = await Promise.all([
        tmdbFetch(`/${mediaType}/${tmdbId}`, apiKey),
        tmdbFetchImages(mediaType, tmdbId, apiKey),
      ])
      if (!details) return null
      const poster = details.poster_path
        ? details.poster_path
        : images?.posters?.[0]?.file_path || null
      return {
        id: tmdbId,
        media_type: mediaType as "movie" | "tv",
        title: details.title,
        name: details.name,
        poster_path: poster,
        release_date: details.release_date,
        first_air_date: details.first_air_date,
      }
    }
    const movieBatches = movieRanks.map(async (r, idx) => {
      const item = await enrichItem(r.tmdbId, "movie")
      if (item) movieResults.push({ ...item, rank: r.rank })
    })
    const tvBatches = tvRanks.map(async (r, idx) => {
      const item = await enrichItem(r.tmdbId, "tv")
      if (item) tvResults.push({ ...item, rank: r.rank })
    })
    await Promise.all([...movieBatches, ...tvBatches])
    movieResults.sort((a, b) => a.rank - b.rank)
    tvResults.sort((a, b) => a.rank - b.rank)
    const body = { movies: movieResults, tv: tvResults }
    cacheSet(cacheKey, body, ["tmdb", "trending", country])
    return Response.json(body)
  } catch (err) {
    console.error("Trending error:", err)
    return Response.json({ movies: [], tv: [] })
  }
}
