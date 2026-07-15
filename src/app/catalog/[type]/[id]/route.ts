import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"
import { buildPosterPublicUrl } from "@/lib/poster-public-url"
import { buildStremioPosterSearchParams } from "@/lib/stremio-poster-params"
import { getServerDefaults } from "@/lib/server-defaults"

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

function posteriumPosterUrl(req: NextRequest, type: "movie" | "series", id: number): string {
  const defaults = getServerDefaults()
  const url = buildPosterPublicUrl(`/api/poster/${type}/${id}`, {
    origin: req.nextUrl.origin,
  })

  const params = buildStremioPosterSearchParams({
    apiKey: process.env.TMDB_API_KEY,
    lang: "it",
    globalBadges: defaults.globalBadges,
    rankingBadges: defaults.rankingBadges,
    badgeStyle: defaults.badgeStyle,
    rankingBadgeStyle: defaults.rankingBadgeStyle,
    gradientHeight: defaults.gradientHeight,
    blurIntensity: defaults.blurIntensity,
    blurFade: defaults.blurFade,
    blurDarkness: defaults.blurDarkness,
    blurEnabled: defaults.blurEnabled,
  })

  params.forEach((value, key) => url.searchParams.set(key, value))
  return url.toString()
}

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { type: mediaType, id: rawId } = await params
  const catalogId = rawId.replace(/\.json$/, "")

  const cacheKey = `stremio:catalog:${mediaType}:${catalogId}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return Response.json(cached)

  try {
    let metas: StremioMeta[] = []
    const stType = mediaType === "series" ? "series" : "movie"

    if (catalogId.startsWith("posterium-jw")) {
      const ids = await getJustWatchRankings(mediaType === "movie" ? "MOVIE" : "SHOW")
      const apiKey = process.env.TMDB_API_KEY!
      const pathTmdb = mediaType === "movie" ? "/movie" : "/tv"
      const results = await Promise.all(ids.slice(0, 20).map(async (id) => {
        const url = `https://api.themoviedb.org/3${pathTmdb}/${id}?api_key=${apiKey}&language=it-IT`
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) return null
        const d = await res.json()
        if (!d?.id) return null
        return { d, tmdbId: id }
      }))
      metas = results.filter(Boolean).map((r) => ({
        id: r!.d.imdb_id || r!.tmdbId.toString(),
        type: stType,
        name: r!.d.title || r!.d.name || "",
        poster: r!.d.poster_path ? posteriumPosterUrl(req, stType, r!.tmdbId) : null,
        releaseInfo: (r!.d.release_date || r!.d.first_air_date || "").slice(0, 4) || undefined,
      }))
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
          metas = results.filter(Boolean).map((r) => ({
            id: r!.d.imdb_id || r!.imdb || r!.tmdbId.toString(),
            type: "series",
            name: r!.d.name || "",
            poster: r!.d.poster_path ? posteriumPosterUrl(req, "series", r!.tmdbId) : null,
            releaseInfo: (r!.d.first_air_date || "").slice(0, 4) || undefined,
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
          const items = mediaType === "movie" ? data.movies : data.tv
          metas = items.slice(0, 10).filter((i) => i.tmdbId).map((item) => ({
            id: item.tmdbId!.toString(),
            type: stType,
            name: item.title,
            poster: item.posterPath ? posteriumPosterUrl(req, stType, item.tmdbId!) : null,
            releaseInfo: item.releaseDate?.slice(0, 4) || undefined,
          }))
        }
      }
    }

    const body = { metas }
    if (metas.length > 0) cacheSet(cacheKey, body, ["stremio", "catalog"])
    return Response.json(body)
  } catch (e) {
    console.error("Catalog error:", e)
    return Response.json({ metas: [] })
  }
}
