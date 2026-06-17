import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getTop10 } from "@/lib/flixpatrol"

const IMG_BASE = "https://image.tmdb.org/t/p/w342"

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
      .map((e: any) => Number(e?.node?.content?.externalIds?.tmdbId))
      .filter((id: number) => id > 0)
  } catch { return [] }
}

const PLATFORM_SLUGS: Record<string, string> = {
  netflix: "netflix", prime: "amazon-prime", disney: "disney",
  apple: "apple-tv", hbo: "hbo-max", paramount: "paramount-plus",
}

type RouteParams = { type: string; id: string }

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

    if (catalogId.startsWith("posterium-jw")) {
      const ids = await getJustWatchRankings(mediaType === "movie" ? "MOVIE" : "SHOW")
      const apiKey = process.env.TMDB_API_KEY!
      const pathTmdb = mediaType === "movie" ? "/movie" : "/tv"
      for (const id of ids.slice(0, 20)) {
        try {
          const url = `https://api.themoviedb.org/3${pathTmdb}/${id}?api_key=${apiKey}&language=it-IT`
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
          if (!res.ok) continue
          const d = await res.json()
          if (d?.id) {
            metas.push({
              id: d.imdb_id || id.toString(),
              type: mediaType === "series" ? "series" : "movie",
              name: d.title || d.name || "",
              poster: d.poster_path ? `${IMG_BASE}${d.poster_path}` : null,
              releaseInfo: (d.release_date || d.first_air_date || "").slice(0, 4) || undefined,
            })
          }
        } catch {}
      }
    } else if (catalogId.startsWith("posterium-anime")) {
      const key = process.env.MDBLIST_API_KEY
      if (key) {
        try {
          const res = await fetch(`https://api.mdblist.com/lists/snoak/trending-anime-shows/items?apikey=${key}`, { signal: AbortSignal.timeout(10000) })
          if (res.ok) {
            const data = await res.json()
            for (const item of (data || []).slice(0, 20)) {
              const tmdbId = item.tmdb
              if (!tmdbId) continue
              try {
                const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
                const r2 = await fetch(url, { signal: AbortSignal.timeout(10000) })
                if (!r2.ok) continue
                const d = await r2.json()
                if (d?.id) {
                  metas.push({
                    id: d.imdb_id || item.imdb || tmdbId.toString(),
                    type: "series",
                    name: d.name || item.title || "",
                    poster: d.poster_path ? `${IMG_BASE}${d.poster_path}` : null,
                    releaseInfo: (d.first_air_date || "").slice(0, 4) || undefined,
                  })
                }
              } catch {}
            }
          }
        } catch {}
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
          for (const item of items.slice(0, 10)) {
            if (item.tmdbId) {
              metas.push({
                id: item.tmdbId.toString(),
                type: mediaType === "series" ? "series" : "movie",
                name: item.title,
                poster: item.posterPath ? `${IMG_BASE}${item.posterPath}` : null,
                releaseInfo: item.releaseDate?.slice(0, 4) || undefined,
              })
            }
          }
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
