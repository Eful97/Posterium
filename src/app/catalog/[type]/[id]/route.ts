import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { getOriginFromRequest } from "@/lib/poster-public-url"
import { getExternalIds } from "@/lib/tmdb"
import { createLogger } from "@/lib/logger"

const log = createLogger("catalog")

interface StremioMeta {
  id: string
  type: string
  name: string
  poster: string | null
  releaseInfo?: string
}

async function getJustWatchRankings(type: "MOVIE" | "SHOW"): Promise<number[]> {
  const query = `query GetStreamingChartInfo($country: Country!, $language: Language!, $filter: StreamingChartsFilter, $first: Int!) {
    streamingCharts(country: $country, filter: $filter, first: $first) {
      edges {
        streamingChartInfo { rank }
        node { ... on MovieOrShowOrSeason { content(country: $country, language: $language) { externalIds { tmdbId } } } }
      }
    }
  }`
  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Platform": "WEB" },
      body: JSON.stringify({
        operationName: "GetStreamingChartInfo",
        query,
        variables: { country: "IT", language: "it-IT", filter: { objectType: type, category: "DAILY_POPULARITY_SAME_CONTENT_TYPE" }, first: 20 },
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json?.data?.streamingCharts?.edges || [])
      .map((e: { node?: { content?: { externalIds?: { tmdbId?: number | string } } } }) => Number(e?.node?.content?.externalIds?.tmdbId))
      .filter((id: number) => id > 0)
  } catch { return [] }
}

const PLATFORM_SLUGS: Record<string, string> = {
  netflix: "netflix", prime: "amazon-prime", disney: "disney",
  apple: "apple-tv", hbo: "hbo-max", paramount: "paramount-plus",
}

type RouteParams = { type: string; id: string }
type StremioCatalogType = "movie" | "series"

function catalogResponse(body: { metas: StremioMeta[] }): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

function normalizeCatalogType(type: string): StremioCatalogType {
  return type === "movie" ? "movie" : "series"
}

async function posteriumPosterUrl(req: NextRequest, type: "movie" | "series", id: number, configParam?: string | null, userParam?: string | null): Promise<string> {
  const defaults = getServerDefaults()
  const mapping = await getById(type === "series" ? "tv" : "movie", id)
  return buildStremioPosterUrl({
    origin: getOriginFromRequest(req),
    type,
    id,
    defaults,
    mapping,
    apiKey: process.env.TMDB_API_KEY,
    lang: "it",
    config: configParam || undefined,
    user: userParam || undefined,
  }).toString()
}

