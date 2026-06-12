import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const cacheKey = "mdblist:anime:top10"
  const cached = cacheGet<any[]>(cacheKey)
  if (cached) return Response.json(cached)

  const mdblistKey = req.nextUrl.searchParams.get("mdblist_key")
  const tmdbKey = req.nextUrl.searchParams.get("api_key")
  if (!mdblistKey || !tmdbKey) return Response.json([])

  try {
    const url = `https://mdblist.com/api/lists/snoak/trending-anime-shows?api_key=${mdblistKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return Response.json([])
    const data = await res.json()
    const items = (data.items || data || []).slice(0, 10)

    const results = await Promise.all(items.map(async (item: any, idx: number) => {
      const imdbId = item.imdb_id || item.imdb || ''
      if (!imdbId) return null
      try {
        const tmdbRes = await fetch(
          `https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id&api_key=${tmdbKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!tmdbRes.ok) return null
        const tmdbData = await tmdbRes.json()
        const found = tmdbData.tv_results?.[0] || tmdbData.movie_results?.[0]
        if (!found) return null
        return {
          id: found.id,
          title: found.name || found.title || item.title || '',
          poster_path: found.poster_path || item.poster || '',
          rank: idx + 1,
          media_type: found.media_type || 'tv',
        }
      } catch { return null }
    }))

    const filtered = results.filter(Boolean)
    cacheSet(cacheKey, filtered, ["mdblist"])
    return Response.json(filtered)
  } catch { return Response.json([]) }
}
