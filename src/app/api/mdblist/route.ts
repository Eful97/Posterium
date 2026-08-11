import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { cacheGet, cacheSet } from "@/lib/cache"
import { MDBLISTS, MDBListEntry } from "@/lib/mdblist"
import { createLogger } from "@/lib/logger"

const log = createLogger("mdblist")

const MDBLISTS_URL: Record<string, string> = {
  mdblistMovie: 'https://api.mdblist.com/lists/snoak/trending-movies',
  mdblistShow: 'https://api.mdblist.com/lists/snoak/trakt-s-trending-shows',
  mdblistAnime: 'https://api.mdblist.com/lists/snoak/trending-anime-shows',
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const imdbId = req.nextUrl.searchParams.get('imdb')
  if (!imdbId) return Response.json({ match: null })

  const cacheKey = `mdblist:${imdbId}`
  const cached = cacheGet<{ key: string; rank: number } | { noMatch: true }>(cacheKey)
  if (cached !== null) {
    if ("noMatch" in cached) return Response.json({ match: null })
    return Response.json({ match: cached })
  }

  const apiKey = req.nextUrl.searchParams.get('api_key') || ""
  if (!apiKey) return Response.json({ match: null })

  try {
    for (const list of MDBLISTS) {
      const url = MDBLISTS_URL[list.key]
      const fullUrl = `${url}/items?apikey=${encodeURIComponent(apiKey)}&limit=20`
      const res = await fetch(fullUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      })
      if (!res.ok) continue
      const body = await res.json()
      const payload = body?.data || body
      interface MdblistRawItem {
  imdb_id?: string
  imdb?: string
  ids?: { imdb?: string }
  title?: string
  year?: number
}

let parsedItems: MdblistRawItem[] = []
      if (Array.isArray(payload)) {
        parsedItems = payload
      } else if (payload?.items) {
        parsedItems = payload.items
      } else if (payload?.shows) {
        parsedItems = payload.shows
      } else if (payload?.movies) {
        parsedItems = payload.movies
      }
      const items: MDBListEntry[] = parsedItems.slice(0, 20).map((item: MdblistRawItem) => ({
        imdb: item.imdb_id || item.imdb || item.ids?.imdb || '',
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
  } catch (e) {
    // Errore di rete: NON cachare il fallimento, ritenta al prossimo accesso.
    log.error("Fetch failed", { error: e instanceof Error ? e.message : String(e) })
    return Response.json({ match: null })
  }
  // No-match: TTL breve — l'item può comparire in classifica a breve.
  cacheSet(cacheKey, { noMatch: true }, ["mdblist"], 60_000)
  return Response.json({ match: null })
}
