import { NextRequest } from "next/server"
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit"
import { fetchCustomMDBList } from "@/lib/mdblist"
import { getDetails, resolveRequestApiKey, tmdbFindByImdb } from "@/lib/tmdb"

export async function GET(req: NextRequest) {
  const rl = rateLimit(rateLimitKey(req), "tmdb")
  if (!rl.ok) return rateLimitResponse(rl.retAfter)

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return Response.json({ items: [] })

  const apiKey = resolveRequestApiKey(req)
  const mdblistKey = req.nextUrl.searchParams.get("mdblist_key") || process.env.POSTERIUM_MDBLIST_KEY || undefined

  try {
    const rawItems = await fetchCustomMDBList(url, mdblistKey, 20)
    const items = await Promise.all(
      rawItems.map(async (it) => {
        let tmdbId = Number(it.tmdb)
        const mediaType = (it.mediatype === "show" || it.mediatype === "tv" || it.mediatype === "anime") ? "tv" : "movie"
        if (!tmdbId && it.imdb && apiKey) {
          tmdbId = (await tmdbFindByImdb(it.imdb, mediaType, apiKey)) || 0
        }
        let posterPath: string | null = null
        if (tmdbId && apiKey) {
          try {
            const d = await getDetails(mediaType, tmdbId, "it-IT", apiKey)
            posterPath = d?.poster_path || null
          } catch {
            posterPath = null
          }
        }
        return {
          id: tmdbId || it.imdb || String(Math.random()),
          tmdbId: tmdbId || undefined,
          media_type: mediaType,
          title: it.title,
          name: it.title,
          poster_path: posterPath,
          year: it.year,
        }
      })
    )
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