/** TMDB /tv/{id} non include imdb_id — serve chiamata extra a external_ids */
async function resolveImdbId(mediaType: "movie" | "tv", tmdbId: number): Promise<string | null> {
  if (mediaType === "movie") return null // /movie/{id} già include imdb_id
  return getExternalIds("tv", tmdbId).then(r => r.imdb_id ?? null).catch(() => null)
}

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { type: mediaType, id: rawId } = await params
  const catalogId = rawId.replace(/\.json$/, "")
  const stType = normalizeCatalogType(mediaType)
  const configParam = req.nextUrl.searchParams.get("config") || req.nextUrl.searchParams.get("c") || undefined
  const userParam = req.nextUrl.searchParams.get("u") || req.nextUrl.searchParams.get("user") || undefined

  const cacheKey = `stremio:catalog:${stType}:${catalogId}:pv${POSTER_URL_VERSION}${userParam ? `:u${userParam}` : ""}${configParam ? `:cfg${configParam}` : ""}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return catalogResponse(cached)

  try {
    let metas: StremioMeta[] = []

    if (catalogId.startsWith("posterium-jw")) {
      const ids = await getJustWatchRankings(stType === "movie" ? "MOVIE" : "SHOW")
      const apiKey = process.env.TMDB_API_KEY!
      const pathTmdb = stType === "movie" ? "/movie" : "/tv"
      const results = await Promise.all(ids.slice(0, 20).map(async (id) => {
        const url = `https://api.themoviedb.org/3${pathTmdb}/${id}?api_key=${apiKey}&language=it-IT`
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) return null
        const d = await res.json()
        if (!d?.id) return null
        return { d, tmdbId: id }
      }))
      const validResults = results.filter((r): r is { d: { imdb_id?: string; title?: string; name?: string; release_date?: string; first_air_date?: string }; tmdbId: number } => r !== null)
      metas = await Promise.all(validResults.map(async (r) => {
        const imdbId = r.d.imdb_id || (stType === "series" ? await resolveImdbId("tv", r.tmdbId) : null)
        return {
          id: imdbId || r.tmdbId.toString(),
          type: stType,
          name: r.d.title || r.d.name || "",
          poster: await posteriumPosterUrl(req, stType, r.tmdbId, configParam, userParam),
          releaseInfo: (r.d.release_date || r.d.first_air_date || "").slice(0, 4) || undefined,
        }
      }))
    } else if (catalogId.startsWith("posterium-anime")) {
      const key = process.env.MDBLIST_API_KEY
      if (key) {
        const res = await fetch(`https://api.mdblist.com/lists/snoak/trending-anime-shows/items?apikey=${key}`, { signal: AbortSignal.timeout(10000) })
        if (res.ok) {
          const body = await res.json()
          const payload = body?.data || body
          const rawItems = payload?.items || payload?.shows || payload?.movies || (Array.isArray(payload) ? payload : [])
          const items = rawItems.slice(0, 20)
          const results = await Promise.all(items.map(async (item: { tmdb?: number; tmdb_id?: number; imdb?: string; imdb_id?: string; title?: string; ids?: { tmdb?: number } }) => {
            const tmdbId = item.tmdb_id ?? item.tmdb ?? item.ids?.tmdb
            const imdbId = item.imdb_id || item.imdb
            if (!tmdbId) return null
            const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
            const r2 = await fetch(url, { signal: AbortSignal.timeout(10000) })
            if (!r2.ok) return null
            const d = await r2.json()
            if (!d?.id) return null
            return { d, tmdbId, imdb: imdbId }
          }))
          const validResults = results.filter((r): r is { d: { imdb_id?: string; name?: string; first_air_date?: string }; tmdbId: number; imdb?: string } => r !== null)
          metas = await Promise.all(validResults.map(async (r) => {
            const imdbId = r.d.imdb_id || r.imdb || await resolveImdbId("tv", r.tmdbId)
            return {
              id: imdbId || r.tmdbId.toString(),
              type: "series",
              name: r.d.name || "",
              poster: await posteriumPosterUrl(req, "series", r.tmdbId, configParam, userParam),
              releaseInfo: (r.d.first_air_date || "").slice(0, 4) || undefined,
            }
          }))
        }
      }
    } else {
      let slug = ""
      for (const [k, v] of Object.entries(PLATFORM_SLUGS)) {
        if (catalogId.includes(k)) { slug = v; break }
      }
      if (slug) {
        const apiKey = process.env.TMDB_API_KEY
        const data = apiKey ? await getTop10(slug, "italy", apiKey).catch(() => null) : null
        if (data) {
          const items = stType === "movie" ? data.movies : data.tv
          const itemsWithTmdb = items.slice(0, 10).flatMap((item) => (
            item.tmdbId ? [{ ...item, tmdbId: item.tmdbId }] : []
          ))
          metas = await Promise.all(itemsWithTmdb.map(async (item) => {
            const imdbId = stType === "series" ? await resolveImdbId("tv", item.tmdbId) : null
            return {
              id: imdbId || item.tmdbId.toString(),
              type: stType,
              name: item.title,
              poster: await posteriumPosterUrl(req, stType, item.tmdbId, configParam),
              releaseInfo: item.releaseDate?.slice(0, 4) || undefined,
            }
          }))
        }
      }
    }

    const body = { metas }
    if (metas.length > 0) cacheSet(cacheKey, body, ["stremio", "catalog"])
    return catalogResponse(body)
  } catch (e) {
    log.error("Catalog error", { error: e instanceof Error ? e.message : String(e) })
    return catalogResponse({ metas: [] })
  }
}
