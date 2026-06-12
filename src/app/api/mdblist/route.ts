import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { MDBLISTS, MDBListEntry } from "@/lib/mdblist"

const MDBLISTS_URL: Record<string, string> = {
  mdblistMovie: 'https://mdblist.com/api/lists/snoak/trending-movies',
  mdblistShow: 'https://mdblist.com/api/lists/snoak/trakt-s-trending-shows',
  mdblistAnime: 'https://mdblist.com/api/lists/snoak/trending-anime-shows',
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const imdbId = req.nextUrl.searchParams.get('imdb')
  if (!imdbId) return Response.json({ match: null })

  const cacheKey = `mdblist:${imdbId}`
  const cached = cacheGet<{ key: string; rank: number } | null>(cacheKey)
  if (cached !== undefined) return Response.json({ match: cached })

  try {
    for (const list of MDBLISTS) {
      const url = MDBLISTS_URL[list.key]
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const data = await res.json()
      const items: MDBListEntry[] = (data.items || data || []).slice(0, 20).map((item: any) => ({
        imdb: item.imdb_id || item.imdb || '',
        title: item.title || '',
        year: item.year || 0,
      }))
      const idx = items.findIndex(e => e.imdb === imdbId)
      if (idx >= 0 && idx < 20) {
        const match = { key: list.key, rank: idx + 1 }
        cacheSet(cacheKey, match, ["mdblist"])
        return Response.json({ match })
      }
    }
  } catch {}
  cacheSet(cacheKey, null, ["mdblist"])
  return Response.json({ match: null })
}
