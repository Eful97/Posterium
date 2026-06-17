import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getRawCatalog } from "@/lib/flixpatrol"

const IMG_BASE = "https://image.tmdb.org/t/p/w342"
const TMDB_BASE = "https://api.themoviedb.org/3"

interface StremioMeta {
  id: string
  type: string
  name: string
  poster: string | null
  releaseInfo?: string
}

type RouteParams = { type: string; id: string }

async function fetchTMDB(path: string, apiKey: string) {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  return res.json()
}

async function getJustWatchRankings(type: "MOVIE" | "SHOW"): Promise<number[]> {
  const query = `query GetStreamingChartInfo($country: Country!, $objectType: ObjectType!, $category: PopularityCategory!, $page: Int) {
    streamingChartInfo(country: $country, objectType: $objectType, category: $category, page: $page) {
      edges { node { content { tmdbId } } }
    }
  }`
  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { country: "IT", objectType: type, category: "DAILY_POPULARITY_SAME_CONTENT_TYPE", page: 0 } }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return (json?.data?.streamingChartInfo?.edges || []).map((e: any) => e.node.content.tmdbId).filter(Boolean)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { type: mediaType, id: rawId } = await params
  const catalogId = rawId.replace(/\.json$/, "")
  const apiKey = process.env.TMDB_API_KEY!
  const cacheKey = `stremio:catalog:${mediaType}:${catalogId}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return Response.json(cached)

  try {
    let tmdbIds: number[] = []

    if (catalogId.startsWith("posterium-jw")) {
      const jwType = mediaType === "movie" ? "MOVIE" : "SHOW"
      tmdbIds = await getJustWatchRankings(jwType)
    } else if (catalogId.startsWith("posterium-anime")) {
      const mdblistKey = process.env.MDBLIST_API_KEY
      if (mdblistKey) {
        try {
          const res = await fetch(`https://api.mdblist.com/lists/snoak/trending-anime-shows/items?apikey=${mdblistKey}`, { signal: AbortSignal.timeout(10000) })
          if (res.ok) {
            const data = await res.json()
            tmdbIds = (data || []).map((i: any) => i.tmdb || i.id).filter(Boolean).map(Number)
          }
        } catch {}
      }
    } else {
      const slugMap: Record<string, string> = { netflix: "Netflix", prime: "Amazon Prime", disney: "Disney+", apple: "Apple TV", hbo: "HBO Max", paramount: "Paramount+" }
      let platformName = ""
      for (const [k, v] of Object.entries(slugMap)) {
        if (catalogId.includes(k)) { platformName = v; break }
      }
      if (platformName) {
        const catalog = getRawCatalog()
        const category = mediaType === "movie" ? "movies" : "tv shows"
        const chart = catalog?.charts?.find((c) => c.platform === platformName && c.category === category)
        tmdbIds = (chart?.entries || []).map((e) => e.tmdb?.id).filter(Boolean) as number[]
      }
    }

    const metas: StremioMeta[] = []
    for (const id of tmdbIds.slice(0, 20)) {
      try {
        const detail = await fetchTMDB(`/${mediaType}/${id}?language=it-IT`, apiKey)
        if (detail?.id) {
          metas.push({
            id: detail.imdb_id || id.toString(),
            type: mediaType === "series" ? "series" : "movie",
            name: detail.title || detail.name || "",
            poster: detail.poster_path ? `${IMG_BASE}${detail.poster_path}` : null,
            releaseInfo: (detail.release_date || detail.first_air_date || "").slice(0, 4) || undefined,
          })
        }
      } catch {}
    }

    const body = { metas }
    if (metas.length > 0) cacheSet(cacheKey, body, ["stremio", "catalog"])
    return Response.json(body)
  } catch {
    return Response.json({ metas: [] })
  }
}
