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

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const apiKey = process.env.TMDB_API_KEY!
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set("api_key", apiKey)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return null
  return res.json()
}

async function getJustWatchRankings(type: "MOVIE" | "SHOW"): Promise<number[]> {
  const query = `query($country:Country!,$objectType:ObjectType!,$category:PopularityCategory!){streamingChartInfo(country:$country,objectType:$objectType,category:$category){edges{node{content{tmdbId}}}}}`
  try {
    const res = await fetch("https://apis.justwatch.com/graphql", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { country: "IT", objectType: type, category: "DAILY_POPULARITY_SAME_CONTENT_TYPE" } }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json?.data?.streamingChartInfo?.edges?.map((e: any) => e.node.content.tmdbId).filter(Boolean) || []
  } catch { return [] }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rl = rateLimit(rateLimitKey(req), "catalog")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const { path } = await params
  const mediaType = path[0] === "series" ? "series" : "movie"
  const rawId = path[path.length - 1] || ""
  const catalogId = rawId.replace(/\.json$/, "")

  const cacheKey = `stremio:catalog:${mediaType}:${catalogId}`
  const cached = cacheGet<{ metas: StremioMeta[] }>(cacheKey)
  if (cached) return Response.json(cached)

  try {
    let tmdbIds: number[] = []

    if (catalogId.startsWith("posterium-jw")) {
      tmdbIds = await getJustWatchRankings(mediaType === "movie" ? "MOVIE" : "SHOW")
    } else if (catalogId.startsWith("posterium-anime")) {
      const key = process.env.MDBLIST_API_KEY
      if (key) {
        const res = await fetch(`https://api.mdblist.com/lists/snoak/trending-anime-shows/items?apikey=${key}`, { signal: AbortSignal.timeout(10000) })
        if (res.ok) tmdbIds = ((await res.json()) || []).map((i: any) => i.tmdb).filter(Boolean).map(Number)
      }
    } else {
      const slugMap: Record<string, string> = { netflix: "Netflix", prime: "Amazon Prime", disney: "Disney+", apple: "Apple TV", hbo: "HBO Max", paramount: "Paramount+" }
      let platformName = ""
      for (const [k, v] of Object.entries(slugMap)) { if (catalogId.includes(k)) { platformName = v; break } }
      if (platformName) {
        const catalog = getRawCatalog()
        const cat = mediaType === "movie" ? "movies" : "tv shows"
        const chart = catalog?.charts?.find((c) => c.platform === platformName && c.category === cat)
        tmdbIds = (chart?.entries || []).map((e) => e.tmdb?.id).filter((id): id is number => id != null)
      }
    }

    const metas: StremioMeta[] = []
    for (const id of tmdbIds.slice(0, 20)) {
      const pathTmdb = mediaType === "series" ? "/tv" : "/movie"
      const detail = await tmdbFetch(`${pathTmdb}/${id}`, { language: "it-IT" })
      if (detail?.id) {
        metas.push({
          id: detail.imdb_id || id.toString(),
          type: mediaType === "series" ? "series" : "movie",
          name: detail.title || detail.name || "",
          poster: detail.poster_path ? `${IMG_BASE}${detail.poster_path}` : null,
          releaseInfo: (detail.release_date || detail.first_air_date || "").slice(0, 4) || undefined,
        })
      }
    }

    const body = { metas }
    if (metas.length > 0) cacheSet(cacheKey, body, ["stremio", "catalog"])
    return Response.json(body)
  } catch {
    return Response.json({ metas: [] })
  }
}
