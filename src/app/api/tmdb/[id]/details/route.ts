import crypto from "node:crypto"
import { NextRequest } from "next/server"
import { getDetails, getExternalIds } from "@/lib/tmdb"
import { fetchAggregatedRating } from "@/lib/ratings"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

// Tetto massimo per l'attesa del voto medio TMDB+IMDb (MDBList): se il fetch
// è lento si usa il voto TMDB, coerente con la route poster (stesso knob
// POSTERIUM_RATING_WAIT_MS, stesso default).
const RATING_WAIT_MS = (() => {
  const raw = process.env.POSTERIUM_RATING_WAIT_MS
  const n = raw ? parseInt(raw, 10) : 1500
  return Number.isFinite(n) && n >= 300 && n <= 10000 ? n : 1500
})()

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)
  const { id } = await params
  const type = req.nextUrl.searchParams.get("type") || "movie"
  const language = req.nextUrl.searchParams.get("language") || "it-IT"
  const apiKey = req.nextUrl.searchParams.get("api_key") || undefined
  const mdblistKey = req.nextUrl.searchParams.get("mdblist_key") || undefined
  const mediaType = type === "tv" || type === "series" ? "tv" : "movie"
  const tmdbId = Number(id)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ genres: [], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null })
  }
  // mdblist_key cambia il voto medio (fetchAggregatedRating) → parte del cache key.
  const mdblistHash = mdblistKey ? crypto.createHash("sha1").update(mdblistKey).digest("hex").slice(0, 8) : ""
  const cacheKey = `details:v11:${type}:${tmdbId}:${language}:${mdblistHash || "nomk"}`
  interface Genre { id: number; name: string }
interface Episode { id: number; name: string; air_date: string | null; episode_number: number; season_number: number }

const cached = cacheGet<{ title?: string; name?: string; genres: Genre[]; voteAverage: number; voteCount: number; type?: string; status?: string; release_date?: string; first_air_date?: string; last_air_date?: string; next_episode_to_air?: Episode | null; number_of_seasons?: number; number_of_episodes?: number; networks?: { id: number; name: string; logo_path: string | null; origin_country: string }[]; production_companies?: { id: number; name: string; logo_path: string | null; origin_country: string }[]; imdb_id?: string | null; original_language?: string }>(cacheKey)
  if (cached) return Response.json(cached)
  try {
    const [data, extIds] = await Promise.all([
      getDetails(mediaType, tmdbId, language, apiKey),
      getExternalIds(mediaType, tmdbId, apiKey).catch(() => ({ imdb_id: null })),
    ])
    const rating = extIds.imdb_id
      ? (await Promise.race([
          fetchAggregatedRating(extIds.imdb_id, mdblistKey).catch(() => null),
          new Promise<Awaited<ReturnType<typeof fetchAggregatedRating>>>((resolve) => setTimeout(() => resolve(null), RATING_WAIT_MS)),
        ]))?.average ?? data.vote_average ?? 0
      : data.vote_average ?? 0
    const body = { title: data.title, name: data.name, genres: data.genres, voteAverage: rating, voteCount: data.vote_count, type: data.type, status: data.status, release_date: data.release_date, first_air_date: data.first_air_date, last_air_date: data.last_air_date, next_episode_to_air: data.next_episode_to_air, number_of_seasons: data.number_of_seasons, number_of_episodes: data.number_of_episodes, networks: data.networks, production_companies: data.production_companies, imdb_id: extIds.imdb_id, original_language: data.original_language }
    cacheSet(cacheKey, body, ["tmdb", "details"])
    return Response.json(body)
  } catch {
    return Response.json({ genres: [], voteAverage: 0, voteCount: 0, status: null, type: null, release_date: null, first_air_date: null, last_air_date: null, next_episode_to_air: null, number_of_seasons: null, number_of_episodes: null, title: null, name: null, imdb_id: null })
  }
}
