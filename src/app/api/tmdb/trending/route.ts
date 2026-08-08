import { NextRequest } from "next/server"
import { getJWRankings } from "@/lib/justwatch"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { createLogger } from "@/lib/logger"
import { jsonGzip } from "@/lib/json-response"

const log = createLogger("trending")

const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_KEY = process.env.TMDB_API_KEY || ""

/** Codici paese supportati da JustWatch (set chiuso — evita cache-miss illimitati). */
const JW_COUNTRIES = new Set([
  "AE", "AR", "AT", "AU", "BE", "BG", "BR", "CA", "CH", "CL", "CO", "CZ", "DE", "DK",
  "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GR", "HK", "HR", "HU", "ID", "IE", "IL",
  "IN", "IT", "JP", "KR", "LT", "LV", "MX", "MY", "NL", "NO", "NZ", "PE", "PH", "PL",
  "PT", "RO", "RS", "RU", "SE", "SG", "SI", "SK", "TH", "TR", "UA", "US", "VE", "ZA",
])

async function tmdbFetch(path: string, apiKey?: string) {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set("api_key", apiKey || TMDB_KEY)
  url.searchParams.set("language", "it-IT")
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) })
  if (!res.ok) return null
  return res.json()
}

async function tmdbFetchImages(mediaType: string, id: number, apiKey?: string) {
  const res = await fetch(`${TMDB_BASE}/${mediaType}/${id}/images?api_key=${apiKey || TMDB_KEY}&include_image_language=it,en,null`)
  if (!res.ok) return null
  return res.json()
}

/** Esegue `fn` su ogni item con al massimo `limit` chiamate concorrenti. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
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
  const rawCountry = req.nextUrl.searchParams.get("country") || "IT"
  const country = JW_COUNTRIES.has(rawCountry.toUpperCase()) ? rawCountry.toUpperCase() : "IT"
  const cacheKey = `trending:${country}`
  const acceptEncoding = req.headers.get("accept-encoding")
  const cached = cacheGet<{ movies: TrendingItem[]; tv: TrendingItem[] }>(cacheKey)
  if (cached) return jsonGzip(cached, 200, undefined, acceptEncoding)
  try {
    // D6: traccia gli errori upstream — una risposta degradata NON va cachata,
    // altrimenti un outage (JW/TMDB) si congela nel cache fino al refresh.
    let degraded = false
    const [movieRanks, tvRanks] = await Promise.all([
      getJWRankings("MOVIE", country).catch((e) => {
        degraded = true
        log.warn("JW movie rankings failed", { error: e instanceof Error ? e.message : String(e), country })
        return [] as { tmdbId: number; rank: number }[]
      }),
      getJWRankings("SHOW", country).catch((e) => {
        degraded = true
        log.warn("JW show rankings failed", { error: e instanceof Error ? e.message : String(e), country })
        return [] as { tmdbId: number; rank: number }[]
      }),
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
    // Concurrency limiter: ogni enrichItem fa 2 fetch TMDB; senza cap l'esplosione
    // parallela satura il rate limit TMDB. Pool di 4 alla volta.
    const CONCURRENCY = 4
    const movieBatches = await mapLimit(movieRanks, CONCURRENCY, async (r) => {
      const item = await enrichItem(r.tmdbId, "movie")
      if (item) movieResults.push({ ...item, rank: r.rank })
    })
    const tvBatches = await mapLimit(tvRanks, CONCURRENCY, async (r) => {
      const item = await enrichItem(r.tmdbId, "tv")
      if (item) tvResults.push({ ...item, rank: r.rank })
    })
    await Promise.all([movieBatches, tvBatches])
    movieResults.sort((a, b) => a.rank - b.rank)
    tvResults.sort((a, b) => a.rank - b.rank)
    const body = { movies: movieResults, tv: tvResults }
    // Se c'erano rank ma non è stato arricchito nulla → probabile outage TMDB.
    const emptyEnrichment = movieResults.length === 0 && tvResults.length === 0 && (movieRanks.length > 0 || tvRanks.length > 0)
    if (degraded || emptyEnrichment) {
      log.warn("Trending degraded — response not cached", { country, movies: movieResults.length, tv: tvResults.length })
      return jsonGzip(body, 200, { "Cache-Control": "no-store" }, acceptEncoding)
    }
    cacheSet(cacheKey, body, ["tmdb", "trending", country])
    return jsonGzip(body, 200, { "Cache-Control": "public, max-age=300, s-maxage=1800" }, acceptEncoding)
  } catch (err) {
    log.error("Trending fetch failed", { error: err instanceof Error ? err.message : String(err) })
    return jsonGzip({ movies: [], tv: [] }, 200, { "Cache-Control": "no-store" }, acceptEncoding)
  }
}
