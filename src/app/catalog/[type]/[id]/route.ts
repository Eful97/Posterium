import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"
import { getServerDefaults } from "@/lib/server-defaults"
import { POSTER_URL_VERSION } from "@/lib/render-version"
import { getById } from "@/lib/store"
import { buildStremioPosterUrl } from "@/lib/stremio-poster-url"
import { getOriginFromRequest } from "@/lib/poster-public-url"

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

async function posteriumPosterUrl(req: NextRequest, type: "movie" | "series", id: number): Promise<string> {
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
  }).toString()
}

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { type: mediaType, id: rawId } = await params
  const catalogId = rawId.replace(/\.json$/, "")
  const stType = normalizeCatalogType(mediaType)

  const cacheKey = `stremio:catalog:${stType}:${catalogId}:pv${POSTER_URL_VERSION}`
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
      metas = await Promise.all(validResults.map(async (r) => ({
        id: r.d.imdb_id || r.tmdbId.toString(),
        type: stType,
        name: r.d.title || r.d.name || "",
        poster: await posteriumPosterUrl(req, stType, r.tmdbId),
        releaseInfo: (r.d.release_date || r.d.first_air_date || "").slice(0, 4) || undefined,
      })))
    } else if (catalogId.startsWith("posterium-anime")) {
      const key = process.env.MDBLIST_API_KEY
      if (key) {
        const res = await fetch(`https://api.mdblist.com/lists/snoak/trending-anime-shows/items?apikey=${key}`, { signal: AbortSignal.timeout(10000) })
        if (res.ok) {
          const data = await res.json()
          const results = await Promise.all((data || []).slice(0, 20).map(async (item: { tmdb?: number; imdb?: string; title?: string }) => {
            if (!item.tmdb) return null
            const url = `https://api.themoviedb.org/3/tv/${item.tmdb}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
            const r2 = await fetch(url, { signal: AbortSignal.timeout(10000) })
            if (!r2.ok) return null
            const d = await r2.json()
            if (!d?.id) return null
            return { d, tmdbId: item.tmdb, imdb: item.imdb }
          }))
          const validResults = results.filter((r): r is { d: { imdb_id?: string; name?: string; first_air_date?: string }; tmdbId: number; imdb?: string } => r !== null)
          metas = await Promise.all(validResults.map(async (r) => ({
            id: r.d.imdb_id || r.imdb || r.tmdbId.toString(),
            type: "series",
            name: r.d.name || "",
            poster: await posteriumPosterUrl(req, "series", r.tmdbId),
            releaseInfo: (r.d.first_air_date || "").slice(0, 4) || undefined,
          })))
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
          metas = await Promise.all(itemsWithTmdb.map(async (item) => ({
            id: item.tmdbId.toString(),
            type: stType,
            name: item.title,
            poster: await posteriumPosterUrl(req, stType, item.tmdbId),
            releaseInfo: item.releaseDate?.slice(0, 4) || undefined,
          })))
        }
      }
    }

    const body = { metas }
    if (metas.length > 0) cacheSet(cacheKey, body, ["stremio", "catalog"])
    return catalogResponse(body)
  } catch (e) {
    console.error("Catalog error:", e)
    return catalogResponse({ metas: [] })
  }
}
